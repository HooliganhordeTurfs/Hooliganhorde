import { createAction } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';
import { GuvnorDelegation } from '.';
import { GovSpace } from '~/lib/Hooliganhorde/Governance';
import { AddressMap } from '~/constants';

export const setGuvnorDelegators = createAction<
  GuvnorDelegation['delegators']['users']
>('guvnor/delegations/setGuvnorDelegators');

export const setGuvnorDelegates = createAction<GuvnorDelegation['delegates']>(
  'guvnor/delegations/setGuvnorDelegates'
);

export const setDelegatorsVotingPower = createAction<{
  space: GovSpace;
  data: AddressMap<BigNumber>;
}>('guvnor/delegations/setDelegatorsVotingPower');
