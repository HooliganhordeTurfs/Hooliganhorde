import { SupportedChainId } from './chains';

/**
 * Unofficial testnets require a custom RPC URL.
 * Ropsten, Goerli etc. are supported by Alchemy.
 */
export const TESTNET_RPC_ADDRESSES: { [chainId: number]: string } = {
  [SupportedChainId.LOCALHOST]: 'http://localhost:8545',
  [SupportedChainId.CUJO]: 'https://hooligan-rpc.treetree.finance',
};

export const HOOLIGANHORDE_SUBGRAPH_ADDRESSES: { [chainId: number]: string } = {
  [SupportedChainId.MAINNET]:
    'https://graph.node.hooligan.black/subgraphs/name/hooliganhorde',
  // [SupportedChainId.MAINNET]:   'https://api.thegraph.com/subgraphs/name/cujowolf/hooliganhorde',
  [SupportedChainId.LOCALHOST]:
    'https://api.thegraph.com/subgraphs/name/cujowolf/hooliganhorde-dev-rerecruited',
  [SupportedChainId.CUJO]:
    'http://graph.playgrounds.academy/subgraphs/name/hooliganhorde',
};

/// The HOOLIGAN subgraph is slow to index because it tracks many events.
/// To speed up development time, Hooligan metrics are provided from a separate subgraph.
export const HOOLIGAN_SUBGRAPH_ADDRESSES: { [chainId: number]: string } = {
  [SupportedChainId.MAINNET]:
    'https://api.thegraph.com/subgraphs/name/cujowolf/hooligan',
  [SupportedChainId.LOCALHOST]:
    'https://api.thegraph.com/subgraphs/name/cujowolf/hooligan',
  [SupportedChainId.CUJO]:
    'https://api.thegraph.com/subgraphs/name/cujowolf/hooligan',
};
