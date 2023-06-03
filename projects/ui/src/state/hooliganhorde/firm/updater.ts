import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  HOOLIGAN_TO_PROSPECTS,
  HOOLIGAN_TO_HORDE,
  ONE_BN,
  TokenMap,
  ZERO_BN,
} from '~/constants';
import { bigNumberResult } from '~/util/Ledger';
import { tokenResult, toStringBaseUnitBN } from '~/util';
import { HOOLIGAN, PROSPECTS, HORDE } from '~/constants/tokens';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useWhitelist from '~/hooks/hooliganhorde/useWhitelist';
import { useGetChainConstant } from '~/hooks/chain/useChainConstant';
import { resetHooliganhordeFirm, updateHooliganhordeFirm } from './actions';
import { HooliganhordeFirmBalance } from './index';

export const useFetchHooliganhordeFirm = () => {
  const dispatch = useDispatch();
  const hooliganhorde = useHooliganhordeContract();
  const WHITELIST = useWhitelist();

  ///
  const getChainConstant = useGetChainConstant();
  const Hooligan = getChainConstant(HOOLIGAN);

  /// Handlers
  const fetch = useCallback(async () => {
    if (hooliganhorde) {
      console.debug(
        '[hooliganhorde/firm/useHooliganhordeFirm] FETCH: whitelist = ',
        WHITELIST
      );

      const [
        // 0
        hordeTotal,
        prospectsTotal,
        rootsTotal,
        earnedHooligansTotal,
        // 4
        whitelistedAssetTotals,
        // 5
        withdrawGamedays,
      ] = await Promise.all([
        // 0
        hooliganhorde.totalHorde().then(tokenResult(HORDE)), // Does NOT include Grown Horde
        hooliganhorde.totalProspects().then(tokenResult(PROSPECTS)), // Does NOT include Recruitable Prospects
        hooliganhorde.totalRoots().then(bigNumberResult), //
        hooliganhorde.totalEarnedHooligans().then(tokenResult(HOOLIGAN)),
        // 4
        Promise.all(
          Object.keys(WHITELIST).map((addr) =>
            Promise.all([
              // FIXME: duplicate tokenResult optimization
              hooliganhorde
                .getTotalDeposited(addr)
                .then(tokenResult(WHITELIST[addr])),
              hooliganhorde
                .getTotalWithdrawn(addr)
                .then(tokenResult(WHITELIST[addr])),
              // HOOLIGAN will always have a fixed BDV of 1, skip to save a network request
              WHITELIST[addr] === Hooligan
                ? ONE_BN
                : hooliganhorde
                    .bdv(addr, toStringBaseUnitBN(1, WHITELIST[addr].decimals))
                    .then(tokenResult(HOOLIGAN))
                    .catch((err) => {
                      console.error(`Failed to fetch BDV: ${addr}`);
                      console.error(err);
                      throw err;
                    }),
            ]).then((data) => ({
              token: addr.toLowerCase(),
              deposited: data[0],
              withdrawn: data[1],
              bdvPerToken: data[2],
            }))
          )
        ),
        // 5
        hooliganhorde.withdrawFreeze().then(bigNumberResult),
      ] as const);

      console.debug('[hooliganhorde/firm/useHooliganhordeFirm] RESULT', [
        hordeTotal,
        prospectsTotal,
        whitelistedAssetTotals[0],
        whitelistedAssetTotals[0].deposited.toString(),
        withdrawGamedays,
      ]);

      // farmableHorde and farmableProspect are derived from farmableHooligans
      // because 1 hooligan = 1 horde, 2 prospects
      const activeHordeTotal = hordeTotal;
      const earnedHordeTotal = earnedHooligansTotal.times(HOOLIGAN_TO_HORDE);
      const earnedProspectTotal = earnedHooligansTotal.times(HOOLIGAN_TO_PROSPECTS);

      /// Aggregate balances
      const balances = whitelistedAssetTotals.reduce((agg, curr) => {
        agg[curr.token] = {
          bdvPerToken: curr.bdvPerToken,
          deposited: {
            amount: curr.deposited,
          },
          withdrawn: {
            amount: curr.withdrawn,
          },
        };

        return agg;
      }, {} as TokenMap<HooliganhordeFirmBalance>);

      // total:   active & inactive
      // active:  owned, actively earning other firm assets
      // earned:  active but not yet deposited into a Gameday
      // grown:   inactive
      dispatch(
        updateHooliganhordeFirm({
          // Balances
          balances,
          // Rewards
          hooligans: {
            earned: earnedHooligansTotal,
            total: balances[Hooligan.address].deposited.amount,
          },
          horde: {
            active: activeHordeTotal,
            earned: earnedHordeTotal,
            grown: ZERO_BN,
            total: activeHordeTotal.plus(ZERO_BN),
          },
          prospects: {
            active: prospectsTotal,
            earned: earnedProspectTotal,
            total: prospectsTotal.plus(earnedProspectTotal),
          },
          roots: {
            total: rootsTotal,
          },
          // Metadata
          withdrawGamedays: withdrawGamedays,
        })
      );
    }
  }, [hooliganhorde, WHITELIST, dispatch, Hooligan]);

  const clear = useCallback(() => {
    console.debug('[hooliganhorde/firm/useHooliganhordeFirm] CLEAR');
    dispatch(resetHooliganhordeFirm());
  }, [dispatch]);

  return [fetch, clear] as const;
};

// -- Updater

const HooliganhordeFirmUpdater = () => {
  const [fetch, clear] = useFetchHooliganhordeFirm();

  useEffect(() => {
    clear();
    fetch();
  }, [clear, fetch]);

  return null;
};

export default HooliganhordeFirmUpdater;
