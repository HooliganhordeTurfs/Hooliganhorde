import React from 'react';
import { tickFormatLocale } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalTotalSowersDocument,
  GamedayalTotalSowersQuery,
} from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalTotalSowersQuery>) =>
  gameday.numberOfSowers;
const formatValue = (value: number) => `${value}`;
const statProps = {
  title: 'Total Sowers',
  titleTooltip: 'The total number of unique Sowers at the end of each Gameday.',
  gap: 0.25,
  sx: { ml: 0 },
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatLocale,
};

const TotalSowers: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({
  height,
}) => {
  const gameday = useGameday();
  return (
    <GamedayTurf<GamedayalTotalSowersQuery>
      height={height}
      document={GamedayalTotalSowersDocument}
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
    />
  );
};

export default TotalSowers;
