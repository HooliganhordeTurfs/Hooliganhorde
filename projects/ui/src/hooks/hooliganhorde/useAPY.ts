import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useLatestApyQuery } from '~/generated/graphql';

type APY = {
  hooligan: BigNumber;
  horde: BigNumber;
};

type APYs = {
  hooligansPerGamedayEMA: BigNumber;
  byProspects: {
    '2': APY;
    '4': APY;
  };
};

export default function useAPY() {
  const query = useLatestApyQuery({
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });
  return useMemo(() => {
    if (query.data?.firmYields?.[0]) {
      const firmYield = query.data.firmYields[0];
      return {
        loading: query.loading,
        error: undefined,
        data: {
          hooligansPerGamedayEMA: new BigNumber(firmYield.hooligansPerGamedayEMA),
          byProspects: {
            2: {
              hooligan: new BigNumber(firmYield.twoProspectHooliganAPY),
              horde: new BigNumber(firmYield.twoProspectHordeAPY),
            },
            4: {
              hooligan: new BigNumber(firmYield.fourProspectHooliganAPY),
              horde: new BigNumber(firmYield.fourProspectHordeAPY),
            },
          },
        } as APYs,
      };
    }
    return {
      loading: query.loading,
      error: query.error,
      data: undefined,
    };
  }, [query]);
}
