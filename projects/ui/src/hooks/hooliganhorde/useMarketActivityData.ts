import BigNumber from 'bignumber.js';
import { useCallback, useState, useEffect } from 'react';
import keyBy from 'lodash/keyBy';
import {
  useHistoricalCasualListingsLazyQuery,
  useHistoricalCasualOrdersLazyQuery,
  useMarketEventsLazyQuery,
} from '~/generated/graphql';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import { toTokenUnitsBN } from '~/util';
import { HOOLIGAN } from '~/constants/tokens';
import useFirmTokenToFiat from '~/hooks/hooliganhorde/useFirmTokenToFiat';

export type MarketEvent = {
  // the entity that the event referred to
  id: string;
  // the individual event id, usually includes txn hash
  eventId: string;
  type: 'listing' | 'order';
  action: 'create' | 'cancel' | 'fill';
  amountCasuals: BigNumber;
  placeInLine: BigNumber;
  pricePerCasual: BigNumber;
  amountHooligans: BigNumber;
  amountUSD: BigNumber;
  createdAt: number;
  hash: string;
};

export const QUERY_AMOUNT = 500;
export const MAX_TIMESTAMP = '9999999999999'; // 166 455 351 3803

/**
 * Load historical market activity. This merges raw event date from `eventsQuery`
 * with parsed data from `ordersQuery` and `listingsQuery`.
 */
