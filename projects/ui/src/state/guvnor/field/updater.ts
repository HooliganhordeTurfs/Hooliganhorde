import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useChainId from '~/hooks/chain/useChainId';
import useBlocks from '~/hooks/ledger/useBlocks';
import useAccount from '~/hooks/ledger/useAccount';
import EventProcessor from '~/lib/Hooliganhorde/EventProcessor';
import useWhitelist from '~/hooks/hooliganhorde/useWhitelist';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import { EventCacheName } from '../events2';
import useEvents, { GetQueryFilters } from '../events2/updater';
import { updateGuvnorField, resetGuvnorField } from './actions';

export const useFetchGuvnorField = () => {
  /// Helpers
  const dispatch = useDispatch();

  /// Contracts
  const hooliganhorde = useHooliganhordeContract();

  /// Data
  const account = useAccount();
  const blocks = useBlocks();
  const whitelist = useWhitelist();
  const gameday = useGameday();
  const draftableIndex = useDraftableIndex();

  /// Events
  const getQueryFilters = useCallback<GetQueryFilters>(
    (_account, fromBlock, toBlock) => [
      hooliganhorde.queryFilter(
        hooliganhorde.filters['Sow(address,uint256,uint256,uint256)'](_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.Draft(_account),
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.TurfTransfer(_account, null), // from
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
      hooliganhorde.queryFilter(
        hooliganhorde.filters.TurfTransfer(null, _account), // to
        fromBlock || blocks.HOOLIGANHORDE_GENESIS_BLOCK,
        toBlock || 'latest'
      ),
    ],
    [blocks, hooliganhorde]
  );

  const [fetchFieldEvents] = useEvents(EventCacheName.FIELD, getQueryFilters);

  const initialized = account && fetchFieldEvents && draftableIndex.gt(0); // draftedableIndex is initialized to 0

  /// Handlers
  const fetch = useCallback(async () => {
    if (initialized) {
      const allEvents = await fetchFieldEvents();
      if (!allEvents) return;

      const p = new EventProcessor(account, { gameday, whitelist });
      p.ingestAll(allEvents);

      dispatch(updateGuvnorField(p.parseTurfs(draftableIndex)));
    }
  }, [
    dispatch,
    fetchFieldEvents,
    initialized,
    // v2
    gameday,
    whitelist,
    account,
    draftableIndex,
  ]);

  const clear = useCallback(() => {
    console.debug('[guvnor/firm/useGuvnorFirm] CLEAR');
    dispatch(resetGuvnorField());
  }, [dispatch]);

  return [fetch, Boolean(initialized), clear] as const;
};

// -- Updater

const GuvnorFieldUpdater = () => {
  const [fetch, initialized, clear] = useFetchGuvnorField();
  const account = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    clear();
    if (account && initialized) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, chainId, initialized]);

  return null;
};

export default GuvnorFieldUpdater;
