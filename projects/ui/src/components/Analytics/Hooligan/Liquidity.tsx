import React from 'react';
import { tickFormatUSD } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalLiquidityDocument,
  GamedayalLiquidityQuery,
} from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';

import { FC } from '~/types';

const getValue = (gameday: GamedayalLiquidityQuery['gamedays'][number]) =>
  parseFloat(gameday.liquidityUSD);
const formatValue = (value: number) =>
  `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const statProps = {
  title: 'Liquidity',
  titleTooltip:
    'The USD value of the tokens in the HOOLIGAN:3CRV pool at the end of every Gameday.',
  gap: 0.25,
};
const queryConfig = {
  variables: { gameday_gt: 0 },
  context: { subgraph: 'hooligan' },
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatUSD,
};

const Liquidity: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({
  height,
}) => {
  const gameday = useGameday();
  return (
    <GamedayTurf
      document={GamedayalLiquidityDocument}
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

export default Liquidity;
