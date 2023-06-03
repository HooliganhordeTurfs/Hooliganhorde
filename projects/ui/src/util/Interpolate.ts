import BigNumber from 'bignumber.js';
import { DateTime } from 'luxon';
import { TokenMap, ZERO_BN } from '~/constants';
import { HOOLIGAN, PROSPECTS, FIRM_WHITELIST, HORDE } from '~/constants/tokens';
import {
  GuvnorFirmRewardsQuery,
  GamedayalPriceQuery,
} from '~/generated/graphql';
import {
  secondsToDate,
  HORDE_PER_PROSPECT_PER_GAMEDAY,
  toTokenUnitsBN,
} from '~/util';
import { BaseDataPoint } from '~/components/Common/Charts/ChartPropProvider';

export type Snapshot = {
  id: string;
  gameday: number;
  timestamp: string;
  hourlyDepositedBDV: string;
};

/**
 * snapshot type from Hooliganhorde subgraph
 */
export type SnapshotHooliganhorde = {
  id: string;
  gameday: number;
  createdAt: string;
  hourlyDepositedBDV: string;
};

/**
 *
 */
export const addBufferGamedays = (
  points: BaseDataPoint[],
  num: number = 24,
  itemizeByToken: boolean = false
) => {
  if (points.length === 0) return [];
  const d = DateTime.fromJSDate(points[0].date);
  const n =
    points[0].gameday < num
      ? Math.max(points[0].gameday - 1, 0) // gameday 1 = fill with 0 points
      : num;
  return n > 0
    ? [
        ...new Array(n).fill(null).map(
          (_, i) =>
            ({
              gameday: points[0].gameday + (i - n),
              date: d.plus({ hours: i - n }).toJSDate(),
              value: 0,
              // FIXME: have the chart default to zero if a key isn't provided?
              ...(itemizeByToken
                ? FIRM_WHITELIST.reduce<TokenMap<number>>((prev, curr) => {
                    prev[curr[1].address] = 0;
                    return prev;
                  }, {})
                : undefined),
            } as BaseDataPoint)
        ),
        ...points,
      ]
    : points;
};

/**
 * Interpolate a Guvnor's horde in a Gameday using past snapshots.
 * This calculates the amount of Grown Horde a Guvnor gains each gameday using their Prospects.
 */
export const interpolateGuvnorHorde = (
  snapshots: GuvnorFirmRewardsQuery['snapshots'],
  gameday: BigNumber,
  bufferGamedays: number = 24
) => {
  // Sequence
  let j = 0;
  const minGameday = snapshots[j].gameday;
  const maxGameday = gameday.toNumber(); // current gameday
  let currHorde: BigNumber = ZERO_BN;
  let currProspects: BigNumber = ZERO_BN;
  let currTimestamp = DateTime.fromJSDate(
    secondsToDate(snapshots[j].createdAt)
  );
  let nextGameday: number | undefined = minGameday;

  // Add buffer points before the first snapshot
  const horde: BaseDataPoint[] = [];
  const prospects: BaseDataPoint[] = [];

  for (let s = minGameday; s <= maxGameday; s += 1) {
    if (s === nextGameday) {
      // Reached a data point for which we have a snapshot.
      // Use the corresponding total horde value.
      currHorde = toTokenUnitsBN(snapshots[j].horde, HORDE.decimals);
      currProspects = toTokenUnitsBN(snapshots[j].prospects, PROSPECTS.decimals);
      currTimestamp = DateTime.fromJSDate(
        secondsToDate(snapshots[j].createdAt)
      );
      j += 1;
      nextGameday = snapshots[j]?.gameday || undefined;
    } else {
      // Estimate actual amount of horde using prospects
      currHorde = currHorde.plus(
        currProspects.multipliedBy(HORDE_PER_PROSPECT_PER_GAMEDAY)
      ); // Each Prospect grows 1/10,000 Horde per Gameday
      currTimestamp = currTimestamp.plus({ hours: 1 });
    }
    horde.push({
      gameday: s,
      date: currTimestamp.toJSDate(),
      value: currHorde.toNumber(),
    } as BaseDataPoint);
    prospects.push({
      gameday: s,
      date: currTimestamp.toJSDate(),
      value: currProspects.toNumber(),
    } as BaseDataPoint);
  }

  return [
    addBufferGamedays(horde, bufferGamedays, false),
    addBufferGamedays(prospects, bufferGamedays, false),
  ] as const;
};

