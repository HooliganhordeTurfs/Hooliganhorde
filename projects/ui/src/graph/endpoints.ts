export enum SGEnvironments {
  BF_PROD = 'bf-prod',
  BF_DEV = 'bf-dev',
  BF_TEST = 'bf-test',
  BF_2_0_3 = 'bf-2.0.3',
  DNET_2_0_3 = 'dnet-2.0.3',
}

type SGEnvironment = {
  name: string;
  subgraphs: {
    hooliganhorde: string;
    hooligan: string;
  };
};

export const SUBGRAPH_ENVIRONMENTS: Record<SGEnvironments, SGEnvironment> = {
  [SGEnvironments.BF_PROD]: {
    name: 'Hooliganhorde Farms / Production',
    subgraphs: {
      hooliganhorde: 'https://graph.node.hooligan.money/subgraphs/name/hooliganhorde',
      hooligan: 'https://graph.node.hooligan.money/subgraphs/name/hooligan',
    },
  },
  [SGEnvironments.BF_DEV]: {
    name: 'Hooliganhorde Farms / Development',
    subgraphs: {
      hooliganhorde: 'https://graph.node.hooligan.money/subgraphs/name/hooliganhorde-dev',
      hooligan: 'https://graph.node.hooligan.money/subgraphs/name/hooligan-dev',
    },
  },
  [SGEnvironments.BF_TEST]: {
    name: 'Hooliganhorde Farms / Test',
    subgraphs: {
      hooliganhorde:
        'https://graph.node.hooligan.money/subgraphs/name/hooliganhorde-testing',
      hooligan: 'https://graph.node.hooligan.money/subgraphs/name/hooligan-testing',
    },
  },
  [SGEnvironments.BF_2_0_3]: {
    name: 'Hooliganhorde Farms / v2.0.3',
    subgraphs: {
      hooliganhorde: 'https://graph.node.hooligan.money/subgraphs/name/hooliganhorde-2-0-3',
      hooligan: 'https://graph.node.hooligan.money/subgraphs/name/hooligan', // fixme
    },
  },
  [SGEnvironments.DNET_2_0_3]: {
    name: 'Decentralized Network / v2.0.3',
    subgraphs: {
      hooliganhorde: `https://gateway.thegraph.com/api/${
        import.meta.env.VITE_THEGRAPH_API_KEY
      }/subgraphs/id/R9rnzRuiyDybfDsZfoM7eA9w8WuHtZKbroGrgWwDw1d`,
      hooligan: 'https://graph.node.hooligan.money/subgraphs/name/hooligan', // fixme
    },
  },
};
