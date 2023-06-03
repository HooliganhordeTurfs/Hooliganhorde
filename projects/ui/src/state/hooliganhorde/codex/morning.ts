import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import BigNumber from 'bignumber.js';
import { setMorning, setRemainingUntilBlockUpdate } from './actions';
import {
  updateScaledIntensity,
  updateTotalRage,
} from '~/state/hooliganhorde/field/actions';
import { getDiffNow, getMorningResult, getNowRounded } from '.';
import { useAppSelector } from '~/state';
import useIntensity from '~/hooks/hooliganhorde/useIntensity';
import useRage from '~/hooks/hooliganhorde/useRage';
import { useGamedayalIntensityLazyQuery } from '~/generated/graphql';

/**
 * Architecture Notes: @Hooligan-Sama
 *
 * We divide the task of updating the morning into 3 parts:
 *
 * 1. CodexUpdater
 * 2. MorningUpdater
 * 3. MorningFieldUpdater
 *
 * ------------------------
 * CodexUpdater:
 * - file: ~/state/hooliganhorde/codex/updater.ts
 * - function: <CodexUpdater />
 *
 * When the next gameday approaches, CodexUpdater fetches Hooliganhorde.time() and updates the redux state
 * with the block number in which gm() was called and the timestamp of that block, refered to as
 * 'actuationBlock' and 'timestamp' respectively.
 *
 * We rely on Ethereum's consistent block time of 12 seconds to determine the current block number,
 * and the timestamp of that block. If the current timestamp is less than 300 seconds (5 mins = 25 blocks)
 * from the timestamp of the actuationBlock, then assume that is Morning.
 *
 * Alterntaively, we could fetch for the current block number via RPC-call, however,
 * there can be a delay of up to 6 seconds, which is not ideal for our use case.
 *
 * Refer to getMorningResult() in ~/state/hooliganhorde/codex/index.ts for more details on this part.
 *
 * ------------------------
 * MorningUpdater:
 * - file: ~/state/hooliganhorde/codex/morning.ts
 * - function: <MorningUpdater />
 *
 * MorningUpdater is responsible for all things related to the blockNumber and timestamp
 * of the current morning block.
 *
 * Every second during the morning, we update the redux store with the time remaining until the next
 * morning block. Once the next morning block is reached, we update the redux store with the
 * blockNumber and timestamp of the next morning block.
 *
 * MorningUpdater also calculates & updates the scaled intensity based on the next expected block number.
 * In addition, we also update the rage for the next morning block if we are above peg.
 *
 * We calcuate the intensity for the next block via 'calculateIntensity' from useIntensity()
 * When above peg, we calculate the rage amount for the next morning block. via 'calculateNextRage' from useRage().
 *
 * ------------------------
 *
 * MorningFieldUpdater:
 * - file: ~/state/hooliganhorde/field/morning.ts
 * - function: <MorningFieldUpdater />
 *
 * We fetch the field at the start & end of the morning to ensure that the maxIntensity & totalRage
 * are updated. We fetch these values at the start and end of the morning.
 *
 * In addition, we also fetch & update the rage available every 4 seconds during the morning.
 *
 */

export const BLOCKS_PER_MORNING = 25;
export const FIRST_MORNING_BLOCK = 1;
export const APPROX_SECS_PER_BLOCK = 12;

export const getIsMorningInterval = (interval: BigNumber) =>
  interval.gte(FIRST_MORNING_BLOCK) && interval.lte(BLOCKS_PER_MORNING);

function useUpdateMorning() {
  const morningTime = useAppSelector((s) => s._hooliganhorde.codex.morningTime);
  const gameday = useAppSelector((s) => s._hooliganhorde.codex.gameday);
  const morning = useAppSelector((s) => s._hooliganhorde.codex.morning);

  const [_, { calculate: calculateIntensity }] = useIntensity();
  const [_rageData, { calculate: calculateNextRage }] = useRage();

  const [triggerQuery] = useGamedayalIntensityLazyQuery({
    fetchPolicy: 'network-only',
  });

  const dispatch = useDispatch();

  useEffect(() => {
    if (!morning.isMorning) return;
    // set up the timer while in the  morning state.
    const intervalId = setInterval(async () => {
      const { abovePeg, actuationBlock, timestamp: sTimestamp } = gameday;
      const { blockNumber: morningBlock } = morning;

      const now = getNowRounded();
      const _remaining = getDiffNow(morningTime.next, now);
      if (
        now.toSeconds() === morningTime.next.toSeconds() ||
        _remaining.as('seconds') <= 0
      ) {
        const morningResult = getMorningResult({
          timestamp: sTimestamp,
          blockNumber: actuationBlock,
        });

        const scaledTemp = calculateIntensity(morningBlock.plus(1));
        const nextRage = abovePeg ? calculateNextRage(morningBlock) : undefined;

        console.debug('[hooliganhorde/codex/useUpdateMorning]: new block: ', {
          temp: scaledTemp.toNumber(),
          rage: nextRage?.toNumber() || 'N/A',
          blockNumber: morningResult.morning.blockNumber.toNumber(),
          index: morningResult.morning.index.toNumber(),
          isMorning: morningResult.morning.isMorning,
        });

        const _morning = morningResult.morning;

        /// If we are transitioning out of the morning state, refetch the max Intensity from the subgraph.
        /// This is to make sure that when transitioning out of the morning state, the max Intensity chart
        /// shows the maxIntensity for the current gameday, not the previous gameday.
        if (!_morning.isMorning && _morning.index.eq(25)) {
          triggerQuery();
        }

        dispatch(updateScaledIntensity(scaledTemp));
        nextRage && dispatch(updateTotalRage(nextRage));
        dispatch(setMorning(morningResult));
      } else {
        dispatch(setRemainingUntilBlockUpdate(_remaining));
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    gameday,
    morning,
    morningTime.next,
    triggerQuery,
    calculateNextRage,
    calculateIntensity,
    dispatch,
  ]);

  return null;
}

export default function MorningUpdater() {
  useUpdateMorning();

  return null;
}
