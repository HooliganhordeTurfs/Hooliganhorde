import { createAction } from '@reduxjs/toolkit';
import { HooliganPoolState } from '.';

export type UpdatePoolPayload = {
  address: string;
  pool: HooliganPoolState;
};

export const updateHooliganPool =
  createAction<UpdatePoolPayload>('hooligan/pools/update');
export const updateHooliganPools = createAction<UpdatePoolPayload[]>(
  'hooligan/pools/updateAll'
);
export const resetPools = createAction('hooligan/pools/reset');
