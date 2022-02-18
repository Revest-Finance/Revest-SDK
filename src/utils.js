import { jsonToGraphQLQuery } from '../node_modules/json-to-graphql-query/lib/jsonToGraphQLQuery';
import { ADDRESSES } from './constants';

export async function subgraphRequest(url, query, options = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify({ query: jsonToGraphQLQuery({ query }) }),
  });
  const { data } = await res.json();
  return data || {};
}

export async function multicall(network, provider, abi, calls, options = {}) {
  const multicallAbi = [
    'function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)',
    'function getFNFT(uint fnftId) external view returns (tuple(address asset, address pipeToContract, uint depositAmount, uint depositMul, uint split, uint depositStopTime, bool maturityExtension, bool isMulti, bool nontransferrable))',
  ];

  let net = await provider.getNetwork();
  let chainId = net.chainId;

  const multi = new ethers.Contract(ADDRESSES[chainId].MULTICALL, multicallAbi, provider);

  const itf = new ethers.utils.Interface(abi);
  try {
    const max = options?.limit || 500;
    const pages = Math.ceil(calls.length / max);
    const promises = [];
    Array.from(Array(pages)).forEach((x, i) => {
      const callsInPage = calls.slice(max * i, max * (i + 1));
      promises.push(
        multi.aggregate(
          callsInPage.map((call) => [call[0].toLowerCase(), itf.encodeFunctionData(call[1], call[2])]),
          options || {}
        )
      );
    });
    let results = await Promise.all(promises);
    results = results.reduce((prev, [, res]) => prev.concat(res), []);
    return results.map((call, i) => itf.decodeFunctionResult(calls[i][1], call));
  } catch (e) {
    return Promise.reject(e);
  }
}

export async function lazyLoad() {
  return new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry) => {
          if (!entry.target.childNodes[0].src) {
            entry.target.childNodes[0].setAttribute('src', entry.target.childNodes[0].dataset.src);
            entry.target.childNodes[0].style.zIndex = 999;
          }
        });
    },
    {
      root: null,
      threshold: new Array(101).fill(0).map((zero, index) => index * 0.01),
    }
  );
}
