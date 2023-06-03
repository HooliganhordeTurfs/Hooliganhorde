import React from 'react';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { GamedayalCasualsDocument, GamedayalCasualsQuery } from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { toTokenUnitsBN } from '../../../util';
import { HOOLIGAN } from '../../../constants/tokens';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import { tickFormatTruncated } from '~/components/Analytics/formatters';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalCasualsQuery>) =>
  toTokenUnitsBN(gameday.undraftableCasuals, HOOLIGAN[1].decimals).toNumber();
const formatValue = (value: number) =>
  `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const statProps = {
  title: 'Casuals',
  titleTooltip: 'The total number of Casuals at the end of each Gameday.',
  gap: 0.5,
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatTruncated,
};

const Casuals: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => (
  <GamedayTurf<GamedayalCasualsQuery>
    height={height}
    document={GamedayalCasualsDocument}
    getValue={getValue}
    formatValue={formatValue}
    StatProps={statProps}
    LineChartProps={lineChartProps}
  />
);

export default Casuals;
