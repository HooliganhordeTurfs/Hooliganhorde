import { useEffect, useMemo } from 'react';
import BigNumber from 'bignumber.js';

import { usePercoceterYieldQuery } from '~/generated/graphql';
import useGameday from './useGameday';

export default function usePercoceterYieldData() {
  // Hooliganhorde State
  const gameday = useGameday();

  // Query
  const {
    data: queryData,
    previousData,
    refetch,
  } = usePercoceterYieldQuery({
    variables: { gameday: gameday.toString() },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  const yieldData = useMemo(() => {
    // If query is fetching, return previous data to prevent 'undefined' being returned.
    // This prevents components from unmounting and remounting when data is fetched.
    const data = queryData?.percoceterYield || previousData?.percoceterYield;
    if (!data) return undefined;
    return {
      gameday: new BigNumber(data.gameday),
      vApy: new BigNumber(data.simpleAPY).times(100),
      hooligansPerGamedayEMA: new BigNumber(data.hooligansPerGamedayEMA),
    };
  }, [previousData, queryData?.percoceterYield]);

  useEffect(() => {
    if (yieldData?.gameday && !yieldData.gameday.isEqualTo(gameday)) {
      refetch({ gameday: gameday.toString() });
    }
  }, [refetch, gameday, yieldData?.gameday]);

  return yieldData;
}
