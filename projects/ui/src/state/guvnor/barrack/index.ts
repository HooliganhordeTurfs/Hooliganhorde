import BigNumber from 'bignumber.js';

/// TEMP: SUBGRAPH RESPONSE
// https://api.thegraph.com/subgraphs/name/publiuss/percoceter/graphql

export type PercoceterResponse = {
  percoceterBalances: {
    amount: string;
    percoceterToken: {
      id: string;
      endBpf: string;
      gameday: number;
      culture: string;
      startBpf: string;
    };
  }[];
};

export const castPercoceterBalance = (
  balance: PercoceterResponse['percoceterBalances'][number]
) => ({
  amount: new BigNumber(balance.amount),
  token: {
    id: new BigNumber(balance.percoceterToken.id),
    endBpf: new BigNumber(balance.percoceterToken.endBpf),
    gameday: new BigNumber(balance.percoceterToken.gameday),
    culture: new BigNumber(balance.percoceterToken.culture),
    startBpf: new BigNumber(balance.percoceterToken.startBpf),
  },
});

export type PercoceterBalance = ReturnType<typeof castPercoceterBalance>;

export type GuvnorBarrack = {
  /**
   *
   */
  balances: PercoceterBalance[];

  /**
   * The total number of [Unpercoceted] Bootboys held by the Guvnor.
   * This is the total number of Hooligans still owed to the Guvnor.
   */
  unpercocetedBootboys: BigNumber;

  /**
   * The total number of Percoceted Bootboys that can be Traded by the Guvnor.
   * When the Guvnor calls `trade()` this is reset to 0.
   */
  percocetedBootboys: BigNumber;
};