const useMarketActivityData = () => {
  /// Hooliganhorde data
  const draftableIndex = useDraftableIndex();
  const getUSD = useFirmTokenToFiat();

  ///
  const [page, setPage] = useState<number>(0);
  const [data, setData] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /// Queries
  const [getMarketEvents, marketEventsQuery] = useMarketEventsLazyQuery({
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    variables: {
      events_first: QUERY_AMOUNT,
      events_timestamp_lt: MAX_TIMESTAMP,
    },
  });
  const [getCasualOrders, casualOrdersQuery] = useHistoricalCasualOrdersLazyQuery({
    fetchPolicy: 'network-only',
  });
  const [getCasualListings, casualListingsQuery] = useHistoricalCasualListingsLazyQuery({
    fetchPolicy: 'network-only',
  });

  const error =
    marketEventsQuery.error || casualOrdersQuery.error || casualListingsQuery.error;

  // fetch
  const _fetch = useCallback(
    async (first: number, after: string) => {
      setLoading(true);
      setPage((p) => p + 1);
      const result = await getMarketEvents({
        variables: { events_first: first, events_timestamp_lt: after },
      });

      // run join query if we loaded more market events
      if (result.data?.marketEvents.length) {
        // find IDs to join against
        const [orderIDs, listingIDs] = result.data.marketEvents.reduce<
          [string[], string[]]
        >(
          (prev, curr) => {
            if (
              curr.__typename === 'CasualOrderFilled' ||
              curr.__typename === 'CasualOrderCancelled'
            ) {
              prev[0].push(curr.historyID);
            } else if (
              curr.__typename === 'CasualListingFilled' ||
              curr.__typename === 'CasualListingCancelled'
            ) {
              prev[1].push(curr.historyID);
            }
            return prev;
          },
          [[], []]
        );

        // lookup all of the orders and listings needed to join to the above query
        await Promise.all([
          getCasualOrders({
            variables: {
              historyIDs: orderIDs,
            },
          }),
          getCasualListings({
            variables: {
              historyIDs: listingIDs,
            },
          }),
        ]);
      }

      setLoading(false);
    },
    [getMarketEvents, getCasualListings, getCasualOrders]
  );

  // look up the next set of marketplaceEvents using the last known timestamp
  const fetchMoreData = useCallback(async () => {
    const first = QUERY_AMOUNT;
    const after = marketEventsQuery.data?.marketEvents?.length
      ? marketEventsQuery.data?.marketEvents[
          marketEventsQuery.data?.marketEvents.length - 1
        ].createdAt
      : MAX_TIMESTAMP;
    console.debug('Fetch more: ', first, after);
    await _fetch(first, after);
  }, [_fetch, marketEventsQuery.data?.marketEvents]);

  // when all queries finish, process data
  useEffect(() => {
    const events = marketEventsQuery.data?.marketEvents;
    if (!loading && events?.length) {
      const casualOrdersById = keyBy(casualOrdersQuery.data?.casualOrders, 'historyID');
      const casualListingsById = keyBy(
        casualListingsQuery.data?.casualListings,
        'historyID'
      );

      // FIXME:
      // This duplicates logic from `castCasualListing` and `castCasualOrder`.
      // The `marketplaceEvent` entity contains partial information about
      // Orders and Listings during Creation, but NO information during cancellations
      // and fills. In both cases, casting doesn't work because of missing data.
      const parseEvent = (e: typeof events[number]) => {
        switch (e.__typename) {
          case 'CasualOrderCreated': {
            const pricePerCasual = toTokenUnitsBN(e.pricePerCasual, HOOLIGAN[1].decimals);
            const amount = toTokenUnitsBN(e.amount, HOOLIGAN[1].decimals);
            const placeInLine = toTokenUnitsBN(
              e.maxPlaceInLine,
              HOOLIGAN[1].decimals
            );
            // HOTFIX: amountCasuals is using the legacy hooligan amount format for these events
            const amountCasuals = amount;
            const amountHooligans = amount.multipliedBy(pricePerCasual);
            return <MarketEvent>{
              id: 'unknown',
              eventId: e.id,
              hash: e.hash,
              type: 'order' as const,
              action: 'create' as const,
              amountCasuals: amountCasuals,
              placeInLine: placeInLine,
              pricePerCasual: pricePerCasual,
              amountHooligans: amountHooligans,
              amountUSD: getUSD(HOOLIGAN[1], amountHooligans),
              createdAt: e.createdAt,
            };
          }
          case 'CasualOrderCancelled': {
            // HOTFIX: Fixes edge case where CasualOrderCancelled is emitted for an order that doesn't actually exist.
            const casualOrder = casualOrdersById[e.historyID];
            if (!e.historyID || !casualOrder) return null;

            const casualAmount = toTokenUnitsBN(
              casualOrder.casualAmount || 0,
              HOOLIGAN[1].decimals
            );
            const pricePerCasual = toTokenUnitsBN(
              new BigNumber(casualOrder.pricePerCasual || 0),
              HOOLIGAN[1].decimals
            );
            const totalHooligans =
              casualAmount && pricePerCasual
                ? casualAmount.multipliedBy(pricePerCasual)
                : undefined;

            return <MarketEvent>{
              id: casualOrder.id,
              eventId: e.id,
              hash: e.hash,
              type: 'order' as const,
              action: 'cancel' as const,
              amountCasuals: toTokenUnitsBN(casualOrder?.casualAmount, HOOLIGAN[1].decimals),
              placeInLine: toTokenUnitsBN(
                casualOrder?.maxPlaceInLine,
                HOOLIGAN[1].decimals
              ),
              pricePerCasual: toTokenUnitsBN(
                new BigNumber(casualOrder?.pricePerCasual || 0),
                HOOLIGAN[1].decimals
              ),
              amountHooligans: totalHooligans,
              amountUSD: totalHooligans ? getUSD(HOOLIGAN[1], totalHooligans) : undefined,
              createdAt: e.createdAt,
            };
          }
          case 'CasualOrderFilled': {
            // HOTFIX: Fixes edge case where CasualOrderCancelled is emitted for an order that doesn't actually exist.
            const casualOrder = casualOrdersById[e.historyID];
            if (!e.historyID || !casualOrder) return null;

            const pricePerCasual = toTokenUnitsBN(
              new BigNumber(casualOrder.pricePerCasual || 0),
              HOOLIGAN[1].decimals
            );
            const casualAmountFilled = toTokenUnitsBN(
              casualOrder.casualAmountFilled,
              HOOLIGAN[1].decimals
            );
            const totalHooligans = getUSD(
              HOOLIGAN[1],
              casualAmountFilled.multipliedBy(pricePerCasual)
            );
            return <MarketEvent>{
              id: casualOrder.id,
              eventId: e.id,
              hash: e.hash,
              type: 'order' as const,
              action: 'fill' as const,
              amountCasuals: casualAmountFilled,
              placeInLine: toTokenUnitsBN(
                new BigNumber(e.index),
                HOOLIGAN[1].decimals
              ).minus(draftableIndex),
              pricePerCasual: pricePerCasual,
              amountHooligans: totalHooligans,
              amountUSD: getUSD(HOOLIGAN[1], totalHooligans),
              createdAt: e.createdAt,
            };
          }
          case 'CasualListingCreated': {
            const numCasuals = toTokenUnitsBN(e.amount, HOOLIGAN[1].decimals);
            const pricePerCasual = toTokenUnitsBN(e.pricePerCasual, HOOLIGAN[1].decimals);
            const totalHooligans = numCasuals.multipliedBy(pricePerCasual);
            return <MarketEvent>{
              id: e.historyID.split('-')[1],
              eventId: e.id,
              hash: e.hash,
              type: 'listing' as const,
              action: 'create' as const,
              amountCasuals: numCasuals,
              placeInLine: toTokenUnitsBN(e.index, HOOLIGAN[1].decimals).minus(
                draftableIndex
              ),
              pricePerCasual: pricePerCasual,
              amountHooligans: totalHooligans,
              amountUSD: getUSD(HOOLIGAN[1], totalHooligans),
              createdAt: e.createdAt,
            };
          }
          case 'CasualListingCancelled': {
            const casualListing = casualListingsById[e.historyID];
            if (!e.historyID || !casualListing) return null;

            const numCasuals = toTokenUnitsBN(casualListing.amount, HOOLIGAN[1].decimals);
            const pricePerCasual = toTokenUnitsBN(
              new BigNumber(casualListing.pricePerCasual || 0),
              HOOLIGAN[1].decimals
            );
            const totalHooligans = numCasuals.multipliedBy(pricePerCasual);

            return <MarketEvent>{
              id: e.historyID.split('-')[1],
              eventId: e.id,
              hash: e.hash,
              type: 'listing' as const,
              action: 'cancel' as const,
              amountCasuals: numCasuals,
              placeInLine: toTokenUnitsBN(
                casualListing?.index,
                HOOLIGAN[1].decimals
              ).minus(draftableIndex),
              pricePerCasual: pricePerCasual,
              amountHooligans: totalHooligans,
              amountUSD: getUSD(HOOLIGAN[1], totalHooligans),
              createdAt: e.createdAt,
            };
          }
          case 'CasualListingFilled': {
            const casualListing = casualListingsById[e.historyID];
            if (!e.historyID || !casualListing) return null;

            const numCasualsFilled = toTokenUnitsBN(
              casualListing?.filledAmount,
              HOOLIGAN[1].decimals
            );
            const pricePerCasual = toTokenUnitsBN(
              new BigNumber(casualListing?.pricePerCasual || 0),
              HOOLIGAN[1].decimals
            );
            const totalHooligans = numCasualsFilled.multipliedBy(pricePerCasual);
            return <MarketEvent>{
              id: e.historyID.split('-')[1],
              eventId: e.id,
              hash: e.hash,
              type: 'listing' as const,
              action: 'fill' as const,
              amountCasuals: numCasualsFilled,
              placeInLine: toTokenUnitsBN(
                casualListing?.index,
                HOOLIGAN[1].decimals
              ).minus(draftableIndex),
              pricePerCasual: pricePerCasual,
              amountHooligans: totalHooligans,
              amountUSD: getUSD(HOOLIGAN[1], totalHooligans),
              createdAt: e.createdAt,
            };
          }
          default: {
            return null;
          }
        }
      };

      const _data: MarketEvent[] = [];
      const _max = Math.min(events.length, QUERY_AMOUNT * page);
      for (let i = 0; i < _max; i += 1) {
        const parsed = parseEvent(events[i]);
        if (parsed) _data.push(parsed);
      }

      setData(_data);
    }
  }, [
    getUSD,
    draftableIndex,
    loading,
    marketEventsQuery.data,
    casualListingsQuery.data,
    casualOrdersQuery.data,
    page,
  ]);

  // kick things off
  useEffect(() => {
    _fetch(QUERY_AMOUNT, MAX_TIMESTAMP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    draftableIndex,
    loading,
    error,
    fetchMoreData,
    page,
  };
};

export default useMarketActivityData;
