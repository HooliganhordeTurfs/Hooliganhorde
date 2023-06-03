import React from 'react';
import { useSelector } from 'react-redux';
import { tickFormatPercentage } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalIntensityDocument,
  GamedayalIntensityQuery,
} from '~/generated/graphql';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { AppState } from '~/state';

import { FC } from '~/types';

const getValue = (snapshot: SnapshotData<GamedayalIntensityQuery>) =>
  snapshot.intensity;
const formatValue = (value: number) => `${value.toFixed(0)}%`;
const statProps = {
  title: 'Max Intensity',
  titleTooltip: 'The maximum interest rate for Sowing Hooligans each Gameday.',
  gap: 0.5,
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatPercentage,
};

const Intensity: FC<{
  height?: GamedayTurfBaseProps['height'];
  statsRowFullWidth?: boolean;
}> = ({ height, statsRowFullWidth }) => {
  const intensity = useSelector<
    AppState,
    AppState['_hooliganhorde']['field']['intensity']['max']
  >((state) => state._hooliganhorde.field.intensity.max);
  const gameday = useGameday();
  return (
    <GamedayTurf<GamedayalIntensityQuery>
      height={height}
      document={GamedayalIntensityDocument}
      defaultValue={intensity?.gt(0) ? intensity.toNumber() : 0}
      defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
      statsRowFullWidth={statsRowFullWidth}
    />
  );
};

export default Intensity;
