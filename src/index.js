import { ADDRESSES, RouterABI, SUBGRAPH_URL } from './constants';
import { subgraphRequest, multicall, lazyLoad } from './utils';
/**
 *
 *
 * @class Revest
 */
class Revest {
  constructor(divId) {
    this._divId = divId;
    this.observer;
  }
  /**
   * Creating embed for each FNFT and append all of them in the div provided in the constructur
   *
   *
   * @param {object} data
   * @memberof Revest
   * @returns promise
   */
  renderAllFNFTs = async (data) => {
    try {
      this.observer = await lazyLoad();
      return data.reduce((promises, fnft) => {
        return promises.then(() => {
          return fetch(fnft.url)
            .then((response) => response.json())
            .then((data) => {
              return fetch(data.animation_url)
                .then((response) => response.text())
                .then((_data, index) => {
                  const div = document.createElement('div');
                  const iframe = document.createElement('embed');
                  const blob = new Blob([_data], { type: 'text/html' });
                  div.className = 'card';
                  iframe.frameborder = 0;
                  iframe.className = 'lazyload';
                  iframe.width = '300';
                  iframe.height = '460';
                  iframe.style.width = '300';
                  iframe.id = 'fnft_' + fnft.id;
                  iframe.style.height = '460';
                  iframe.wmode = 'transparent';
                  iframe.dataset.src = window.URL.createObjectURL(blob);
                  div.appendChild(iframe);
                  document.getElementById(this._divId).appendChild(div);
                  this.observer.observe(div);
                  return Promise.resolve(index + 1);
                });
            });
        });
      }, Promise.resolve(1));
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * Get all FNFT's that belongs to specific wallet
   *
   * @param {string} user
   * @param {object} provider
   * @param {boolean} _worker
   * @return {object}
   */
  getAllFNFTsForUser = async (user, provider, _worker) => {
    let net = await provider.getNetwork();
    let chainId = net.chainId;
    const address = [user];
    const revestRouter = new ethers.Contract(ADDRESSES[chainId].ROUTER, RouterABI.abi, provider);
    const FNFT_HANDLER = await revestRouter.getRevestFNFT();

    let userFNFTs = [];

    const eip1155OwnersParams = {
      accounts: {
        __args: {
          where: {
            id_in: address.map((a) => a.toLowerCase()),
          },
        },
        id: true,
        balances: {
          value: true,
          token: {
            registry: {
              id: true,
            },
            identifier: true,
          },
        },
      },
    };
    let response = await subgraphRequest(SUBGRAPH_URL[chainId], eip1155OwnersParams);
    response.accounts[0].balances.forEach((balance) => {
      if (balance.token.registry.id.toLowerCase() === FNFT_HANDLER.toLowerCase() && balance.value != '0') {
        userFNFTs.push(Number(balance.token.identifier));
      }
    });
    if (_worker) {
      return userFNFTs;
    }

    const fnfts = await (
      await fetch(
        'https://api.revest.finance/metadata?chainId=' + chainId + '&id=' + userFNFTs.sort((a, b) => b - a).join(','),
        { mode: 'cors' }
      )
    ).json();

    return fnfts;
  };

  /**
   * Get FNFT's for specific wallet and contract with URI
   *
   * @param {string} user
   * @param {string} contractAddress
   * @param {object} provider
   * @return {object}
   */
  getFNFTsForUserAndContractWithURI = async (user, contractAddress, provider) => {
    try {
      const fnftHandlerABI = ['function uri(uint fnftId) external view returns (string memory)'];

      let net = await provider.getNetwork();
      let chainId = net.chainId;
      let allFNFTs = await this.getFNFTsForUserAndContract(user, contractAddress, provider);

      let ids = allFNFTs.ids;

      let response = await multicall(
        chainId,
        provider,
        fnftHandlerABI,
        ids.map((id) => [allFNFTs.nftAddress, 'uri', [id]])
      );

      let fnfts = {};
      response.forEach((entry, index) => {
        fnfts[ids[index]] = { uri: entry[0] };
      });

      allFNFTs.fnfts = fnfts;
      return allFNFTs;
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * Get FNFT's for specific wallet and contract
   *
   * @param {string} user
   * @param {string} contractAddress
   * @param {object} provider
   * @return {object}
   */
  getFNFTsForUserAndContract = async (user, contractAddress, provider) => {
    try {
      const tokenVaultABI = [
        'function getFNFT(uint fnftId) external view returns (tuple(address asset, address pipeToContract, uint depositAmount, uint depositMul, uint split, uint depositStopTime, bool maturityExtension, bool isMulti, bool nontransferrable))',
      ];
      let net = await provider.getNetwork();
      let chainId = net.chainId;
      let allFNFTsForUser = await this.getAllFNFTsForUser(user, provider, true);
      let ids = allFNFTsForUser;
      const revestRouter = new ethers.Contract(ADDRESSES[chainId].ROUTER, RouterABI.abi, provider);
      const TOKEN_VAULT = await revestRouter.getTokenVault();

      let response = await multicall(
        chainId,
        provider,
        tokenVaultABI,
        ids.map((id) => [TOKEN_VAULT, 'getFNFT', [id]])
      );
      let idsForContract = [];
      response.forEach((entry, index) => {
        if (entry[0].pipeToContract.toLowerCase() == contractAddress.toLowerCase()) {
          idsForContract.push(ids[index]);
        }
      });

      allFNFTsForUser.ids = idsForContract;
      allFNFTsForUser.contractAddress = contractAddress;
      allFNFTsForUser.vaultAddress = TOKEN_VAULT;
      const fnfts = await (
        await fetch(
          'https://api.revest.finance/metadata?chainId=' +
            chainId +
            '&id=' +
            allFNFTsForUser.ids.sort((a, b) => b - a).join(','),
          { mode: 'cors' }
        )
      ).json();

      return fnfts;
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * Filter list of FNFT's by maturity date.
   * Accepts an array of FNFT Ids and returns an array of IDs, sorted from unlocking soonest to unlocking last
   * Excludes any FNFTs that are unlocking after the specified UTC date (in seconds)
   *
   * @param {Array} fnftIds
   * @param {timestamp} upperBoundDate
   * @param {object} provider
   * @return {object}
   */
  filterFNFTIdListByMaturityDate = async (fnftIds, upperBoundDate, provider) => {
    const revestABI =
      'event FNFTTimeLockMinted(address indexed asset, address indexed from, uint indexed fnftId, uint endTime, uint[] quantities, tuple(address asset, address pipeToContract, uint depositAmount, uint depositMul, uint split, uint depositStopTime, bool maturityExtension, bool isMulti, bool nontransferrable) fnftConfig);';
    let net = await provider.getNetwork();
    let chainId = net.chainId;

    const revestRouter = new ethers.Contract(ADDRESSES[chainId].ROUTER, RouterABI.abi, provider);
    let REVEST = await revestRouter.getRevest();
    const revestContract = new ethers.Contract(REVEST, revestABI, provider);

    let TimeLockEvent = revestContract.filters.TimeLockEvent(null, null, fnftIds);

    TimeLockEvent.fromBlock = ADDRESSES[chainId].MIN_BLOCK;
    TimeLockEvent.toBlock = 'latest';

    let timeLocks = await provider.getLogs(TimeLockEvent);

    let events = timeLocks.map((log) => revestContract.interface.parseLog(log));

    let filteredIds = [];
    // Find minima
    for (let i in events) {
      let args = events[i].args;
      let localEnd = Number(args.endTime.toString());
      if (localEnd <= upperBoundDate) {
        filteredIds.push({ id: Number(args.fnftId.toString()), endTime: localEnd });
      }
    }
    filteredIds = filteredIds
      .sort((a, b) => {
        return a.endTime - b.endTime;
      })
      .map((item) => item.id);
    return filteredIds;
  };
}

export default Revest;
