import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { DateTime } from 'luxon';
import BigNumber from 'bignumber.js';
import { GovSpace, SNAPSHOT_SPACES } from '~/lib/Hooliganhorde/Governance';
import {
  useBeaNftUsersLazyQuery,
  useDelegatorsHordeLazyQuery,
  useVoterDelegatesLazyQuery,
  useVoterDelegatorsLazyQuery,
} from '~/generated/graphql';
import useAccount from '~/hooks/ledger/useAccount';
import { GuvnorDelegation, GovSpaceAddressMap } from '.';
import {
  setDelegatorsVotingPower,
  setGuvnorDelegates,
  setGuvnorDelegators,
} from './actions';
import { useDelegatesRegistryContract } from '~/hooks/ledger/useContract';
import { GOV_SPACE_BY_ID, tokenResult } from '~/util';
import { HORDE } from '~/constants/tokens';
import { useAppSelector } from '~/state';
import { AddressMap, ZERO_ADDRESS } from '~/constants';
import { getDefaultGovSpaceMap } from './reducer';

export function useReadDelegatesDev() {
  const account = useAccount();
  const registry = useDelegatesRegistryContract();

  const dispatch = useDispatch();

  const fetch = useCallback(
    async (_account?: string) => {
      const address = (_account || account)?.toLowerCase();
      if (!address) return;
      const spaces = Object.entries(GOV_SPACE_BY_ID);

      const result = await Promise.all(
        spaces.map(async ([space, id]) => {
          const response = await registry.delegation(address, id);
          const data =
            response === ZERO_ADDRESS
              ? undefined
              : {
                  address: response,
                  timestamp: DateTime.now().set({ year: 2000 }),
                  votes: {},
                };
          return {
            [space]: data,
          };
        })
      );
      const mapped = result.reduce((prev, curr) => ({ ...prev, ...curr }), {});

      console.debug('[useReadDelegatesDev/fetch] RESULT = ', mapped);

      dispatch(setGuvnorDelegates(mapped));
      return mapped;
    },
    [dispatch, account, registry]
  );

  return [fetch] as const;
}

/**
 * Fetch accounts that this guvnor has delegated their voting power to
 */
export function useFetchGuvnorDelegates() {
  const account = useAccount();

  const dispatch = useDispatch();

  const [fetchDelegates] = useVoterDelegatesLazyQuery({
    fetchPolicy: 'cache-and-network',
    context: { subgraph: 'snapshot-labs' },
  });

  const fetch = useCallback(
    async (_account?: string, options?: { dispatch?: boolean }) => {
      try {
        // if (IS_DEV) return readDelegatesDev(_account);
        const address = _account || account;
        const shouldDispatch = options?.dispatch ?? true;
        if (!address) return undefined;

        const queryData = await fetchDelegates({
          variables: {
            space_in: SNAPSHOT_SPACES,
            voter_address: address,
          },
        });
        console.debug(
          '[useFetchGuvnorDelegates/fetch] QUERY RESULT =',
          queryData
        );

        const delegations = queryData?.data?.delegations || [];
        const result = delegations.reduce<GuvnorDelegation['delegates']>(
          (prev, curr) => ({
            ...prev,
            [curr.space as GovSpace]: {
              address: curr.delegate,
              timestamp: DateTime.fromSeconds(curr.timestamp),
              votes: {},
            },
          }),
          {}
        );

        console.debug('[useFetchGuvnorDelegates/fetch] RESULT =', result);

        shouldDispatch && dispatch(setGuvnorDelegates(result));
        return result;
      } catch (e) {
        console.debug('[useFetchGuvnorDelegates/fetch] FAILED:', e);
        return undefined;
      }
    },
    [account, dispatch, fetchDelegates]
  );

  const clear = useCallback(() => {
    dispatch(setGuvnorDelegates({}));
  }, [dispatch]);

  return [fetch, clear] as const;
}

/**
 * Fetch accounts who have delegated their votes to this Guvnor
 */
