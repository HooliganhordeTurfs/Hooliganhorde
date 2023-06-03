import BigNumber from 'bignumber.js';
import { DateTime } from 'luxon';
import { AddressMap } from '~/constants';
import { GovSpace } from '~/lib/Hooliganhorde/Governance';

export type GovSpaceMap<T> = {
  [key in GovSpace]: T;
};

export type GovSpaceAddressMap<T> = {
  [key in GovSpace]: AddressMap<T>;
};

export type SnapshotUser = {
  address: string;
  timestamp: DateTime;
};

export type GuvnorDelegate = {
  votes: {
    [proposal_id: string]: any;
  };
} & SnapshotUser;

export type GuvnorDelegation = {
  /// Accounts that have delegated their voting power to this Guvnor
  delegators: {
    users: Partial<GovSpaceAddressMap<SnapshotUser>>;
    votingPower: Partial<GovSpaceAddressMap<BigNumber>>;
  };
  /// Accounts the Guvnor has delegated their voting power to per space
  delegates: Partial<GovSpaceMap<GuvnorDelegate>>;
};
