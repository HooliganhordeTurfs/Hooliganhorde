import { createReducer } from '@reduxjs/toolkit';
import { NEW_BN, ZERO_BN } from '~/constants';
import { HooliganhordeBarrack } from '.';
import { resetBarrack, updateBarrack } from './actions';

const initialState: HooliganhordeBarrack = {
  remaining: ZERO_BN,
  totalRaised: ZERO_BN,
  culture: NEW_BN,
  currentBpf: NEW_BN,
  endBpf: NEW_BN,
  recapFundedPct: NEW_BN,
  unpercoceted: NEW_BN,
  percoceted: NEW_BN,
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(resetBarrack, () => initialState)
    .addCase(updateBarrack, (_state, { payload }) => ({ ...payload }))
);
