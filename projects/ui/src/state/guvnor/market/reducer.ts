import { createReducer } from '@reduxjs/toolkit';
import { GuvnorMarket } from '.';
import { resetGuvnorMarket, updateGuvnorMarket } from './actions';

const initialState: GuvnorMarket = {
  listings: {},
  orders: {},
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(resetGuvnorMarket, () => initialState)
    .addCase(updateGuvnorMarket, (state, { payload }) => {
      state.listings = payload.listings;
      state.orders = payload.orders;
    })
);
