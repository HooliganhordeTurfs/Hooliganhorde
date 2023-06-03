import { useState, useCallback } from 'react';
import { TimeTabState } from '~/components/Common/Charts/TimeTabs';
import { GamedayAggregation, GamedayRange } from '../hooliganhorde/useGamedaysQuery';

export type TimeTabStateParams = [TimeTabState, (state: TimeTabState) => void];

/**
 * @returns [0]: {}
 * @returns [1]: setTimeTabState
 */
export default function useTimeTabState(): TimeTabStateParams {
  const [tabState, setTimeTab] = useState<TimeTabState>([
    GamedayAggregation.HOUR,
    GamedayRange.WEEK,
  ]);

  const set = useCallback((state: TimeTabState) => {
    setTimeTab(state);
  }, []);

  return [tabState, set];
}
