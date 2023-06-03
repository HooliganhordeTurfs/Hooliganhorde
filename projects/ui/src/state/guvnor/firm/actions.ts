import { createAction } from '@reduxjs/toolkit';
import { AddressMap } from '~/constants';
import { GuvnorFirmRewards, GuvnorFirmBalance } from '.';

export type UpdateGuvnorFirmBalancesPayload = AddressMap<
  Partial<GuvnorFirmBalance>
>;

export const resetGuvnorFirm = createAction('guvnor/firm/reset');

export const updateGuvnorFirmRewards =
  createAction<GuvnorFirmRewards>('guvnor/firm/update');

export const updateGuvnorFirmBalances =
  createAction<UpdateGuvnorFirmBalancesPayload>(
    'guvnor/firm/updateGuvnorFirmBalances'
  );
