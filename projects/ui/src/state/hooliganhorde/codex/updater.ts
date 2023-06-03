import { DateTime } from 'luxon';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { AppState } from '~/state';
import { bigNumberResult } from '~/util/Ledger';
import { getMorningResult, getNextExpectedActuation, parseGamedayResult } from '.';
import {
  resetCodex,
  setAwaitingActuation,
  setMorning,
  setNextActuation,
  setRemainingUntilActuation,
  updateGamedayResult,
  updateGamedayTime,
} from './actions';

export const useCodex = () => {
  const dispatch = useDispatch();
  const hooliganhorde = useHooliganhordeContract();

  const fetch = useCallback(async () => {
    try {
      if (hooliganhorde) {
        console.debug(
          `[hooliganhorde/codex/useCodex] FETCH (contract = ${hooliganhorde.address})`
        );
        const [gamedayTime, gameday] = await Promise.all([
          hooliganhorde.gamedayTime().then(bigNumberResult), /// the gameday that it could be if actuation was called
          hooliganhorde.time().then((r) => parseGamedayResult(r)), /// GamedayStruct
        ] as const);

        console.debug(`[hooliganhorde/codex/useCodex] time RESULT: = ${gameday}`);
        console.debug(
          `[hooliganhorde/codex/useCodex] gameday = ${gameday.current}, gamedayTime = ${gamedayTime}`
        );
        const morningResult = getMorningResult({
          blockNumber: gameday.actuationBlock,
          timestamp: gameday.timestamp,
        });

        dispatch(updateGamedayResult(gameday));
        dispatch(updateGamedayTime(gamedayTime));
        dispatch(setMorning(morningResult));

        return [gameday, gamedayTime] as const;
      }
      return [undefined, undefined, undefined] as const;
    } catch (e) {
      console.debug('[hooliganhorde/codex/useCodex] FAILED', e);
      console.error(e);
      return [undefined, undefined, undefined] as const;
    }
  }, [hooliganhorde, dispatch]);

  const clear = useCallback(() => {
    console.debug('[guvnor/firm/useCodex] clear');
    dispatch(resetCodex());
  }, [dispatch]);

  return [fetch, clear] as const;
};

const CodexUpdater = () => {
  const [fetch, clear] = useCodex();
  const dispatch = useDispatch();
  const gameday = useGameday();
  const next = useSelector<AppState, DateTime>(
    (state) => state._hooliganhorde.codex.actuation.next
  );
  const awaiting = useSelector<AppState, boolean>(
    (state) => state._hooliganhorde.codex.actuation.awaiting
  );

  useEffect(() => {
    if (awaiting === false) {
      /// Setup timer. Count down from now until the start
      /// of the next hour; when the timer is zero, set
      /// `awaiting = true`.
      const i = setInterval(() => {
        const _remaining = next.diffNow();
        if (_remaining.as('seconds') <= 0) {
          // dispatch(setAwaitingActuation(true));
        } else {
          // dispatch(setRemainingUntilActuation(_remaining));
        }
      }, 1000);
      return () => clearInterval(i);
    }
    /// When awaiting actuation, check every 3 seconds to see
    /// if the Gameday has incremented.
    const i = setInterval(() => {
      (async () => {
        const [newGameday] = await fetch();
        if (newGameday?.current?.gt(gameday)) {
          const _next = getNextExpectedActuation();
          dispatch(setAwaitingActuation(false));
          dispatch(setNextActuation(_next));
          dispatch(setRemainingUntilActuation(_next.diffNow()));
          toast.success(
            `The Codex has risen. It is now Gameday ${newGameday.current.toString()}.`
          );
        }
      })();
    }, 3000);
    return () => clearInterval(i);
  }, [dispatch, awaiting, gameday, next, fetch]);

  // Fetch when chain changes
  useEffect(() => {
    clear();
    fetch();
  }, [fetch, clear]);

  return null;
};

export default CodexUpdater;
