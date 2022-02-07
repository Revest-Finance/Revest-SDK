import { BigNumber, ethers, utils } from 'ethers';
import { subgraphRequest } from "./RevestSDK.js";
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import addresses from './addresses.js';
import {abi as RouterABI} from './abis/AddressRegistry.json';

export const SUBGRAPH_URL = {
  1: 'https://api.thegraph.com/subgraphs/name/alexvorobiov/eip1155subgraph'
};

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

  result.accounts[0].balances.forEach(balance => {
    if(balance.token.registry.id.toLowerCase() === FNFT_HANDLER.toLowerCase() && balance.value != '0') {
      userFNFTs.push(Number(balance.token.identifier));
    } 
  });
  return {nftAddress:FNFT_HANDLER, ids: userFNFTs};
}

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