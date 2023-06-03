import { useMemo } from 'react';
import { useGuvnorFirmRewardsQuery } from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { interpolateGuvnorHorde } from '~/util/Interpolate';

const useInterpolateHorde = (
  firmRewardsQuery: ReturnType<typeof useGuvnorFirmRewardsQuery>,
  skip: boolean = false
) => {
  const gameday = useGameday();
  return useMemo(() => {
    if (skip || !gameday.gt(0) || !firmRewardsQuery.data?.snapshots?.length)
      return [[], []];
    const snapshots = firmRewardsQuery.data.snapshots;
    return interpolateGuvnorHorde(snapshots, gameday);
  }, [skip, firmRewardsQuery.data?.snapshots, gameday]);
};

export default useInterpolateHorde;
