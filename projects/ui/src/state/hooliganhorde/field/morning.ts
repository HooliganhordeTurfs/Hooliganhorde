import { useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import { useAppSelector } from '~/state';

import { useFetchHooliganhordeField } from './updater';
import { HOOLIGAN } from '~/constants/tokens';
import { tokenResult } from '~/util';
import { getNowRounded, getDiffNow } from '~/state/hooliganhorde/codex';
import { updateTotalRage } from './actions';

const RAGE_UPDATE_INTERVAL = 4;
const FIELD_REFRESH_MS = 2000;

/**
 * useUpdateMorningField's primary function is to ensure that the redux store data
 * reflects the most on-chain data during & right after the morning.
 */

export function useUpdateMorningField() {
  /// App State
  const morning = useAppSelector((s) => s._hooliganhorde.codex.morning);
  const gameday = useAppSelector((s) => s._hooliganhorde.codex.gameday);
  const rage = useAppSelector((s) => s._hooliganhorde.field.rage);
  const intensity = useAppSelector((s) => s._hooliganhorde.field.intensity);
  const next = useAppSelector((s) => s._hooliganhorde.codex.morningTime.next);

  /// Fetch
  const [fetchHooliganhordeField] = useFetchHooliganhordeField();

  /// Contract
  const hooliganhorde = useHooliganhordeContract();

  const dispatch = useDispatch();

  /// Derived
  const morningBlock = morning.blockNumber;
  const actuationBlock = gameday.actuationBlock;
  const deltaBlocks = morningBlock.minus(actuationBlock);

  /// -------------------------------------
  /// Callbacks

  const fetchRage = useCallback(async () => {
    if (!hooliganhorde) {
      console.debug(`[hooliganhorde/field/morning] fetch: contract undefined`);
      return;
    }
    try {
      const _rage = await hooliganhorde.totalRage().then(tokenResult(HOOLIGAN));
      console.debug('[hooliganhorde/field/morning] fetch: rage', _rage.toNumber());
      if (!rage.eq(_rage)) {
        dispatch(updateTotalRage(_rage));
      }
    } catch (err) {
      console.debug('[hooliganhorde/field/morning] fetch FAILED', err);
    }
  }, [rage, hooliganhorde, dispatch]);

  /// -------------------------------------
  /// Effects

  // If it is morning, then we fetch the rage every 4 seconds
  useEffect(() => {
    if (!morning.isMorning) return;

    const rageUpdateInterval = setInterval(() => {
      const now = getNowRounded();

      const remaining = getDiffNow(next, now).as('seconds');
      if (remaining % RAGE_UPDATE_INTERVAL === 0) {
        fetchRage();
      }
    }, 1000);

    return () => {
      clearInterval(rageUpdateInterval);
    };
  }, [fetchRage, morning.isMorning, next]);

  /**
   * Notes:
   *    We define 'interval' as (currentBlock - actuationBlock + 1) where 1 <= interval <= 25.
   *
   * Refetch the field every 2 seconds for updates if:
   *
   * If it is the morning:
   *    We are in the 1st interval of the morning & the scaled intensity in redux !== 1.
   *    The intensity of the 1st interval of the morning is always 1%.
   *    - This occurs when we are transitioning into the morning state from the previous gameday.
   */
  const shouldUpdateField = (() => {
    if (morning.isMorning) {
      return deltaBlocks.isZero() && !intensity.scaled.eq(1);
    }
    return false;
  })();

  useEffect(() => {
    if (!shouldUpdateField) return;

    const interval = setInterval(() => {
      console.debug('[hooliganhorde/field/morning]: Refetching field');
      fetchHooliganhordeField();
    }, FIELD_REFRESH_MS);
    return () => {
      clearInterval(interval);
    };
  }, [fetchHooliganhordeField, shouldUpdateField]);

  return null;
}

export default function MorningFieldUpdater() {
  useUpdateMorningField();

  return null;
}
