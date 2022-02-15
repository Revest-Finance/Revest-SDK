import { BigNumber, ethers, utils } from 'ethers';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import addresses from './addresses.js';
import {abi as RouterABI} from './abis/AddressRegistry.json';

export const SUBGRAPH_URL = {
  1: 'https://api.thegraph.com/subgraphs/name/alexvorobiov/eip1155subgraph',
  250: "https://api.thegraph.com/subgraphs/name/iskdrews/erc1155one",
};

// Accepts an array of FNFT Ids and returns an array of IDs, sorted from unlocking soonest to unlocking last
// Excludes any FNFTs that are unlocking after the specified UTC date (in seconds)
export async function filterFNFTIdListByMaturityDate(fnftIds, upperBoundDate, provider) {
  const revestABI = 'event FNFTTimeLockMinted(address indexed asset, address indexed from, uint indexed fnftId, uint endTime, uint[] quantities, tuple(address asset, address pipeToContract, uint depositAmount, uint depositMul, uint split, uint depositStopTime, bool maturityExtension, bool isMulti, bool nontransferrable) fnftConfig);'
  let net = await provider.getNetwork();
  let chainId = net.chainId;

  const revestRouter = new ethers.Contract(addresses[chainId].ROUTER, RouterABI, provider);
  let REVEST = await revestRouter.getRevest();
  const revestContract = new ethers.Contract(REVEST, revestABI, provider);

  let TimeLockEvent = revestContract.filters.TimeLockEvent(null, null, fnftIds);

  TimeLockEvent.fromBlock = addresses[network].MIN_BLOCK
  TimeLockEvent.toBlock =  "latest";

  let timeLocks = await provider.getLogs(TimeLockEvent);
  
  let events = timeLocks.map((log) => revestContract.interface.parseLog(log))
  
  let filteredIds = [];
  // Find minima
  for( let i in events ) {
    let args = events[i].args;
    let localEnd = Number(args.endTime.toString());
    if(localEnd <= upperBoundDate) {
      filteredIds.push({id:Number(args.fnftId.toString()), endTime: localEnd});
    }
  }
  filteredIds = filteredIds.sort((a, b) => {return a.endTime - b.endTime}).map(item => item.id);
  return filteredIds
}

export async function getFNFTsForUserAndContractWithURI(user, contractAddress, provider) {
  const fnftHandlerABI = [
    "function uri(uint fnftId) external view returns (string memory)",
  ]

  let net = await provider.getNetwork();
  let chainId = net.chainId;
  let allFNFTs = await getFNFTsForUserAndContract(user, contractAddress, provider);

  let ids = allFNFTsForUser.ids;

  let response = await multicall(
    chainId,
    provider,
    abi,
    ids.map((id) => [allFNFTs.nftAddress, 'uri', [id]])
  );

  let fnfts = {};
  response.forEach((entry, index) => {
    fnfts[ids[index]] = {uri: entry[0]};
  });

  allFNFTs.fnfts = fnfts;
  return allFNFTs;
}

export async function getFNFTsForUserAndContract(user, contractAddress, provider) {
  const tokenVaultABI = [
    "function getFNFT(uint fnftId) external view returns (tuple(address asset, address pipeToContract, uint depositAmount, uint depositMul, uint split, uint depositStopTime, bool maturityExtension, bool isMulti, bool nontransferrable))"
  ];
  let net = await provider.getNetwork();
  let chainId = net.chainId;
  let allFNFTsForUser = await getAllFNFTsForUser(user, provider);
  let ids = allFNFTsForUser.ids;

  const revestRouter = new ethers.Contract(addresses[chainId].ROUTER, RouterABI, provider);
  const TOKEN_VAULT = await revestRouter.getTokenVault();

  let response = await multicall(
    chainId,
    provider,
    abi,
    ids.map((id) => [TOKEN_VAULT, 'getFNFT', [id]])
  );

  let idsForContract = [];
  response.forEach((entry, index) => {
    if(entry[0].pipeToContract.toLowerCase() == contractAddress.toLowerCase()){
      idsForContract.push(ids[index]);
    }
  })

  allFNFTsForUser.ids = idsForContract;
  allFNFTsForUser.contractAddress = contractAddress;
  allFNFTsForUser.vaultAddress = TOKEN_VAULT;
  return allFNFTsForUser;
}

export async function getAllFNFTsForUser(user, provider) {

  let net = await provider.getNetwork();
  let chainId = net.chainId;
  const address = [user];

  const revestRouter = new ethers.Contract(addresses[chainId].ROUTER, RouterABI, provider);
  const FNFT_HANDLER = await revestRouter.getRevestFNFT();

  let userFNFTs = [];

  const eip1155OwnersParams = {
    accounts: {
      __args: {
        where: {
            id_in: address.map((a) => a.toLowerCase())
        }
      },
      id: true,
      balances: {
      value: true,
        token: {
            registry: {
              id: true,
            },
            identifier: true
        }
      }
    }
  };

  let response = await subgraphRequest(SUBGRAPH_URL[chainId], eip1155OwnersParams);

  response.accounts[0].balances.forEach(balance => {
    if(balance.token.registry.id.toLowerCase() === FNFT_HANDLER.toLowerCase() && balance.value != '0') {
      userFNFTs.push(Number(balance.token.identifier));
    } 
  });
  return {nftAddress:FNFT_HANDLER, ids: userFNFTs};
}

// Lower level helper methods

export async function subgraphRequest(url, query, options = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: JSON.stringify({ query: jsonToGraphQLQuery({ query }) })
    });
    const { data } = await res.json();
    return data || {};
}

export async function multicall(
  network,
  provider,
  abi,
  calls,
  options= {}
) {
  const multicallAbi = [
    'function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)'
  ];

  let net = await provider.getNetwork();
  let chainId = net.chainId;

  const multi = new ethers.Contract(
    addresses[chainId].multicall,
    multicallAbi,
    provider
  );

  const itf = new ethers.Interface(abi);
  try {
    const max = options?.limit || 500;
    const pages = Math.ceil(calls.length / max);
    const promises = [];
    Array.from(Array(pages)).forEach((x, i) => {
      const callsInPage = calls.slice(max * i, max * (i + 1));
      promises.push(
        multi.aggregate(
          callsInPage.map((call) => [
            call[0].toLowerCase(),
            itf.encodeFunctionData(call[1], call[2])
          ]),
          options || {}
        )
      );
    });
    let results = await Promise.all(promises);
    results = results.reduce((prev, [, res]) => prev.concat(res), []);
    return results.map((call, i) =>
      itf.decodeFunctionResult(calls[i][1], call)
    );
  } catch (e) {
    return Promise.reject(e);
  }
}