/**
 * Interpolate the total USD value of a Guvnor's deposits
 * using (a) snapshots of their Firm (which contain `hourlyDepositedBDV`)
 * and   (b) gamedayal Hooligan price data.
 */
export const interpolateGuvnorDepositedValue = (
  snapshots: SnapshotHooliganhorde[], // oldest gameday first
  _prices: GamedayalPriceQuery['gamedays'], // most recent gameday first
  itemizeByToken: boolean = true,
  bufferGamedays: number = 24
) => {
  const prices = Array.from(_prices).reverse(); // FIXME: inefficient
  if (prices.length === 0) return [];

  // Sequence
  let j = 0;
  const minGameday = snapshots[j].gameday;
  const maxGameday = prices[prices.length - 1].gameday;
  let currBDV: BigNumber = ZERO_BN;
  let nextSnapshotGameday: number | undefined = minGameday;

  // null if we don't need to itemize by token
  const currBDVByToken = itemizeByToken
    ? FIRM_WHITELIST.reduce<{ [address: string]: BigNumber }>((prev, curr) => {
        prev[curr[1].address] = ZERO_BN;
        return prev;
      }, {})
    : null;

  // Price data goes all the way back to gameday 0, find the price index
  // where we should start iterating based on the user's oldest deposit
  let currPriceIndex = prices.findIndex((p) => p && minGameday <= p.gameday) + 1;
  if (currPriceIndex < 0) currPriceIndex = 0;

  // FIXME: p returning null sometimes during state transitions
  if (!prices[currPriceIndex]) return [];

  // if the subgraph misses some prices or something happens in the frontend
  // we use the last known price until we encounter a price at the current gameday
  const points: BaseDataPoint[] = [];

  for (let s = minGameday; s <= maxGameday; s += 1) {
    const thisPriceEntity = prices[currPriceIndex];
    const nextPriceEntity = prices[currPriceIndex + 1];
    const thisPriceBN = new BigNumber(thisPriceEntity.price);
    const thisTimestamp = DateTime.fromJSDate(
      secondsToDate(thisPriceEntity.createdAt)
    );
    let thisBDV = currBDV;

    // If there's another price and the gameday associated with the price is
    // either [the price for this gameday OR in the past], we'll save this price
    // and use it next time in case some data points are missed
    if (nextPriceEntity && nextPriceEntity?.gameday <= s) {
      currPriceIndex += 1;
    }

    if (s === nextSnapshotGameday) {
      // Reached a data point for which we have a snapshot.
      // Use the corresponding total deposited BDV.
      // Since we combined multiple tokens together, we may have a deposit for multiple
      // tokens in the same gameday. Loop through all deposits of any token in gameday `s`
      // and sum up their BDV as `thisBDV`. Note that this assumes snapshots are sorted by gameday ascending.
      for (j; snapshots[j]?.gameday === nextSnapshotGameday; j += 1) {
        const thisSnapshotBDV = toTokenUnitsBN(
          snapshots[j].hourlyDepositedBDV,
          HOOLIGAN[1].decimals
        );
        thisBDV = thisBDV.plus(thisSnapshotBDV);

        if (currBDVByToken) {
          const tokenAddr = snapshots[j]?.id.split('-')[1].toLowerCase();
          if (tokenAddr && currBDVByToken[tokenAddr]) {
            currBDVByToken[tokenAddr] =
              currBDVByToken[tokenAddr].plus(thisSnapshotBDV);
          }
        }
      }
      nextSnapshotGameday = snapshots[j]?.gameday || undefined; // next gameday for which BDV changes
    }

    points.push({
      gameday: s,
      date: thisTimestamp.toJSDate(),
      value: thisBDV.multipliedBy(thisPriceBN).toNumber(),
      ...(currBDVByToken
        ? FIRM_WHITELIST.reduce<TokenMap<number>>((prev, token) => {
            const addr = token[1].address;
            prev[addr] = currBDVByToken[addr]
              .multipliedBy(thisPriceBN)
              .toNumber();
            return prev;
          }, {})
        : undefined),
    } as BaseDataPoint);

    currBDV = thisBDV;
  }

  return addBufferGamedays(points, bufferGamedays, Boolean(currBDVByToken));
};
