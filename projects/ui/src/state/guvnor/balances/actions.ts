import { createAction } from '@reduxjs/toolkit';
import Token from '~/classes/Token';
import { Balance } from '.';

export type UpdateBalancePayload = {
  token: Token;
  balance: Balance;
};

export const updateBalances = createAction<UpdateBalancePayload[]>(
  'guvnor/balances/updateMultiple'
);

export const updateBalance = createAction<UpdateBalancePayload>(
  'guvnor/balances/update'
);

export const clearBalances = createAction('guvnor/balances/clear');
