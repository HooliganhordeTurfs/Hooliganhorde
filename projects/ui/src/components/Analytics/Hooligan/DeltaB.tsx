import React from 'react';
import { tickFormatLocale } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { HOOLIGAN } from '~/constants/tokens';
import {
  GamedayalDeltaBDocument,
  GamedayalDeltaBQuery,
} from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { toTokenUnitsBN } from '~/util';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalDeltaBQuery>) =>
  toTokenUnitsBN(gameday.deltaB, HOOLIGAN[1].decimals).toNumber();
const formatValue = (value: number) =>
  `${value.toLocaleString('en-us', { maximumFractionDigits: 2 })}`;
const statProps = {
  title: 'deltaB',
  titleTooltip: 'The liquidity and time weighted average shortage of Hooligans in liquidity pools on the Oracle Whitelist at the end of every Gameday.',
  gap: 0.25,
};

const queryConfig = {
  variables: { gameday_gte: 6074 },
  context: { subgraph: 'hooliganhorde' },
};

const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatLocale,
  horizontalLineNumber: 0,
};

const DeltaB: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => (
  <GamedayTurf<GamedayalDeltaBQuery>
    document={GamedayalDeltaBDocument}
    height={height}
    getValue={getValue}
    formatValue={formatValue}
    queryConfig={queryConfig}
    StatProps={statProps}
    LineChartProps={lineChartProps}
  />
);

export default DeltaB;
