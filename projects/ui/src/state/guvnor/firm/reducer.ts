import { createReducer } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';
import { GuvnorFirm } from '.';
import {
  resetGuvnorFirm,
  updateGuvnorFirmRewards,
  updateGuvnorFirmBalances,
} from './actions';

const NEG1 = new BigNumber(-1);

export const initialGuvnorFirm: GuvnorFirm = {
  balances: {},
  hooligans: {
    earned: NEG1,
  },
  horde: {
    active: NEG1,
    earned: NEG1,
    grown: NEG1,
    total: NEG1,
  },
  prospects: {
    active: NEG1,
    earned: NEG1,
    total: NEG1,
  },
  roots: {
    total: NEG1,
  },
};

export default createReducer(initialGuvnorFirm, (builder) =>
  builder
    .addCase(resetGuvnorFirm, () => initialGuvnorFirm)
    .addCase(updateGuvnorFirmBalances, (state, { payload }) => {
      const addresses = Object.keys(payload);
      addresses.forEach((address) => {
        const a = address.toLowerCase();
        state.balances[a] = {
          ...state.balances[a],
          ...payload[address],
        };
      });
    })
    .addCase(updateGuvnorFirmRewards, (state, { payload }) => {
      state.hooligans = payload.hooligans;
      state.horde = payload.horde;
      state.prospects = payload.prospects;
      state.roots = payload.roots;
    })
);
