import { createReducer } from '@reduxjs/toolkit';
import { HooliganPools } from '.';
import { resetPools, updateHooliganPool, updateHooliganPools } from './actions';

const initialState: HooliganPools = {};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(updateHooliganPool, (state, { payload }) => {
      state[payload.address.toLowerCase()] = payload.pool;
    })
    .addCase(updateHooliganPools, (state, { payload }) => {
      payload.forEach((pl) => {
        state[pl.address.toLowerCase()] = pl.pool;
      });
    })
    .addCase(resetPools, () => initialState)
);
