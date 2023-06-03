import { useCallback, useEffect, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import useCastApolloQuery from '~/hooks/app/useCastApolloQuery';
import {
  CasualListing,
  castCasualListing,
  CasualOrder,
  castCasualOrder,
  PricingTypes,
  PricingFunctions,
} from '~/state/guvnor/market';
import {
  MarketStatus,
  useGuvnorCasualListingsLazyQuery,
  useGuvnorCasualOrdersLazyQuery,
} from '../../../generated/graphql';

import useAccount from '~/hooks/ledger/useAccount';
import useDraftableIndex from '../../hooliganhorde/useDraftableIndex';
import { ZERO_BN } from '~/constants';

/**
 * A single interface for items in the "Your Orders" tab.
 */
export type GuvnorMarketOrder = {
  /// ///////////// Identifiers ////////////////

  id: string;
  action: 'buy' | 'sell';
  type: 'order' | 'listing';
  source: CasualListing | CasualOrder;

  /// ///////////// Pricing ////////////////

  pricingType: PricingTypes;
  pricePerCasual: BigNumber;
  pricingFunction: PricingFunctions;

  /// ///////////// Columns ////////////////

  /**
   * Order: # of Casuals that could be acquired if the Order is completely Filled
   * Listing: # of Casuals in the initial listing
   */
  amountCasuals: BigNumber;
  amountCasualsFilled: BigNumber;

  /**
   * Order: # of Hooligans that were put into the order initially
   * Listing: # of Hooligans that could be received if Listing is completely Filled
   */
  amountHooligans: BigNumber;
  amountHooligansFilled: BigNumber;

  /**
   * Order: 0 to `max place in line`
   * Listing': `index - draftable index`
   */
  placeInLine: BigNumber;

  /**
   * Percentage filled.
   */
  fillPct: BigNumber;

  /**
   * Order: 0 (orders don't have an expiry)
   * Listing: max draftable index minus draftable index
   */
  expiry: BigNumber;

  /// ///////////// Metadata ////////////////

  status: MarketStatus;
  createdAt: string;
  creationHash: string;
};

const castOrderToHistoryItem = (order: CasualOrder): GuvnorMarketOrder => ({
  // Identifiers
  id: order.id,
  action: 'buy',
  type: 'order',
  source: order,

  // Pricing
  pricingType: order.pricingType,
  pricePerCasual: order.pricePerCasual,
  pricingFunction: null,

  // Columns
  amountCasuals: order.casualAmount,
  amountCasualsFilled: order.casualAmountFilled,
  amountHooligans: order.casualAmount.times(order.pricePerCasual),
  amountHooligansFilled: order.casualAmountFilled.times(order.pricePerCasual),
  placeInLine: order.maxPlaceInLine,
  fillPct: order.casualAmountFilled.div(order.casualAmount).times(100),
  expiry: ZERO_BN, // casual orders don't expire

  // Metadata
  status: order.status,
  createdAt: order.createdAt,
  creationHash: order.creationHash,
});

const castListingToHistoryItem = (listing: CasualListing): GuvnorMarketOrder => ({
  // Identifiers
  id: listing.id,
  action: 'sell',
  type: 'listing',
  source: listing,

  // Pricing
  pricingType: listing.pricingType,
  pricePerCasual: listing.pricePerCasual,
  pricingFunction: null,

  // Columns
  amountCasuals: listing.originalAmount,
  amountCasualsFilled: listing.filled,
  amountHooligans: listing.originalAmount.times(listing.pricePerCasual),
  amountHooligansFilled: listing.filled.times(listing.pricePerCasual),
  placeInLine: listing.placeInLine,
  fillPct: listing.filled.div(listing.originalAmount).times(100),
  expiry: listing.expiry,

  // Metadata
  status: listing.status,
  createdAt: listing.createdAt,
  creationHash: listing.creationHash,
});

export function useFetchGuvnorMarketItems() {
  const account = useAccount();

  const [fetchListings, listingsQuery] = useGuvnorCasualListingsLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-only',
    notifyOnNetworkStatusChange: true,
  });
  const [fetchOrders, ordersQuery] = useGuvnorCasualOrdersLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-only',
    notifyOnNetworkStatusChange: true,
  });

  return {
    listingsQuery,
    ordersQuery,
    fetch: useCallback(() => {
      if (!account) return;
      const opts = {
        variables: {
          account: account.toLowerCase(),
          createdAt_gt: 0,
        },
      };
      fetchListings(opts);
      fetchOrders(opts);
    }, [account, fetchListings, fetchOrders]),
  };
}

const MARKET_STATUS_TO_ORDER = {
  [MarketStatus.Active]: 0,
  [MarketStatus.Expired]: 1,
  [MarketStatus.Filled]: 2,
  [MarketStatus.FilledPartial]: 3,
  [MarketStatus.Cancelled]: 4,
  [MarketStatus.CancelledPartial]: 5,
};

export default function useGuvnorMarket() {
  const draftableIndex = useDraftableIndex();
  const { fetch, listingsQuery, ordersQuery } = useFetchGuvnorMarketItems();

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Cast query data to decimal form
  const listingItems = useCastApolloQuery<GuvnorMarketOrder>(
    listingsQuery,
    'casualListings',
    useCallback(
      (l) => castListingToHistoryItem(castCasualListing(l, draftableIndex)),
      [draftableIndex]
    )
  );
  const orderItems = useCastApolloQuery<GuvnorMarketOrder>(
    ordersQuery,
    'casualOrders',
    useCallback((o) => castOrderToHistoryItem(castCasualOrder(o)), [])
  );

  // Cast query data to history item form
  const data = useMemo(
    () =>
      // shortcut to check if listings / orders are still loading
      [...(listingItems || []), ...(orderItems || [])].sort((a, b) => {
        // Sort by MARKET_STATUS_TO_ORDER, then by creation date
        const x =
          MARKET_STATUS_TO_ORDER[a.status] - MARKET_STATUS_TO_ORDER[b.status];
        if (x !== 0) return x;
        return parseInt(b.createdAt, 10) - parseInt(a.createdAt, 10);
      }),
    [listingItems, orderItems]
  );

  return {
    data,
    loading: listingsQuery.loading || ordersQuery.loading,
  };
}
