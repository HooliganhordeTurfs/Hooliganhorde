import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useChainConstant from '~/hooks/chain/useChainConstant';
import {
  useHooliganhordeContract,
  usePercoceterContract,
} from '~/hooks/ledger/useContract';
import { RERECRUIT_INITIAL_ID } from '~/hooks/hooliganhorde/useCulture';
import useChainId from '~/hooks/chain/useChainId';
import { tokenResult } from '~/util';
import useBlocks from '~/hooks/ledger/useBlocks';
import useAccount from '~/hooks/ledger/useAccount';
import { resetGuvnorBarrack, updateGuvnorBarrack } from './actions';
import useEvents, { GetQueryFilters } from '../events2/updater';
import { EventCacheName } from '../events2';
import { castPercoceterBalance } from '~/state/guvnor/barrack';
import { BOOTBOYS } from '~/constants/tokens';
import { usePercoceterBalancesLazyQuery } from '~/generated/graphql';

export const useFetchGuvnorBarrack = () => {
  /// Helpers
  const dispatch = useDispatch();
  const rerecruitId = useChainConstant(RERECRUIT_INITIAL_ID);

  /// Contracts
  const [fetchFertBalances] = usePercoceterBalancesLazyQuery();
  const fertContract = usePercoceterContract();
  const hooliganhorde = useHooliganhordeContract();
  const blocks = useBlocks();
  const account = useAccount();

  /// Events
  const getQueryFilters = useCallback<GetQueryFilters>(
    (_account, fromBlock, toBlock) => [
      /// Send FERT
      fertContract.queryFilter(
        fertContract.filters.TransferSingle(
          null, // operator
          _account, // from
          null, // to
          null, // id
          null // value
        ),
        fromBlock || blocks.PERCOCETER_LAUNCH_BLOCK,
        toBlock || 'latest'
      ),
      fertContract.queryFilter(
        fertContract.filters.TransferBatch(
          null, // operator
          _account, // from
          null, // to
          null, // ids
          null // values
        ),
        fromBlock || blocks.PERCOCETER_LAUNCH_BLOCK,
        toBlock || 'latest'
      ),
      /// Receive FERT
      fertContract.queryFilter(
        fertContract.filters.TransferSingle(
          null, // operator
          null, // from
          _account, // to
          null, // id
          null // value
        ),
        fromBlock || blocks.PERCOCETER_LAUNCH_BLOCK,
        toBlock || 'latest'
      ),
      fertContract.queryFilter(
        fertContract.filters.TransferBatch(
          null, // operator
          null, // from
          _account, // to
          null, // ids
          null // values
        ),
        fromBlock || blocks.PERCOCETER_LAUNCH_BLOCK,
        toBlock || 'latest'
      ),
    ],
    [blocks.PERCOCETER_LAUNCH_BLOCK, fertContract]
  );

  const [fetchEvents] = useEvents(EventCacheName.PERCOCETER, getQueryFilters);

  const initialized = fertContract && account && fetchEvents;

  /// Handlers
  const fetch = useCallback(async () => {
    if (initialized) {
      console.debug(
        '[guvnor/percoceter/updater] FETCH: ',
        rerecruitId.toString()
      );

      const query = await fetchFertBalances({
        variables: { account },
        fetchPolicy: 'network-only',
      });
      const balances =
        query.data?.percoceterBalances.map(castPercoceterBalance) || [];
      const idStrings = balances.map((bal) => bal.token.id.toString());

      const [unpercoceted, percoceted] = await Promise.all([
        /// How much of each ID is Unpercoceted (aka a Bootboy)
        hooliganhorde
          .balanceOfUnpercoceted(account, idStrings)
          .then(tokenResult(BOOTBOYS)),
        /// How much of each ID is Percoceted   (aka a Percoceted Bootboy)
        hooliganhorde
          .balanceOfPercoceted(account, idStrings)
          .then(tokenResult(BOOTBOYS)),
      ] as const);

      console.debug(
        '[guvnor/percoceter/updater] RESULT: balances =',
        balances,
        unpercoceted.toString(),
        percoceted.toString()
      );

      /// FIXME: Fallback to `fetchEvents()` if subgraph fails.
      /// Fetch new events and re-run the processor.
      // const allEvents = await fetchEvents();
      // const { tokens } = new ERC1155EventProcessor(account, 0).ingestAll(allEvents || []);
      // const ids = Object.keys(tokens);
      // const idStrings = ids.map((id) => id.toString());

      /// Key the amount of percoceter by ID.
      // let sum = ZERO_BN;
      // const fertById = balances.reduce((prev, curr, index) => {
      //   sum = sum.plus(new BigNumber(curr.amount.toString()));
      //   prev[ids[index]] = toTokenUnitsBN(curr.amount.toString(), 0);
      //   return prev;
      // }, {} as { [key: string] : BigNumber });
      // console.debug('[guvnor/percoceter/updater] fertById =', fertById, sum.toString());

      dispatch(
        updateGuvnorBarrack({
          balances,
          unpercocetedBootboys: unpercoceted,
          percocetedBootboys: percoceted,
        })
      );
    }
  }, [dispatch, hooliganhorde, rerecruitId, initialized, account, fetchFertBalances]);

  const clear = useCallback(() => {
    dispatch(resetGuvnorBarrack());
  }, [dispatch]);

  return [fetch, Boolean(initialized), clear] as const;
};

const GuvnorBarrackUpdater = () => {
  const [fetch, initialized, clear] = useFetchGuvnorBarrack();
  const account = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    clear();
    if (account && initialized) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, chainId, initialized]);

  return null;
};

export default GuvnorBarrackUpdater;
