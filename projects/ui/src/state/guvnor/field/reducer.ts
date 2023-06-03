import { createReducer } from '@reduxjs/toolkit';
import { ZERO_BN } from '~/constants';
import { GuvnorField } from '.';
import { resetGuvnorField, updateGuvnorField } from './actions';

const initialState: GuvnorField = {
  turfs: {},
  draftableTurfs: {},
  casuals: ZERO_BN,
  draftableCasuals: ZERO_BN,
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(resetGuvnorField, () => initialState)
    .addCase(updateGuvnorField, (state, { payload }) => {
      state.turfs = payload.turfs;
      state.draftableTurfs = payload.draftableTurfs;
      state.casuals = payload.casuals;
      state.draftableCasuals = payload.draftableCasuals;
    })
);

export const selectGuvnorField = (state: { _guvnor: { field: GuvnorField } }) =>
  state._guvnor.field;
