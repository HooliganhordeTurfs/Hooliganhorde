import React from 'react';
import { tickFormatLocale } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalCrossesDocument,
  GamedayalCrossesQuery,
} from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalCrossesQuery>) => gameday.crosses;
const formatValue = (value: number) => `${value}`;
const statProps = {
  title: 'Peg Crosses',
  titleTooltip: 'The number of times Hooligan has crossed its peg. Does not include peg crosses due to ETH price movement.',
  gap: 0.25,
  sx: { ml: 0 },
};
const queryConfig = { context: { subgraph: 'hooligan' } };
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatLocale,
};

const Crosses: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({
  height,
}) => {
  const gameday = useGameday();
  return (
    <GamedayTurf<GamedayalCrossesQuery>
      height={height}
      document={GamedayalCrossesDocument}
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      queryConfig={queryConfig}
      StatProps={statProps}
      LineChartProps={lineChartProps}
      dateKey="timestamp"
    />
  );
};

export default Crosses;
