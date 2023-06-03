import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import BigNumber from 'bignumber.js';
import { HOOLIGAN_TO_PROSPECTS, HOOLIGAN_TO_HORDE, ZERO_BN } from '~/constants';
import { HOOLIGAN, PROSPECTS, HORDE } from '~/constants/tokens';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useChainId from '~/hooks/chain/useChainId';
import { bigNumberResult, tokenResult } from '~/util';
import useBlocks from '~/hooks/ledger/useBlocks';
import useAccount from '~/hooks/ledger/useAccount';
import EventProcessor from '~/lib/Hooliganhorde/EventProcessor';
import useWhitelist from '~/hooks/hooliganhorde/useWhitelist';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { DepositCrate } from '.';
import { EventCacheName } from '../events2';
import useEvents, { GetQueryFilters } from '../events2/updater';
import {
  resetGuvnorFirm,
  updateGuvnorFirmBalances,
  UpdateGuvnorFirmBalancesPayload,
  updateGuvnorFirmRewards,
} from './actions';

export const useFetchGuvnorFirm = () => {
  /// Helpers
  const dispatch = useDispatch();

  /// Contracts
  const hooliganhorde = useHooliganhordeContract();

  /// Data
  const account = useAccount();
  const blocks = useBlocks();
  const whitelist = useWhitelist();
  const gameday = useGameday();

  /// Events
  const getQueryFilters = useCallback<GetQueryFilters>(
    (_account, fromBlock, toBlock) => [
      // Firm (Generalized v2)
      hooliganhorde.queryFilter(
        hooliganhorde.filters.AddDeposit(_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.AddWithdrawal(_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.RemoveWithdrawal(_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.RemoveWithdrawals(_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.RemoveDeposit(_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.RemoveDeposits(_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
    ],
    [hooliganhorde, blocks.HOOLIGANHORDE_GENESIS_BLOCK]
  );

  const [fetchFirmEvents] = useEvents(EventCacheName.FIRM, getQueryFilters);

  ///
  const initialized = !!(
    hooliganhorde &&
    account &&
    fetchFirmEvents &&
    gameday?.gt(0)
  );

  /// Handlers
  const fetch = useCallback(async () => {
    if (initialized) {
      console.debug('[guvnor/firm/useGuvnorFirm] FETCH');

      const [
        hordeBalance,
        grownHordeBalance,
        prospectBalance,
        rootBalance,
        earnedHooliganBalance,
        lastUpdate,
        allEvents = [],
      ] = await Promise.all([
        // FIXME: multicall this section
        /// balanceOfHorde() returns `horde + earnedHorde`
        hooliganhorde.balanceOfHorde(account).then(tokenResult(HORDE)),
        hooliganhorde.balanceOfGrownHorde(account).then(tokenResult(HORDE)),
        hooliganhorde.balanceOfProspects(account).then(tokenResult(PROSPECTS)),
        hooliganhorde.balanceOfRoots(account).then(bigNumberResult),
        hooliganhorde.balanceOfEarnedHooligans(account).then(tokenResult(HOOLIGAN)),
        hooliganhorde.lastUpdate(account).then(bigNumberResult),
        fetchFirmEvents(),
      ] as const);

      // console.debug('[guvnor/firm/useGuvnorFirm] RESULT', [
      //   hordeBalance.toString(),
      //   prospectBalance.toString(),
      //   rootBalance.toString(),
      //   earnedHooliganBalance.toString(),
      //   grownHordeBalance.toString(),
      // ]);

      /// horde + earnedHorde (bundled together at the contract level)
      const activeHordeBalance = hordeBalance;
      /// earnedHorde (this is already included in activeHorde)
      const earnedHordeBalance = earnedHooliganBalance.times(HOOLIGAN_TO_HORDE);
      /// earnedProspect  (aka recruitable prospects)
      const earnedProspectBalance = earnedHooliganBalance.times(HOOLIGAN_TO_PROSPECTS);

      // total:   active & inactive
      // active:  owned, actively earning other firm assets
      // earned:  active but not yet deposited into a Gameday
      // grown:   inactive
      dispatch(
        updateGuvnorFirmRewards({
          hooligans: {
            earned: earnedHooliganBalance,
          },
          horde: {
            active: activeHordeBalance,
            earned: earnedHordeBalance,
            grown: grownHordeBalance,
            total: activeHordeBalance.plus(grownHordeBalance),
          },
          prospects: {
            active: prospectBalance,
            earned: earnedProspectBalance,
            total: prospectBalance.plus(earnedProspectBalance),
          },
          roots: {
            total: rootBalance,
          },
        })
      );

      const p = new EventProcessor(account, { gameday, whitelist });
      const results = p.ingestAll(allEvents);

      dispatch(
        updateGuvnorFirmBalances(
          Object.keys(whitelist).reduce<UpdateGuvnorFirmBalancesPayload>(
            (prev, addr) => {
              prev[addr] = {
                lastUpdate: lastUpdate,
                deposited: {
                  ...Object.keys(results.deposits[addr]).reduce(
                    (dep, s) => {
                      const crate = results.deposits[addr][s];
                      const bdv = crate.bdv;
                      dep.amount = dep.amount.plus(crate.amount);
                      dep.bdv = dep.bdv.plus(bdv);
                      dep.crates.push({
                        gameday: new BigNumber(s),
                        amount: crate.amount,
                        bdv: bdv,
                        horde: whitelist[addr].getHorde(bdv),
                        prospects: whitelist[addr].getProspects(bdv),
                      });
                      return dep;
                    },
                    {
                      amount: ZERO_BN,
                      bdv: ZERO_BN,
                      crates: [] as DepositCrate[],
                    }
                  ),
                },
                // Splits into 'withdrawn' and 'claimable'
                ...p.parseWithdrawals(addr, gameday),
              };
              return prev;
            },
            {}
          )
        )
      );
    }
  }, [
    dispatch,
    fetchFirmEvents,
    hooliganhorde,
    gameday,
    whitelist,
    account,
    initialized,
  ]);

  const clear = useCallback(() => {
    console.debug('[guvnor/firm/useGuvnorFirm] CLEAR');
    dispatch(resetGuvnorFirm());
  }, [dispatch]);

  return [fetch, initialized, clear] as const;
};

// -- Updater

const GuvnorFirmUpdater = () => {
  const [fetch, initialized, clear] = useFetchGuvnorFirm();
  const account = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    clear();
    if (account && initialized) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, chainId, initialized]);

  return null;
};

export default GuvnorFirmUpdater;
