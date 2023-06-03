import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import BigNumber from 'bignumber.js';
import {
  resetHooliganhordeGovernance,
  updateActiveProposals,
  updateMultisigBalances,
} from './actions';
import { useProposalsLazyQuery } from '~/generated/graphql';
import { AddressMap, MULTISIGS } from '~/constants';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useChainConstant from '~/hooks/chain/useChainConstant';
import { HOOLIGAN } from '~/constants/tokens';
import { tokenResult } from '~/util';
import { SNAPSHOT_SPACES } from '~/lib/Hooliganhorde/Governance';

export const useFetchHooliganhordeGovernance = () => {
  const dispatch = useDispatch();
  const hooliganhorde = useHooliganhordeContract();
  const Hooligan = useChainConstant(HOOLIGAN);
  const [getProposals] = useProposalsLazyQuery({
    variables: {
      space_in: SNAPSHOT_SPACES,
      state: 'active',
    },
    fetchPolicy: 'network-only',
    context: { subgraph: 'snapshot' },
  });

  /// Handlers
  const fetch = useCallback(async () => {
    if (hooliganhorde) {
      const [proposalsResult, multisigBalances] = await Promise.all([
        getProposals(),
        Promise.all(
          MULTISIGS.map((address) =>
            hooliganhorde.getBalance(address, Hooligan.address).then(tokenResult(HOOLIGAN))
          )
        ),
      ]);

      // Update proposals
      if (Array.isArray(proposalsResult.data?.proposals)) {
        dispatch(
          updateActiveProposals(
            proposalsResult
              .data!.proposals /// HACK:
              /// The snapshot.org graphql API defines that the proposals
              /// array can have `null` elements. I believe this shouldn't
              /// be allowed, but to fix we check for null values and manually
              /// assert existence of `p`.
              .filter((p) => p !== null)
              .map((p) => ({
                id: p!.id,
                title: p!.title,
                start: p!.start,
                end: p!.end,
              }))
          )
        );
      }

      // Update multisig balances
      if (multisigBalances?.length > 0) {
        dispatch(
          updateMultisigBalances(
            MULTISIGS.reduce<AddressMap<BigNumber>>((prev, address, index) => {
              prev[address] = multisigBalances[index];
              return prev;
            }, {})
          )
        );
      }
    }
  }, [hooliganhorde, getProposals, Hooligan.address, dispatch]);

  const clear = useCallback(() => {
    console.debug('[hooliganhorde/governance/useHooliganhordeGovernance] CLEAR');
    dispatch(resetHooliganhordeGovernance());
  }, [dispatch]);

  return [fetch, clear] as const;
};

// -- Updater

const GovernanceUpdater = () => {
  const [fetch, clear] = useFetchHooliganhordeGovernance();

  useEffect(() => {
    clear();
    fetch();
  }, [clear, fetch]);

  return null;
};

export default GovernanceUpdater;
