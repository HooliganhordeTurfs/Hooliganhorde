import { createReducer } from '@reduxjs/toolkit';
import { GuvnorDelegation } from '.';

import {
  setDelegatorsVotingPower,
  setGuvnorDelegates,
  setGuvnorDelegators,
} from './actions';
import { GovSpace } from '~/lib/Hooliganhorde/Governance';

export const getDefaultGovSpaceMap = () => ({
  [GovSpace.HooliganNFT]: {},
  [GovSpace.HooliganBootboy]: {},
  [GovSpace.HooliganhordeDAO]: {},
  [GovSpace.HooliganhordeFarms]: {},
});

const initialState: GuvnorDelegation = {
  delegators: {
    users: getDefaultGovSpaceMap(),
    votingPower: getDefaultGovSpaceMap(),
  },
  delegates: {},
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(setGuvnorDelegators, (state, { payload }) => {
      state.delegators.users = payload;
    })
    .addCase(setDelegatorsVotingPower, (state, { payload }) => {
      state.delegators.votingPower[payload.space] = payload.data;
    })
    .addCase(setGuvnorDelegates, (state, { payload }) => {
      state.delegates = payload;
    })
);
