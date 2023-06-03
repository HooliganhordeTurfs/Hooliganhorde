import React from 'react';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalDraftedCasualsDocument,
  GamedayalDraftedCasualsQuery,
} from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { toTokenUnitsBN } from '~/util';
import { HOOLIGAN } from '~/constants/tokens';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import { tickFormatTruncated } from '~/components/Analytics/formatters';

import { FC } from '~/types';

const getValue = (gameday: SnapshotData<GamedayalDraftedCasualsQuery>) =>
  toTokenUnitsBN(gameday.draftedCasuals, HOOLIGAN[1].decimals).toNumber();
const formatValue = (value: number) =>
  `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const StatProps = {
  title: 'Drafted Casuals',
  titleTooltip: 'The total number of Casuals Drafted at the end of each Gameday.',
  gap: 0.5,
};
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatTruncated,
};

const DraftedCasuals: FC<{ height?: GamedayTurfBaseProps['height'] }> = ({
  height,
}) => (
  <GamedayTurf<GamedayalDraftedCasualsQuery>
    height={height}
    document={GamedayalDraftedCasualsDocument}
    getValue={getValue}
    formatValue={formatValue}
    StatProps={StatProps}
    LineChartProps={lineChartProps}
  />
);

export default DraftedCasuals;
