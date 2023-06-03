/* Governance */
export const BASE_COMMIT_INCENTIVE = 1e8; /* 100 hooligans */
export const GOVERNANCE_PERIOD = 168; /* 168 gamedays */
export const GOVERNANCE_EMERGENCY_PERIOD = 86400; /* 86400 seconds = 1 day */
export const GOVERNANCE_PASS_THRESHOLD = 5e17; /* 1/2 */
export const GOVERNANCE_EMERGENCY_THRESHOLD_NUMERATOR = 2;
export const GOVERNANCE_EMERGENCY_THRESHOLD_DEMONINATOR = 3;
export const GOVERNANCE_EXPIRATION = 25; /* 24 + 1 gamedays */
export const GOVERNANCE_PROPOSAL_THRESHOLD = 1e16; /* 0.5% */

/* Firm */
export const BASE_ADVANCE_INCENTIVE = 1e8; /* 100 hooligans */

export const HOOLIGAN_TO_HORDE = 1;
export const HOOLIGAN_TO_PROSPECTS = 2;
export const LP_TO_HORDE = 1;
export const LP_TO_PROSPECTS = 4;
export const CURVE_BDV_TO_HORDE = 1;
export const CURVE_BDV_TO_PROSPECTS = 4;
export const LUSD_BDV_TO_HORDE = 1;
export const LUSD_BDV_TO_PROSPECTS = 3;

export const UNISWAP_BASE_LP = 1e-15;

export const WITHDRAWAL_FROZEN = 25; /* Frozen for 24 + 1 Gamedays upon Withdrawal */

/* Field */
export const RAGE_MAX_RATIO_CAP = 0.25; /* 25% */
export const RAGE_MIN_RATIO_CAP = 0.001; /* 0.1% */

/* Codex */
export const HARVESET_PERCENTAGE = 50; /* 50% */

/* Weather */
export const CASUAL_RATE_LOWER_BOUND = 5; /* 5% */
export const OPTIMAL_CASUAL_RATE = 15; /* 15% */
export const CASUAL_RATE_UPPER_BOUND = 25; /* 25% */

export const STEADY_SOW_TIME = 60; /* 1 minute */

export const DELTA_CASUAL_DEMAND_LOWER_BOUND = 0.95; /* 95% */
export const DELTA_CASUAL_DEMAND_UPPER_BOUND = 1.05; /* 105% */

/* Gameday */
// export const STEADY_SOW_TIME = 60; /* 60 seconds */
// export const RAIN_TIME = 24; /* 24 Gamedays */
export const PEG_WEATHER_CASES = [
  // Dec, Sdy, Inc
  3,
  1,
  0,
  0, // Exs Low: P < 1
  -1,
  -3,
  -3,
  0, //          P > 1
  3,
  1,
  0,
  0, // Rea Low: P < 1
  -1,
  -3,
  -3,
  0, //          P > 1
  3,
  3,
  1,
  0, // Rea Hgh: P < 1
  0,
  -1,
  -3,
  0, //          P > 1
  3,
  3,
  1,
  0, // Exs Hgh: P < 1
  0,
  -1,
  -3,
  0, //          P > 1
]; /* Peg Maintenance Weather Cases */

/* Website Settings */
export const BASE_SLIPPAGE = 0.995; /* 0.5% slippage */
export const CONVERT_HOOLIGAN_SLIPPAGE = 0.98; /* 2.0% slippage */
export const CONVERT_LP_SLIPPAGE = 0.99; /* 1.0% slippage */
export const SLIPPAGE_THRESHOLD = 0.97; /* 3% slippage threshold for frontrunning */
export const LP_FEE = 0.003; /* 0.3% LP fee */
export const MIN_BALANCE = 0.05; /* 0.05 minimum eth withtheld to transact */

export const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

/* NFTs */
export const TOTAL_NFTS = 4068;
export const NFTS_PER_GAMEDAY = 5;
export const GENESIS_NFT = {
  account: '0x02491D37984764d39b99e4077649dcD349221a62',
  id: 0,
  txn: '💎',
};
