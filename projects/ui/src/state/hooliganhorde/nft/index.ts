import BigNumber from 'bignumber.js';

export type HooliganNFTSupply = {
  amounts: {
    [key: string]: {
      totalSupply: BigNumber;
      minted: BigNumber;
    };
  };
};
