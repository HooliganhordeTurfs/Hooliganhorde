import { createAction } from '@reduxjs/toolkit';
import { HooliganhordeGovernance } from '.';

export const resetHooliganhordeGovernance = createAction(
  'hooliganhorde/governance/reset'
);

export const updateActiveProposals = createAction<
  HooliganhordeGovernance['activeProposals']
>('hooliganhorde/governance/updateActiveProposals');

export const updateMultisigBalances = createAction<
  HooliganhordeGovernance['multisigBalances']
>('hooliganhorde/governance/updateMultisigBalances');
