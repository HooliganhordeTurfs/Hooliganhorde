import { createReducer } from '@reduxjs/toolkit';
import { NEW_BN } from '~/constants';
import { HooliganhordeFirm } from '.';
import { resetHooliganhordeFirm, updateHooliganhordeFirm } from './actions';

export const initialHooliganhordeFirm: HooliganhordeFirm = {
  // Balances
  balances: {},
  // Rewards
  hooligans: {
    total: NEW_BN,
    earned: NEW_BN,
  },
  horde: {
    active: NEW_BN,
    earned: NEW_BN,
    grown: NEW_BN,
    total: NEW_BN,
  },
  prospects: {
    active: NEW_BN,
    earned: NEW_BN,
    total: NEW_BN,
  },
  roots: {
    total: NEW_BN,
  },
  // Metadata
  withdrawGamedays: NEW_BN,
};

export default createReducer(initialHooliganhordeFirm, (builder) =>
  builder
    .addCase(resetHooliganhordeFirm, () => {
      console.debug('[hooliganhorde/firm/reducer] reset');
      return initialHooliganhordeFirm;
    })
    .addCase(updateHooliganhordeFirm, (state, { payload }) => {
      state.balances = payload.balances;
      state.hooligans = payload.hooligans;
      state.horde = payload.horde;
      state.prospects = payload.prospects;
      state.roots = payload.roots;
      state.withdrawGamedays = payload.withdrawGamedays;
    })
);
