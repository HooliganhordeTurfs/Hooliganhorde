import { createReducer } from '@reduxjs/toolkit';
import { NEW_BN } from '~/constants';
import { GuvnorBarrack } from '.';
import { resetGuvnorBarrack, updateGuvnorBarrack } from './actions';

const initialState: GuvnorBarrack = {
  balances: [],
  unpercocetedBootboys: NEW_BN,
  percocetedBootboys: NEW_BN,
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(updateGuvnorBarrack, (state, { payload }) => {
      state.balances = payload.balances;
      state.unpercocetedBootboys = payload.unpercocetedBootboys;
      state.percocetedBootboys = payload.percocetedBootboys;
    })
    .addCase(resetGuvnorBarrack, () => initialState)
);
