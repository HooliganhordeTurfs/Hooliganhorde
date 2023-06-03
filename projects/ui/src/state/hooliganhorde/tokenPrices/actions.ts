import { createAction } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';

export const updateTokenPrices = createAction<{ [address: string]: BigNumber }>(
  'hooliganhorde/tokenPrcies/updatePrices'
);

export const resetTokenPrices = createAction(
  'hooliganhorde/tokenPrices/resetPrices'
);
