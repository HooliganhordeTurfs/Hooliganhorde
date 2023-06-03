import BigNumber from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { MarketStatus, useAllCasualOrdersQuery } from '~/generated/graphql';
import useCastApolloQuery from '~/hooks/app/useCastApolloQuery';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import useCasualListings from '~/hooks/hooliganhorde/useCasualListings';
import {
  castCasualListing,
  castCasualOrder,
  CasualListing,
  CasualOrder,
} from '~/state/guvnor/market';

const MIN_CASUAL_AMOUNT = 1;

const useMarketData = () => {
  /// Hooliganhorde data
  const draftableIndex = useDraftableIndex();

  /// Queries
  const listingsQuery = useCasualListings({
    variables: { status: MarketStatus.Active },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });
  const ordersQuery = useAllCasualOrdersQuery({
    variables: { status: MarketStatus.Active },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  /// Query status
  const loading = listingsQuery.loading || ordersQuery.loading;
  const error = listingsQuery.error || ordersQuery.error;

  /// Cast query data to BigNumber, etc.
  const listings = useCastApolloQuery<CasualListing>(
    listingsQuery,
    'casualListings',
    useCallback(
      (_listing) => castCasualListing(_listing, draftableIndex),
      [draftableIndex]
    ),
    loading
  );
  let orders = useCastApolloQuery<CasualOrder>(
    ordersQuery,
    'casualOrders',
    castCasualOrder,
    loading
  );
  orders = orders?.filter((order) =>
    order.hooliganAmountRemaining.gt(MIN_CASUAL_AMOUNT)
  );

  /// Calculations
  const maxPlaceInLine = useMemo(
    () =>
      listings
        ? Math.max(
            ...listings.map((l) =>
              new BigNumber(l.index).minus(draftableIndex).toNumber()
            )
          )
        : 0,
    [draftableIndex, listings]
  );
  const maxTurfSize = useMemo(
    () =>
      listings
        ? Math.max(
            ...listings.map((l) => new BigNumber(l.remainingAmount).toNumber())
          )
        : 0,
    [listings]
  );

  return {
    listings,
    orders,
    maxPlaceInLine,
    maxTurfSize,
    draftableIndex,
    loading,
    error,
  };
};

export default useMarketData;
