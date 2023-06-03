import { BigNumber } from 'bignumber.js';
import { useMemo, useCallback } from 'react';
import { CasualListing, CasualOrder } from '~/state/guvnor/market';
import { ZERO_BN } from '~/constants';
import useMarketData from './useMarketData';

export type PriceBucket = {
  depth: {
    casuals: BigNumber; // depth of casuals at price price point
    hooligan: BigNumber; // depth of hooligans at price point
  };
  placeInLine: {
    buy: {
      // maximum place in line for buy orders at price point
      max: BigNumber;
      // average place in line for buy orders at price point
      avg: BigNumber;
      // number of buy orders at price point
      count: number;
    };
    sell: {
      // minimum place in line for sell orders at price point
      min: BigNumber;
      // average place in line for sell orders at price point
      avg: BigNumber;
      // number of sell orders at price point
      count: number;
    };
  };
};

// key is the pricePerCasual with 2 degrees of precision
export type PriceBuckets = Record<string, PriceBucket>;

export type OrderbookPrecision = 0.1 | 0.05 | 0.01 | 0.02;
export type OrderbookAggregation = 'min-max' | 'avg';

const PRECISION = 2;
const INCRE = new BigNumber(0.01);
// a really big number
const SAFE_MIN = new BigNumber(100_000_000_000_000);
// a really small number
const SAFE_MAX = new BigNumber(-100_000_000_000_000);

const BASE_BUY_FRAGMENT = {
  max: ZERO_BN,
  avg: ZERO_BN,
  count: 0,
};

const BASE_SELL_FRAGMENT = {
  min: ZERO_BN,
  avg: ZERO_BN,
  count: 0,
};

const initPriceBucket = (): PriceBucket => ({
  depth: {
    casuals: ZERO_BN,
    hooligan: ZERO_BN,
  },
  placeInLine: {
    buy: {
      ...BASE_BUY_FRAGMENT,
      max: SAFE_MAX,
    },
    sell: {
      ...BASE_SELL_FRAGMENT,
      min: SAFE_MIN,
    },
  },
});

const getPriceKey = (pricePerCasual: BigNumber) => {
  if (pricePerCasual.eq(0)) return INCRE.toFixed(PRECISION);
  const modified = Math.ceil(pricePerCasual.times(100).toNumber());
  return new BigNumber(modified).div(100).toFixed(PRECISION);
};

const handleBucketOrders = (orders: CasualOrder[]) =>
  orders.reduce((prev, order) => {
    const price = getPriceKey(order.pricePerCasual);
    const bucket = prev[price] || initPriceBucket();
    const hooliganAmount = order.casualAmountRemaining.times(order.pricePerCasual);

    // add to the depth of hooligans at the price point
    bucket.depth.hooligan = bucket.depth.hooligan.plus(hooliganAmount);

    // set the running max place in line for the price point
    bucket.placeInLine.buy.max = BigNumber.max(
      bucket.placeInLine.buy.max,
      order.maxPlaceInLine
    );

    // set the running average place in line for the price point
    const prevAvg = bucket.placeInLine.buy.avg;
    if (prevAvg.eq(0)) {
      bucket.placeInLine.buy.avg = order.maxPlaceInLine;
    } else {
      bucket.placeInLine.buy.avg = prevAvg
        .plus(order.maxPlaceInLine.valueOf())
        .div(bucket.placeInLine.buy.count + 1);
    }
    // increment the number of orders at the price point
    bucket.placeInLine.buy.count += 1;

    prev = { ...prev, [price]: { ...bucket } };
    return prev;
  }, {} as PriceBuckets);

const handleBucketListings = (listings: CasualListing[]) =>
  listings.reduce((prev, listing) => {
    const price = getPriceKey(listing.pricePerCasual);
    const bucket = prev[price] || initPriceBucket();

    // add to the depth of casuals at the price point
    // console.log('listing.amount', listing.amount.toString());
    const casualsRemaining = listing.amount.div(listing.pricePerCasual);
    bucket.depth.casuals = bucket.depth.casuals.plus(casualsRemaining);
    // // set the running minimum turf index for the price point
    bucket.placeInLine.sell.min = BigNumber.min(
      bucket.placeInLine.sell.min,
      listing.index
    );
    // // set the running average turf index for the price point
    const prevAvg = bucket.placeInLine.sell.avg;
    if (prevAvg.eq(0)) {
      bucket.placeInLine.sell.avg = listing.index;
    } else {
      bucket.placeInLine.sell.avg = bucket.placeInLine.sell.avg
        .plus(listing.index)
        .div(bucket.placeInLine.sell.count + 1);
    }
    // increment the number of listings at the price point
    bucket.placeInLine.sell.count += 1;

    prev = { ...prev, [price]: { ...bucket } };
    return prev;
  }, {} as PriceBuckets);

