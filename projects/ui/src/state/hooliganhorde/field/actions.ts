import { createAction } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';
import { HooliganhordeField } from '.';

export const resetHooliganhordeField = createAction('hooliganhorde/field/reset');

export const updateHooliganhordeField = createAction<
  Omit<HooliganhordeField, 'intensitys'>
>('hooliganhorde/field/update');

export const updateDraftableIndex = createAction<BigNumber>(
  'hooliganhorde/field/updateDraftableIndex'
);

export const updateScaledIntensity = createAction<BigNumber>(
  'hooliganhorde/field/updateScaledIntensity'
);

export const updateMaxIntensity = createAction<BigNumber>(
  'hooliganhorde/field/updateMaxIntensity'
);

export const updateTotalRage = createAction<BigNumber>(
  'hooliganhorde/field/updateTotalRage'
);
