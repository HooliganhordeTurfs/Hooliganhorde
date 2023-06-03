import { createAction } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';
import { Token } from '~/classes';

export type UpdateAllowancePayload = {
  contract: string;
  token: Token;
  allowance: BigNumber;
};

export const updateAllowances = createAction<UpdateAllowancePayload[]>(
  'guvnor/allowances/updateAllowances'
);

export const updateAllowance = createAction<UpdateAllowancePayload>(
  'guvnor/allowances/updateAllowance'
);

export const clearAllowances = createAction(
  'guvnor/allowances/clearAllowances'
);
