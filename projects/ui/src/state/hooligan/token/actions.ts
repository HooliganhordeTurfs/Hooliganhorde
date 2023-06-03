import { createAction } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';

export const updatePrice = createAction<BigNumber>('hooligan/token/updatePrice');
export const updateSupply = createAction<BigNumber>('hooligan/token/updateSupply');
export const updateDeltaB = createAction<BigNumber>('hooligan/token/updateDeltaB');
