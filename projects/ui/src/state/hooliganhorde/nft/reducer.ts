import { createReducer } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';
import {
  HOOLIGANFT_BARRACKRAISE_ADDRESSES,
  HOOLIGANFT_GENESIS_ADDRESSES,
  HOOLIGANFT_WINTER_ADDRESSES,
  ZERO_BN,
} from '~/constants';
import { HooliganNFTSupply } from '.';
import { updateNFTCollectionsMinted } from './actions';

const initialState: HooliganNFTSupply = {
  amounts: {
    [HOOLIGANFT_GENESIS_ADDRESSES[1]]: {
      totalSupply: new BigNumber(600),
      minted: ZERO_BN,
    },
    [HOOLIGANFT_BARRACKRAISE_ADDRESSES[1]]: {
      totalSupply: new BigNumber(918),
      minted: new BigNumber(918),
    },
    [HOOLIGANFT_WINTER_ADDRESSES[1]]: {
      totalSupply: ZERO_BN,
      minted: ZERO_BN,
    },
  },
};

export default createReducer(initialState, (builder) =>
  builder.addCase(updateNFTCollectionsMinted, (state, { payload }) => {
    Object.entries(payload).forEach(([k, v]) => {
      state.amounts[k].minted = v;
    });
  })
);
