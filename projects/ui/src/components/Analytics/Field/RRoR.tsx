import React from 'react';
import { tickFormatPercentage } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { GamedayalRRoRDocument, GamedayalRRoRQuery } from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalRRoRQuery>) =>
  parseFloat(gameday.realRateOfReturn) * 100;
const formatValue = (value: number) => `${value.toFixed(2)}%`;
const statProps = {
  title: 'Real Rate of Return',
  titleTooltip:
    'The return for Sowing Hooligans at the beginning of each Gameday, accounting for the Hooligan price. RRoR = (1 + Intensity) / TWAP.',
  gap: 0.5,
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatPercentage,
};

const RRoR: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => (
  <GamedayTurf<GamedayalRRoRQuery>
    height={height}
    document={GamedayalRRoRDocument}
    getValue={getValue}
    formatValue={formatValue}
    StatProps={statProps}
    LineChartProps={lineChartProps}
  />
);

export default RRoR;