export function useFetchGuvnorDelegators() {
  const account = useAccount();

  const dispatch = useDispatch();

  const [fetchDelegators] = useVoterDelegatorsLazyQuery({
    fetchPolicy: 'cache-and-network',
    context: { subgraph: 'snapshot-labs' },
  });

  const fetch = useCallback(
    async (_account?: string, options?: { dispatch: boolean }) => {
      const address = _account || account;
      const shouldDispatch = options?.dispatch ?? true;
      if (!address) return undefined;

      try {
        const queryData = await fetchDelegators({
          variables: {
            space_in: SNAPSHOT_SPACES,
            voter_address: address,
          },
        });

        const d = queryData.data?.delegations || [];
        const result = d.reduce<GuvnorDelegation['delegators']['users']>(
          (prev, curr) => {
            const spaceDelegators = prev[curr.space as GovSpace] || {};
            const currDelegator = {
              address: curr.delegator,
              timestamp: DateTime.fromSeconds(curr.timestamp),
            };
            return {
              ...prev,
              [curr.space]: {
                ...spaceDelegators,
                [currDelegator.address]: currDelegator,
              },
            };
          },
          {}
        );

        console.debug('[useFetchGuvnorDelegators/fetch] RESULT = ', result);

        shouldDispatch && dispatch(setGuvnorDelegators(result));
        return result;
      } catch (err) {
        console.debug('[useFetchGuvnorDelegators/fetch] FAILED:', err);
        return undefined;
      }
    },
    [account, dispatch, fetchDelegators]
  );

  const clear = useCallback(() => {
    dispatch(setGuvnorDelegators({}));
  }, [dispatch]);

  return [fetch, clear] as const;
}

export function useFetchNFTVotingPower() {
  const guvnorDelegators = useAppSelector(
    (state) => state._guvnor.delegations.delegators.users
  );

  const account = useAccount();

  const dispatch = useDispatch();

  const delegators = useMemo(() => {
    if (!account) return [];
    const bySpace = guvnorDelegators[GovSpace.HooliganNFT] || {};
    const addresses = Object.keys(bySpace).map((a) => a.toLowerCase());
    return [...new Set(addresses)];
  }, [account, guvnorDelegators]);

  const [triggerQuery] = useBeaNftUsersLazyQuery({
    variables: { id_in: delegators },
    fetchPolicy: 'cache-and-network',
    context: { subgraph: 'hooliganft' },
  });

  /// handlers
  const fetch = useCallback(async () => {
    try {
      if (!account || !delegators.length) return;
      const data = await triggerQuery();
      const byUser = data.data?.beaNFTUsers || [];
      const votingPower = byUser.reduce<AddressMap<BigNumber>>((acc, curr) => {
        const genesis = curr.genesis?.length || 0;
        const winter = curr.winter?.length || 0;
        const barrackRaise = curr.barrackRaise?.length || 0;
        acc[curr.id] = new BigNumber(genesis + winter + barrackRaise);
        return acc;
      }, {});

      dispatch(
        setDelegatorsVotingPower({
          space: GovSpace.HooliganNFT,
          data: votingPower,
        })
      );

      console.debug('[useFetchNFTVotingPower/fetch] RESULT = ', votingPower);

      return votingPower;
    } catch (err) {
      console.debug('[useFetchNFTVotingPower/fetch] FAILED:', err);
      return undefined;
    }
  }, [account, delegators, dispatch, triggerQuery]);

  const clear = useCallback(() => {
    dispatch(
      setDelegatorsVotingPower({
        space: GovSpace.HooliganNFT,
        data: {},
      })
    );
  }, [dispatch]);

  return [fetch, clear] as const;
}