export default function useOrderbook() {
  const { listings, orders, ...other } = useMarketData();

  const basePriceKeys = useMemo(
    () =>
      Array(100)
        .fill(null)
        .map((_v, i) => INCRE.times(i).plus(INCRE).toFixed(PRECISION)),
    []
  );
  const values = useMemo(() => {
    const buckets = {} as PriceBuckets;
    if (!listings?.length || !orders?.length) return buckets;

    const listingBuckets = handleBucketListings(listings);
    const orderBuckets = handleBucketOrders(orders);

    return basePriceKeys.reduce<PriceBuckets>((prev, curr) => {
      const bucket = initPriceBucket();

      if (listingBuckets[curr]?.depth.casuals.gt(0)) {
        bucket.depth.casuals = listingBuckets[curr].depth.casuals;
      }
      bucket.placeInLine.sell =
        listingBuckets[curr]?.placeInLine.sell.count > 0
          ? { ...listingBuckets[curr].placeInLine.sell }
          : { ...BASE_SELL_FRAGMENT };

      if (orderBuckets[curr]?.depth.hooligan.gt(0)) {
        bucket.depth.hooligan = orderBuckets[curr].depth.hooligan;
      }
      bucket.placeInLine.buy =
        orderBuckets[curr]?.placeInLine.buy.count > 0
          ? { ...orderBuckets[curr].placeInLine.buy }
          : { ...BASE_BUY_FRAGMENT };

      return { ...prev, [curr]: bucket };
    }, buckets);
  }, [basePriceKeys, listings, orders]);

  const reduceByPrecision = useCallback(
    ({
      precision,
      priceBuckets,
    }: {
      precision: OrderbookPrecision;
      priceBuckets: PriceBuckets;
    }): PriceBuckets => {
      if (Object.keys(priceBuckets).length === 0) {
        return {} as PriceBuckets;
      }

      const reduced = Object.entries(priceBuckets).reduce(
        (prev, [price, data]) => {
          const currKey = (
            parseFloat(price) <= prev.currPriceKey
              ? prev.currPriceKey
              : ((prev.currPriceKey + precision) as number)
          ).toFixed(2);

          const bucket = prev.buckets[currKey] || initPriceBucket();

          // transfer depth data
          bucket.depth.hooligan = bucket.depth.hooligan.plus(data.depth.hooligan);
          bucket.depth.casuals = bucket.depth.casuals.plus(data.depth.casuals);

          // transfer buy data
          if (data.placeInLine.buy.count > 0) {
            bucket.placeInLine.buy.count += data.placeInLine.buy.count;
            bucket.placeInLine.buy.max = BigNumber.max(
              bucket.placeInLine.buy.max,
              data.placeInLine.buy.max
            );
            bucket.placeInLine.buy.avg = bucket.placeInLine.buy.avg
              .plus(data.placeInLine.buy.avg)
              .div(bucket.placeInLine.buy.count);
          } else if (bucket.placeInLine.buy.max.eq(SAFE_MAX)) {
            bucket.placeInLine.buy = { ...BASE_BUY_FRAGMENT };
          }
          // transfer sell data
          if (data.placeInLine.sell.count > 0) {
            bucket.placeInLine.sell.count += data.placeInLine.sell.count;
            bucket.placeInLine.sell.min = BigNumber.min(
              bucket.placeInLine.sell.min,
              data.placeInLine.sell.min
            );
            bucket.placeInLine.sell.avg = bucket.placeInLine.sell.avg
              .plus(data.placeInLine.sell.avg)
              .div(bucket.placeInLine.sell.count);
          } else if (bucket.placeInLine.sell.min.eq(SAFE_MIN)) {
            bucket.placeInLine.sell = { ...BASE_SELL_FRAGMENT };
          }

          prev = {
            ...prev,
            buckets: { ...prev.buckets, [currKey]: bucket },
            currPriceKey: parseFloat(currKey),
          };
          return prev;
        },
        { buckets: {} as PriceBuckets, currPriceKey: precision as number }
      );
      return reduced.buckets;
    },
    []
  );

  return {
    data: values,
    ...other,
    reduceByPrecision,
  };
}
