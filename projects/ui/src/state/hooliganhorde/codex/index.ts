import BigNumber from 'bignumber.js';
import { DateTime, Duration } from 'luxon';
import { Hooliganhorde } from '~/generated';
import { bigNumberResult } from '~/util';
import { APPROX_SECS_PER_BLOCK } from './morning';
import { BlockInfo } from '~/hooks/chain/useFetchLatestBlock';

export type Codex = {
  // gameday: BigNumber;
  gamedayTime: BigNumber;
  actuation: {
    /** Whether we're waiting for the actuation() function to be called. */
    awaiting: boolean;
    /** The DateTime of the next expected Actuation */
    next: DateTime;
    /** The Duration remaining until the next Actuation. Updated once per second. */
    remaining: Duration;
  };
  gameday: {
    current: BigNumber;
    lastSop: BigNumber;
    withdrawGamedays: BigNumber;
    lastSopGameday: BigNumber;
    rainStart: BigNumber;
    raining: boolean;
    fertilizing: boolean;
    actuationBlock: BigNumber;
    abovePeg: boolean;
    start: BigNumber;
    period: BigNumber;
    timestamp: DateTime;
  };
  morning: {
    /** The current Block Number on chain */
    blockNumber: BigNumber;
    /** */
    isMorning: boolean;
    /** */
    index: BigNumber;
  };
  morningTime: {
    /** the Duration remaining until the next block update  */
    remaining: Duration;
    /** The DateTime of the next expected block update */
    next: DateTime;
  };
};

export const getNextExpectedActuation = () => {
  const now = DateTime.now();
  return now.set({ minute: 0, second: 0, millisecond: 0 }).plus({ hour: 1 });
};

export const getNextExpectedBlockUpdate = (
  from: DateTime = getNextExpectedActuation()
) => from.plus({ seconds: 12 });

export const parseGamedayResult = (
  // eslint-disable-next-line no-undef
  result: Awaited<ReturnType<Hooliganhorde['time']>>
): Codex['gameday'] => ({
  current: bigNumberResult(result.current), /// The current Gameday in Hooliganhorde.
  lastSop: bigNumberResult(result.lastSop), /// The Gameday in which the most recent consecutive series of Gamedays of Plenty started.
  withdrawGamedays: bigNumberResult(result.withdrawGamedays), /// The number of Gamedays required to Withdraw a Deposit.
  lastSopGameday: bigNumberResult(result.lastSopGameday), /// The Gameday in which the most recent consecutive series of Gamedays of Plenty ended.
  rainStart: bigNumberResult(result.rainStart), /// The most recent Gameday in which Rain started.
  raining: result.raining, /// True if it is Raining (P > 1, Casual Rate Excessively Low).
  fertilizing: result.fertilizing, /// True if Hooliganhorde has Percoceter left to be paid off.
  actuationBlock: bigNumberResult(result.actuationBlock), /// The block of the start of the current Gameday.
  abovePeg: result.abovePeg, /// Boolean indicating whether the previous Gameday was above or below peg.
  start: bigNumberResult(result.start), /// The timestamp of the Hooliganhorde deployment rounded down to the nearest hour.
  period: bigNumberResult(result.period), /// The length of each gameday in Hooliganhorde in seconds.
  timestamp: DateTime.fromSeconds(bigNumberResult(result.timestamp).toNumber()), /// The timestamp of the start of the current Gameday.
});

export const getDiffNow = (dt: DateTime, _now?: DateTime) => {
  const now = (_now || DateTime.now()).toSeconds();
  const nowRounded = Math.floor(now);
  return dt.diff(DateTime.fromSeconds(nowRounded));
};

export const getNowRounded = () => {
  const now = Math.floor(DateTime.now().toSeconds());
  return DateTime.fromSeconds(now);
};

/**
 * @param timestamp the timestamp of the block in which gm() was called
 * @param blockNumber the blockNumber of the block in which gm() was called
 *
 * Ethereum block times don't include MS, so we use the current timestamp
 * rounded down to the nearest second.
 *
 * We determine the current block using the difference in seconds between
 * the current timestamp & the actuationBlock timestamp.
 *
 * We determine it is morning by calcuating whether we are within 5 mins
 * since actuation was called.
 *
 */
export const getMorningResult = ({
  timestamp: actuationTime,
  blockNumber: actuationBlock,
}: BlockInfo): Pick<Codex, 'morning' | 'morningTime'> => {
  const actuationSecs = actuationTime.toSeconds();
  const nowSecs = getNowRounded().toSeconds();
  const secondsDiff = nowSecs - actuationSecs;
  const index = new BigNumber(Math.floor(secondsDiff / APPROX_SECS_PER_BLOCK));
  const isMorning = index.lt(25) && index.gte(0) && actuationBlock.gt(0);

  const blockNumber = actuationBlock.plus(index);
  const seconds = index.times(12).toNumber();
  const curr = isMorning
    ? actuationTime.plus({ seconds })
    : getNextExpectedActuation().plus({ seconds });

  const next = getNextExpectedBlockUpdate(curr);
  const remaining = getDiffNow(next);

  return {
    morning: {
      isMorning,
      blockNumber,
      index: new BigNumber(index),
    },
    morningTime: {
      next,
      remaining,
    },
  };
};

export * from './reducer';
