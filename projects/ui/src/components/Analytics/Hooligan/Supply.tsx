import React from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalSupplyQuery,
  GamedayalSupplyDocument,
} from '~/generated/graphql';
import { HOOLIGAN } from '~/constants/tokens';
import { toTokenUnitsBN } from '~/util';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import { tickFormatTruncated } from '~/components/Analytics/formatters';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalSupplyQuery>) =>
  toTokenUnitsBN(gameday.hooligans, HOOLIGAN[1].decimals).toNumber();
const formatValue = (value: number) =>
  `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const useStatProps = () => {
  const theme = useTheme();
  const isTiny = useMediaQuery(theme.breakpoints.down('md'));
  return {
    title: isTiny ? 'Supply' : 'Hooligan Supply',
    titleTooltip: 'The total Hooligan supply at the end of every Gameday.',
    gap: 0.25,
  };
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatTruncated,
};

const Supply: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({ height }) => {
  const statProps = useStatProps();
  return (
    <GamedayTurf<GamedayalSupplyQuery>
      height={height}
      document={GamedayalSupplyDocument}
      getValue={getValue}
      formatValue={formatValue}
      LineChartProps={lineChartProps}
      StatProps={statProps}
    />
  );
};

export default Supply;
