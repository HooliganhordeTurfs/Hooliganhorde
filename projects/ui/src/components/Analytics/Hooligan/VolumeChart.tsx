import { CircularProgress, Stack, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { timeFormat, timeParse } from 'd3-time-format';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import {
  GamedayalVolumeDocument,
  GamedayalVolumeQuery,
} from '~/generated/graphql';

import BarChart from '~/components/Common/Charts/BarChart';
import { BaseDataPoint } from '../../Common/Charts/ChartPropProvider';
import ChartInfoOverlay from '../../Common/Charts/ChartInfoOverlay';
import { FC } from '~/types';
import { QueryData } from '~/components/Common/Charts/BaseGamedayTurf';
import QueryState from '../../Common/Charts/QueryState';
import Row from '../../Common/Row';
import TimeTabs from '../../Common/Charts/TimeTabs';
import { tickFormatUSD } from '~/components/Analytics/formatters';
import useGenerateChartSeries from '~/hooks/hooliganhorde/useGenerateChartSeries';
import useGamedaysQuery from '~/hooks/hooliganhorde/useGamedaysQuery';
import useTimeTabState from '~/hooks/app/useTimeTabState';

type BarChartDatum = {
  count: number;
  maxGameday: number;
  minGameday: number;
  date: Date;
};

type DataByDate = {
  [key: string]: BaseDataPoint[];
};

const VolumeChart: FC<{ width?: number; height: number }> = ({
  width = undefined,
  height,
}) => {
  const [currentHoverBar, setHoverBar] = useState<BarChartDatum | undefined>(
    undefined
  );

  const queryConfig = useMemo(() => ({ context: { subgraph: 'hooligan' } }), []);

  const timeTabParams = useTimeTabState();

  const gamedaysQuery = useGamedaysQuery(
    GamedayalVolumeDocument,
    timeTabParams[0][1],
    queryConfig
  );

  const getValue = (gameday: GamedayalVolumeQuery['gamedays'][number]) =>
    parseFloat(gameday.deltaVolumeUSD);

  const queryData: QueryData = useGenerateChartSeries(
    [{ query: gamedaysQuery, getValue, key: 'value' }],
    timeTabParams[0],
    'timestamp'
  );

  const transformData: (data: BaseDataPoint[]) => BarChartDatum[] = (data) => {
    if (data?.length === 0) return [];

    const dateFormat = timeFormat('%Y/%m/%d');
    const parseDate = timeParse('%Y/%m/%d');
    const dataByDate = data.reduce((accum: DataByDate, datum: any) => {
      const key = dateFormat(datum.date);
      if (!accum[key]) {
        accum[key] = [];
      }
      accum[key].push(datum);
      return accum;
    }, {});

    return Object.entries(dataByDate).map(([date, dayData]) => {
      const gamedays = dayData.map((datum) => datum.gameday);
      return {
        date: parseDate(date) as Date,
        maxGameday: Math.max(...gamedays),
        minGameday: Math.min(...gamedays),
        count: dayData.reduce((accum: number, datum) => accum + datum.value, 0),
      };
    });
  };

  const formatValue = (value: number) =>
    `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const currentGameday =
    currentHoverBar?.minGameday && currentHoverBar?.maxGameday
      ? `${currentHoverBar?.minGameday ?? ''} - ${
          currentHoverBar?.maxGameday ?? ''
        }`
      : 0;

  const currentDate = currentHoverBar ? currentHoverBar.date.toLocaleDateString() : (new Date()).toLocaleDateString();

  const chartControlsHeight = 75;
  const chartHeight = height - chartControlsHeight;
  const containerStyle = {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: chartHeight,
  };

  return (
    <>
      <Row
        justifyContent="space-between"
        sx={{ px: 2, maxHeight: chartControlsHeight }}
      >
        <ChartInfoOverlay
          title="Volume"
          titleTooltip="The total volume in the HOOLIGAN:3CRV pool in every Gameday."
          gap={0.25}
          isLoading={queryData?.loading}
          amount={formatValue(currentHoverBar?.count ?? 0)}
          subtitle={`Gameday ${currentGameday}`}
          secondSubtitle={currentDate}
        />
        <Stack alignItems="flex-end" alignSelf="flex-start">
          <TimeTabs
            state={timeTabParams[0]}
            setState={timeTabParams[1]}
            aggregation={false}
          />
        </Stack>
      </Row>
      <QueryState
        queryData={queryData}
        loading={
          <Stack sx={containerStyle}>
            <CircularProgress variant="indeterminate" />
          </Stack>
        }
        error={
          <Stack sx={containerStyle}>
            <Typography>An error occurred while loading this data.</Typography>
          </Stack>
        }
        success={
          <ParentSize parentSizeStyles={{ height: chartHeight }}>
            {(parent) => (
              <BarChart
                seriesData={transformData(queryData?.data[0])}
                getX={(datum) => datum.date}
                getY={(datum) => Number(datum.count)}
                xTickFormat={(date: Date) => date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                yTickFormat={tickFormatUSD}
                width={width || parent.width}
                height={chartHeight || parent.height}
                onBarHoverEnter={(datum) => {
                  setHoverBar(datum as BarChartDatum);
                }}
              />
            )}
          </ParentSize>
        }
      />
    </>
  );
};

export default VolumeChart;