export function useFetchHordeVotingPower() {
  const guvnorDelegators = useAppSelector(
    (state) => state._guvnor.delegations.delegators.users
  );

  const account = useAccount();

  const dispatch = useDispatch();

  const delegators = useMemo(() => {
    if (!guvnorDelegators) return [];

    const _delegators = Object.entries(guvnorDelegators);
    const accounts = _delegators.reduce<string[]>((prev, curr) => {
      const [space, _users] = curr;
      if (space === GovSpace.HooliganNFT) return prev;

      const users = Object.values(_users);
      const addresses = users.map((u) => u.address.toLowerCase());

      return [...prev, ...addresses];
    }, []);

    return [...new Set(accounts)];
  }, [guvnorDelegators]);

  const [triggerQuery] = useDelegatorsHordeLazyQuery({
    variables: { ids: delegators },
    fetchPolicy: 'cache-and-network',
    context: { subgraph: 'hooliganhorde' },
  });

  const fetch = useCallback(async () => {
    try {
      if (!account || !delegators.length) return;
      const data = await triggerQuery();
      const guvnors = data.data?.guvnors || [];

      const byGuvnor = guvnors.reduce<AddressMap<BigNumber>>((acc, curr) => {
        const result = tokenResult(HORDE)(curr.firm?.horde || 0);
        acc[curr.id.toLowerCase()] = result;
        return acc;
      }, {});

      const votingPower =
        getDefaultGovSpaceMap() as GovSpaceAddressMap<BigNumber>;

      const _delegators = Object.entries(guvnorDelegators);

      _delegators.forEach(([_space, _users]) => {
        const space = _space as GovSpace;
        if (space === GovSpace.HooliganNFT) return;

        Object.keys(_users).forEach((address) => {
          const vp = byGuvnor[address.toLowerCase()];
          if (vp) {
            votingPower[space][address] = vp;
          }
        });
      });

      Object.entries(votingPower).forEach(([_space, _data]) => {
        if (_space !== GovSpace.HooliganNFT) {
          dispatch(
            setDelegatorsVotingPower({
              space: _space as GovSpace,
              data: _data,
            })
          );
        }
      });

      console.debug('[useFetchHordeVotingPower/fetch] Result = ', votingPower);

      return votingPower;
    } catch (err) {
      console.debug('[useFetchHordeVotingPower/fetch] FAILED:', err);
      return undefined;
    }
  }, [account, delegators.length, triggerQuery, guvnorDelegators, dispatch]);

  const clear = useCallback(() => {
    [
      GovSpace.HooliganBootboy,
      GovSpace.HooliganhordeDAO,
      GovSpace.HooliganhordeFarms,
    ].forEach((space) => {
      dispatch(
        setDelegatorsVotingPower({
          space,
          data: {},
        })
      );
    });
  }, [dispatch]);

  return [fetch, clear] as const;
}

export default function GuvnorDelegationsUpdater() {
  const guvnorDelegators = useAppSelector(
    (s) => s._guvnor.delegations.delegators
  );
  const account = useAccount();

  const [fetchDelegates, clearDelegates] = useFetchGuvnorDelegates();
  const [fetchDelgators, clearDelegators] = useFetchGuvnorDelegators();
  const [fetchNFTVP, clearNFTVP] = useFetchNFTVotingPower();
  const [fetchHordeVP, clearHordeVP] = useFetchHordeVotingPower();

  const numUsers = Object.values(guvnorDelegators.users).reduce(
    (prev, curr) => {
      const addresses = Object.keys(curr);
      prev += addresses.length;
      return prev;
    },
    0
  );

  const numVP = Object.values(guvnorDelegators.votingPower).reduce(
    (prev, curr) => {
      const addresses = Object.keys(curr);
      prev += addresses.length;
      return prev;
    },
    0
  );

  const fetchVP = numUsers !== numVP;

  /// Fetch delegations and delegators
  useEffect(() => {
    if (account) {
      fetchDelegates();
      fetchDelgators();
    }
  }, [account, fetchDelegates, fetchDelgators]);

  /// Fetch Voting Power
  useEffect(() => {
    if (fetchVP) {
      fetchNFTVP();
      fetchHordeVP();
    }
  }, [fetchVP, fetchNFTVP, fetchHordeVP]);

  /// Clear on account change / disconnect
  useEffect(() => {
    if (!account) {
      clearDelegates();
      clearDelegators();
      clearNFTVP();
      clearHordeVP();
    }
  }, [account, clearDelegates, clearDelegators, clearNFTVP, clearHordeVP]);

  return null;
}
