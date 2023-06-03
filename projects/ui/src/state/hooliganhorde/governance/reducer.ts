import { createReducer } from '@reduxjs/toolkit';
import { HooliganhordeGovernance } from '.';
import {
  resetHooliganhordeGovernance,
  updateActiveProposals,
  updateMultisigBalances,
} from './actions';

const initialState: HooliganhordeGovernance = {
  activeProposals: [],
  multisigBalances: {},
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(resetHooliganhordeGovernance, () => initialState)
    .addCase(updateActiveProposals, (state, { payload }) => {
      state.activeProposals = payload;
    })
    .addCase(updateMultisigBalances, (state, { payload }) => {
      state.multisigBalances = payload;
    })
);
