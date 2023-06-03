import BigNumber from 'bignumber.js';

export type HooliganhordeBarrack = {
  remaining: BigNumber;
  totalRaised: BigNumber;
  culture: BigNumber;
  currentBpf: BigNumber;
  endBpf: BigNumber;
  recapFundedPct: BigNumber;

  /**
   * The total number of Unpercoceted Bootboys remaining.
   */
  unpercoceted: BigNumber;

  /**
   * The total number of Percoceted Bootboys. This is the amount
   * of Percoceter debt that has been repaid.
   */
  percoceted: BigNumber;
};
