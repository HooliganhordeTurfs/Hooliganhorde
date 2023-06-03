import React from 'react';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { GamedayalProspectsDocument, GamedayalProspectsQuery } from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { toTokenUnitsBN } from '~/util';
import { PROSPECTS } from '~/constants/tokens';
import { tickFormatTruncated } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalProspectsQuery>) =>
  toTokenUnitsBN(gameday.prospects, PROSPECTS.decimals).toNumber();
const formatValue = (value: number) =>
  `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const statProps = {
  title: 'Prospects',
  titleTooltip: 'The total number of Prospects at the end of each Gameday.',
  gap: 0.5,
};
const queryConfig = {
  variables: {
    gameday_gt: 6073,
  },
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatTruncated,
};

const Prospects: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => (
  <GamedayTurf<GamedayalProspectsQuery>
    height={height}
    document={GamedayalProspectsDocument}
    getValue={getValue}
    formatValue={formatValue}
    StatProps={statProps}
    LineChartProps={lineChartProps}
    queryConfig={queryConfig}
  />
);

export default Prospects;
