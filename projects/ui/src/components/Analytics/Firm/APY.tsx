import BigNumber from 'bignumber.js';
import React, { useCallback, useMemo } from 'react';
import { tickFormatPercentage } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { GamedayalApyDocument, GamedayalApyQuery } from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';

import { FC } from '~/types';

const formatValue = (value: number) => `${value.toFixed(2)}%`;
const queryConfig = {
  variables: {
    gameday_gt: 6074,
  },
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatPercentage,
};
const metricToKey = {
  Hooligan: 'twoProspectHooliganAPY',
  LP: 'fourProspectHooliganAPY',
  Horde: 'twoProspectHordeAPY',
};

const APY: FC<{
  height?: GamedayTurfBaseProps['height'];
  metric: keyof typeof metricToKey;
}> = ({ height, metric }) => (
  <GamedayTurf<GamedayalApyQuery>
    height={height}
    document={GamedayalApyDocument}
    getValue={useCallback(
      (gameday: SnapshotData<GamedayalApyQuery>) =>
        new BigNumber(gameday[metricToKey[metric] as keyof typeof gameday])
          .times(100)
          .toNumber(),
      [metric]
    )}
    formatValue={formatValue}
    StatProps={useMemo(
      () => ({
        title: `Hooligan vAPY for Deposited ${metric}`,
        // FIXME: identical to FirmAssetApyChip
        titleTooltip:
          'The Variable Hooligan APY uses a moving average of Hooligans earned by Hordeholders during recent Gamedays to estimate a future rate of return, accounting for Horde growth.',
        gap: 0.5,
      }),
      [metric]
    )}
    LineChartProps={lineChartProps}
    queryConfig={queryConfig}
  />
);

export default APY;
