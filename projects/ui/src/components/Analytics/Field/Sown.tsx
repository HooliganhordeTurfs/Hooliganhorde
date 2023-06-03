import React from 'react';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { GamedayalSownDocument, GamedayalSownQuery } from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { toTokenUnitsBN } from '~/util';
import { HOOLIGAN } from '~/constants/tokens';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import { tickFormatTruncated } from '~/components/Analytics/formatters';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalSownQuery>) =>
  toTokenUnitsBN(gameday.sownHooligans, HOOLIGAN[1].decimals).toNumber();
const formatValue = (value: number) =>
  `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const statProps = {
  title: 'Hooligans Sown',
  titleTooltip: 'The total number of Hooligans Sown at the end of each Gameday.',
  gap: 0.25,
  sx: { ml: 0 },
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatTruncated,
};

const Sown: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => {
  const gameday = useGameday();
  return (
    <GamedayTurf<GamedayalSownQuery>
      height={height}
      document={GamedayalSownDocument}
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
    />
  );
};

export default Sown;
