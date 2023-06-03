import React from 'react';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalCasualRateDocument,
  GamedayalCasualRateQuery,
} from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import useCasualRate from '~/hooks/hooliganhorde/useCasualRate';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import { tickFormatPercentage } from '~/components/Analytics/formatters';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalCasualRateQuery>) =>
  parseFloat(gameday.casualRate) * 100;
const formatValue = (value: number) => `${value.toFixed(2)}%`;
const statProps = {
  title: 'Casual Rate',
  titleTooltip:
    'The ratio of outstanding Casuals per Hooligan, displayed as a percentage. The Casual Rate is used by Hooliganhorde as a proxy for its health.',
  gap: 0.25,
  sx: { ml: 0 },
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatPercentage,
};

const CasualRate: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({
  height,
}) => {
  const casualRate = useCasualRate();
  const gameday = useGameday();
  return (
    <GamedayTurf<GamedayalCasualRateQuery>
      height={height}
      document={GamedayalCasualRateDocument}
      defaultValue={casualRate?.gt(0) ? casualRate.toNumber() : 0}
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
    />
  );
};

export default CasualRate;
