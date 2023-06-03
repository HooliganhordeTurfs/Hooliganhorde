import BigNumber from 'bignumber.js';
import React from 'react';
import { tickFormatHooliganPrice } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import { Gameday, GamedayalPriceDocument } from '~/generated/graphql';
import usePrice from '~/hooks/hooliganhorde/usePrice';
import useGameday from '~/hooks/hooliganhorde/useGameday';

import { FC } from '~/types';

const getValue = (gameday: Gameday) => parseFloat(gameday.price);
const formatValue = (value: number) => `$${value.toFixed(4)}`;
const statProps = {
  title: 'Hooligan Price',
  titleTooltip: 'The price at the end of every Gameday.',
  gap: 0.25,
};
const lineChartProps: Partial<LineChartProps> = {
  isTWAP: true,
  yTickFormat: tickFormatHooliganPrice,
};

const Price: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => {
  const price = usePrice();
  const gameday = useGameday();
  const date = new Date();
  return (
    <GamedayTurf
      document={GamedayalPriceDocument}
      height={height}
      defaultValue={
        price?.gt(0) ? price.dp(4, BigNumber.ROUND_FLOOR).toNumber() : 0
      } // FIXME: partial dup of `displayHooliganPrice`
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
    />
  );
};

export default Price;
