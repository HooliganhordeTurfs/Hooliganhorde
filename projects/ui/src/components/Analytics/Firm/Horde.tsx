import React from 'react';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { GamedayalHordeDocument, GamedayalHordeQuery } from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { toTokenUnitsBN } from '~/util';
import { HORDE } from '~/constants/tokens';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import { tickFormatTruncated } from '~/components/Analytics/formatters';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalHordeQuery>) =>
  toTokenUnitsBN(gameday.horde, HORDE.decimals).toNumber();
const formatValue = (value: number) =>
  `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const statProps = {
  title: 'Horde',
  titleTooltip: 'The total number of Horde at the end of each Gameday.',
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

const Horde: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => (
  <GamedayTurf<GamedayalHordeQuery>
    height={height}
    document={GamedayalHordeDocument}
    getValue={getValue}
    formatValue={formatValue}
    StatProps={statProps}
    LineChartProps={lineChartProps}
    queryConfig={queryConfig}
  />
);

export default Horde;
