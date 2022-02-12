import { ADDRESSES, RouterABI, SUBGRAPH_URL } from "./constants";
import { subgraphRequest, multicall } from "./utils";

class Revest {
  constructor(divId) {
    this._divId = divId;
    this.observer;
  }
  renderAllFNFTs = async (data) => {
    try {
      this.lazyLoad();
      return data.reduce((promises, fnft) => {
        return promises.then((index) => {
          return fetch(fnft.url)
            .then((response) => response.json())
            .then((data) => {
              return fetch(data.animation_url)
                .then((response) => response.text())
                .then((_data, index) => {
                  const div = document.createElement("div");
                  const iframe = document.createElement("embed");
                  const blob = new Blob([_data], { type: "text/html" });
                  div.className = "card";
                  iframe.frameborder = 0;
                  iframe.className = "lazyload";
                  iframe.width = "300";
                  iframe.height = "460";
                  iframe.style.width = "300";
                  iframe.id = "fnft_" + fnft.id;
                  iframe.style.height = "460";
                  iframe.wmode = "transparent";
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
      console.log(error)
    }
  };
  lazyLoad = async () => {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            if (!entry.target.childNodes[0].src) {
              entry.target.childNodes[0].setAttribute(
                "src",
                entry.target.childNodes[0].dataset.src
              );
              entry.target.childNodes[0].style.zIndex = 999;
            }
          });
      },
      {
        root: null,
        threshold: new Array(101).fill(0).map((zero, index) => index * 0.01),
      }
    );
  };
  getAllFNFTsForUser = async (user, provider, _worker) => {
    const fnftHandlerABI = [
      "function uri(uint fnftId) external view returns (string memory)",
    ];
    let net = await provider.getNetwork();
    let chainId = net.chainId;
    const address = [user];
    const revestRouter = new ethers.Contract(
      ADDRESSES[chainId].ROUTER,
      RouterABI.abi,
      provider
    );
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
    let response = await subgraphRequest(
      SUBGRAPH_URL[chainId],
      eip1155OwnersParams
    );
    response.accounts[0].balances.forEach((balance) => {
      if (
        balance.token.registry.id.toLowerCase() ===
          FNFT_HANDLER.toLowerCase() &&
        balance.value != "0"
      ) {
        userFNFTs.push(Number(balance.token.identifier));
      }
    });
    if(_worker) {
      return userFNFTs;
    }

    const fnfts = await (
      await fetch(
        "https://api.revest.finance/metadata?id=" + userFNFTs.sort((a, b) => b - a).join(",")
      )
    ).json();

    return fnfts;
  };
  getFNFTsForUserAndContractWithURI = async (
    user,
    contractAddress,
    provider
  ) => {
    try {
      const fnftHandlerABI = [
        "function uri(uint fnftId) external view returns (string memory)",
      ];
  
      let net = await provider.getNetwork();
      let chainId = net.chainId;
      let allFNFTs = await getFNFTsForUserAndContract(
        user,
        contractAddress,
        provider
      );
  
      let ids = allFNFTsForUser.ids;
  
      let response = await multicall(
        chainId,
        provider,
        fnftHandlerABI,
        ids.map((id) => [allFNFTs.nftAddress, "uri", [id]])
      );
  
      let fnfts = {};
      response.forEach((entry, index) => {
        fnfts[ids[index]] = { uri: entry[0] };
      });
  
      allFNFTs.fnfts = fnfts;
      return allFNFTs;
    } catch (error) {
      console.log(error)
    }
  };

  getFNFTsForUserAndContract = async (user, contractAddress, provider) => {
    try {
      const tokenVaultABI = [
        "function getFNFT(uint fnftId) external view returns (tuple(address asset, address pipeToContract, uint depositAmount, uint depositMul, uint split, uint depositStopTime, bool maturityExtension, bool isMulti, bool nontransferrable))",
      ];
      let net = await provider.getNetwork();
      let chainId = net.chainId;
      let allFNFTsForUser = await this.getAllFNFTsForUser(user, provider, true);
      let ids = allFNFTsForUser;
      const revestRouter = new ethers.Contract(
        ADDRESSES[chainId].ROUTER,
        RouterABI.abi,
        provider
      );
      const TOKEN_VAULT = await revestRouter.getTokenVault();
  
      let response = await multicall(
        chainId,
        provider,
        tokenVaultABI,
        ids.map((id) => [TOKEN_VAULT, "getFNFT", [id]])
      );
  
      let idsForContract = [];
      response.forEach((entry, index) => {
        if (
          entry[0].pipeToContract.toLowerCase() == contractAddress.toLowerCase()
        ) {
          idsForContract.push(ids[index]);
        }
      });
  
      allFNFTsForUser.ids = idsForContract;
      allFNFTsForUser.contractAddress = contractAddress;
      allFNFTsForUser.vaultAddress = TOKEN_VAULT;
      const fnfts = await (
        await fetch(
          "http://localhost:3000/metadata?id=" + allFNFTsForUser.ids.sort((a, b) => b - a).join(",")
        )
      ).json();
  
      return fnfts;
    } catch (error) {
      console.log(error)
    }
    
  };
}

export default Revest;
