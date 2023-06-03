import React from 'react';
import { tickFormatUSD } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { Gameday, GamedayalMarketCapDocument } from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';

import { FC } from '~/types';

const getValue = (gameday: Gameday) => parseFloat(gameday.marketCap);
const formatValue = (value: number) =>
  `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const statProps = {
  title: 'Market Cap',
  titleTooltip:
    'The USD value of the total Hooligan supply at the end of every Gameday.',
  gap: 0.25,
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatUSD,
};

const MarketCap: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({
  height,
}) => {
  const gameday = useGameday();
  return (
    <GamedayTurf
      document={GamedayalMarketCapDocument}
      height={height}
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
    />
  );
};

export default MarketCap;
