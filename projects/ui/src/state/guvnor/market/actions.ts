import { createAction } from '@reduxjs/toolkit';
import { GuvnorMarket } from '.';

export const resetGuvnorMarket = createAction('guvnor/market/reset');
export const updateGuvnorMarket = createAction<GuvnorMarket>(
  'guvnor/market/update'
);
