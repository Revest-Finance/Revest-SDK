import { subgraphRequest } from "./RevestSDK.js";

export const SUBGRAPH_URL = {
    '1': 'https://api.thegraph.com/subgraphs/name/alexvorobiov/eip1155subgraph'
  };

const addresses = ["0xD76F585b6B94202430875aE748fF8C038Dc64111"];

const eip1155OwnersParams = {
    accounts: {
        __args: {
        where: {
            id_in: addresses.map((a) => a.toLowerCase())
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
  
const result = await subgraphRequest(
    SUBGRAPH_URL['1'],
    eip1155OwnersParams
  );

console.log(result);