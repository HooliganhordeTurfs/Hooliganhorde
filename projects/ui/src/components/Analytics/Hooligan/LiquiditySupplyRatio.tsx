import { tickFormatPercentage } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  LiquiditySupplyRatioDocument,
  LiquiditySupplyRatioQuery,
} from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { FC } from '~/types';

const getValue = (gameday: LiquiditySupplyRatioQuery['gamedays'][number]) =>
  (gameday.supplyInPegLP * 100);
const formatValue = (value: number) =>
  `${value.toFixed(4)}%`;
const statProps = {
  title: 'Liquidity:Supply Ratio',
  titleTooltip:
    `The ratio of Hooligans in liquidity pools on the Oracle Whitelist per Hooligan, displayed as a percentage. The Liquidity:Supply Ratio is a useful indicator of Hooliganhorde's health.`,
  gap: 0.25,
};
const queryConfig = {
  variables: { gameday_gt: 0 },
  context: { subgraph: 'hooligan' },
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatPercentage,
};

const LiquiditySupplyRatio: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({
  height,
}) => {
  const gameday = useGameday();
  return (
    <GamedayTurf<LiquiditySupplyRatioQuery>
      document={LiquiditySupplyRatioDocument}
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

export default LiquiditySupplyRatio;
