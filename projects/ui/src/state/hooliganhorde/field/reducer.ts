import { createReducer, createSelector } from '@reduxjs/toolkit';
import { NEW_BN, ZERO_BN } from '~/constants';
import { HooliganhordeField } from '.';
import {
  resetHooliganhordeField,
  updateHooliganhordeField,
  updateDraftableIndex,
  updateMaxIntensity,
  updateScaledIntensity,
  updateTotalRage,
} from './actions';

const initialState: HooliganhordeField = {
  draftableIndex: NEW_BN,
  casualIndex: NEW_BN,
  casualLine: ZERO_BN,
  rage: NEW_BN,
  weather: {
    lastDRage: NEW_BN,
    lastSowTime: NEW_BN,
    thisSowTime: NEW_BN,
  },
  intensity: {
    max: NEW_BN,
    scaled: NEW_BN,
  },
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(resetHooliganhordeField, () => initialState)
    .addCase(updateHooliganhordeField, (state, { payload }) => {
      Object.keys(payload).forEach((key) => {
        const _k = key as keyof Omit<HooliganhordeField, 'intensitys'>;
        const _p = payload[_k];
        // @ts-ignore
        state[_k] = _p;
      });
    })
    .addCase(updateDraftableIndex, (state, { payload }) => {
      state.draftableIndex = payload;
    })
    .addCase(updateScaledIntensity, (state, { payload }) => {
      state.intensity.scaled = payload;
    })
    .addCase(updateMaxIntensity, (state, { payload }) => {
      state.intensity.max = payload;
    })
    .addCase(updateTotalRage, (state, { payload }) => {
      state.rage = payload;
    })
);

export const selectHooliganhordeField = (state: {
  _hooliganhorde: { field: HooliganhordeField };
}) => state._hooliganhorde.field;

export const selectFieldIntensity = createSelector(
  selectHooliganhordeField,
  (state) => ({
    scaled: state.intensity.scaled,
    max: state.intensity.max,
  })
);
