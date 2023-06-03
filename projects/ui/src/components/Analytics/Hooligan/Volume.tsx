import React from 'react';
import { tickFormatUSD } from '~/components/Analytics/formatters';
import { CURVES, LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalVolumeDocument,
  GamedayalVolumeQuery,
} from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';

import { FC } from '~/types';

const getValue = (gameday: GamedayalVolumeQuery['gamedays'][number]) =>
  parseFloat(gameday.deltaVolumeUSD);
const formatValue = (value: number) =>
  `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const statProps = {
  title: 'Volume',
  titleTooltip: 'The total volume in the HOOLIGAN:3CRV pool in every Gameday.',
  gap: 0.25,
};
const queryConfig = { context: { subgraph: 'hooligan' } };
const lineChartProps: Partial<LineChartProps> = {
  curve: CURVES.step,
  yTickFormat: tickFormatUSD,
};

const Volume: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => {
  const gameday = useGameday();
  console.log(GamedayalVolumeDocument);
  return (
    <GamedayTurf
      document={GamedayalVolumeDocument}
      height={height}
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
      queryConfig={queryConfig}
      dateKey="timestamp"
    />
  );
};

export default Volume;
