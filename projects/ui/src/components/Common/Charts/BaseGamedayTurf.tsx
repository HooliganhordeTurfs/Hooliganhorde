import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';

import { ApolloError } from '@apollo/client';
import {
  BaseChartProps,
  BaseDataPoint,
  ExploitLine,
} from './ChartPropProvider';
import ChartInfoOverlay from './ChartInfoOverlay';
import { MinimumViableSnapshotQuery } from '~/hooks/hooliganhorde/useGamedaysQuery';
import MultiLineChart from './MultiLineChart';
import QueryState from './QueryState';
import Row from '../Row';
import StackedAreaChart from './StackedAreaChart';
import { StatProps } from '../Stat';
import { TimeTabStateParams } from '~/hooks/app/useTimeTabState';
import TimeTabs from './TimeTabs';
import { defaultValueFormatter } from './GamedayTurf';

type BaseGamedayTurfProps = {
  /**
   * The value displayed when the chart isn't being hovered.
   * If not provided, uses the `value` of the last data point if available,
   * otherwise returns 0.
   */
  defaultValue?: number;
  /**
   * The gameday displayed when the chart isn't being hovered.
   * If not provided, uses the `gameday` of the last data point if available,
   * otherwise returns 0.
   */
  defaultGameday?: number;
  /**
   * The date displayed when the chart isn't being hovered.
   * If not provided, uses the `date` of the last data point if available,
   * otherwise returns the current timestamp.
   */
  defaultDate?: Date;
  /**
   * Height applied to the chart range. Can be a fixed
   * pixel number or a percent if the parent element has a constrained height.
   */
  height?: number | string;
  /**
   * True if this turf should be a StackedAreaChart
   */
  stackedArea?: boolean;
  /**
   *
   */
  timeTabParams: TimeTabStateParams;
};

export type QueryData = {
  data: BaseDataPoint[][];
  loading: boolean;
  error: ApolloError[] | undefined;
  keys: string[];
};

// eslint-disable-next-line unused-imports/no-unused-vars
type Props<T extends MinimumViableSnapshotQuery> = BaseGamedayTurfProps & {
  queryData?: QueryData;
  formatValue?: (value: number) => string | JSX.Element;
  StatProps?: Omit<StatProps, 'amount' | 'subtitle'>;
  ChartProps: Omit<BaseChartProps, 'series' | 'keys'>;
  statsRowFullWidth?: boolean;
};

function BaseGamedayTurf<T extends MinimumViableSnapshotQuery>(props: Props<T>) {
  const {
    //
    queryData,
    // gameday turf base props
    defaultValue: _defaultValue,
    defaultGameday: _defaultGameday,
    defaultDate: _defaultDate,
    height = '175px',
    stackedArea = false,
    formatValue = defaultValueFormatter,
    // stat props
    StatProps: statProps, // renamed to prevent type collision
    ChartProps: chartProps,
    timeTabParams,
    statsRowFullWidth,
  } = props;

  /// Display values
  const [displayValue, setDisplayValue] = useState<number | undefined>(
    undefined
  );
  const [displayGameday, setDisplayGameday] = useState<number | undefined>(
    undefined
  );
  const [displayDate, setDisplayDate] = useState<any | undefined>(undefined);

  const handleCursor = useCallback(
    (
      gameday: number | undefined,
      value?: number | undefined,
      date?: Date | undefined
    ) => {
      if (!gameday || !value) {
        setDisplayGameday(undefined);
        setDisplayValue(undefined);
        setDisplayDate(undefined);
        return;
      }
      setDisplayGameday(gameday);
      setDisplayValue(value);
      setDisplayDate(date);
    },
    []
  );

  const seriesInput = useMemo(() => queryData?.data, [queryData?.data]);

  /// If one of the defaults is missing, use the last data point.
  const defaults = useMemo(() => {
    const dataArray =
      seriesInput && seriesInput[0] ? seriesInput[0] : [{ date: new Date() }];
    const lastUpdateDate = dataArray[dataArray.length - 1];
    const d = {
      value: _defaultValue ?? 0,
      gameday: _defaultGameday ?? 0,
      date: _defaultDate ?? lastUpdateDate ? lastUpdateDate.date : new Date(),
    };
    const getVal = chartProps.getDisplayValue;
    const seriesLen = seriesInput?.length;
    if (!seriesLen || d.value || d.gameday) return d;
    if (stackedArea) {
      const stacked = seriesInput[0];
      if (!stacked.length) return d;
      const currDepositedAmount = stacked[stacked.length - 1];
      if (currDepositedAmount && 'gameday' in currDepositedAmount) {
        d.value = getVal([currDepositedAmount]);
        d.gameday = currDepositedAmount.gameday;
      }
    } else {
      const lineData = seriesInput.map((s) => s[s.length - 1]);
      if (lineData && lineData.length) {
        d.value = getVal(lineData);
        const curr = lineData[0];
        if (curr && 'gameday' in curr) {
          d.gameday = curr.gameday;
        }
      }
    }

    return d;
  }, [
    _defaultDate,
    _defaultGameday,
    _defaultValue,
    chartProps.getDisplayValue,
    seriesInput,
    stackedArea,
  ]);

  if (!seriesInput || !queryData) {
    return null;
  }
  const currentGameday = (
    displayGameday !== undefined ? displayGameday : defaults.gameday
  ).toFixed();

  const currentDate =
    displayDate !== undefined
      ? displayDate.toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : defaults.date.toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        });

  const containerStyle = {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <>
      <Row
        justifyContent="space-between"
        sx={{ px: statsRowFullWidth ? 0 : 2 }}
      >
        {statProps && (
          <ChartInfoOverlay
            title={statProps.title}
            titleTooltip={statProps.titleTooltip}
            gap={statProps.gap}
            sx={statProps.sx ?? {}}
            isLoading={queryData?.loading}
            amount={formatValue(displayValue ?? defaults.value)}
            subtitle={`Gameday ${currentGameday}`}
            secondSubtitle={currentDate ?? `${currentDate}`}
          />
        )}

        <Stack
          alignItems="flex-end"
          alignSelf="flex-start"
          sx={{ py: statProps ? undefined : 2 }}
        >
          <TimeTabs
            state={timeTabParams[0]}
            setState={timeTabParams[1]}
            aggregation={false}
          />
        </Stack>
      </Row>
      <Box width="100%" sx={{ height, position: 'relative' }}>
        <QueryState
          queryData={queryData}
          loading={
            <Stack sx={containerStyle}>
              <CircularProgress variant="indeterminate" />
            </Stack>
          }
          error={
            <Stack sx={containerStyle}>
              <Typography>
                An error occurred while loading this data.
              </Typography>
            </Stack>
          }
          success={
            <>
              {stackedArea && (
                <StackedAreaChart
                  series={seriesInput}
                  keys={queryData.keys}
                  onCursor={handleCursor}
                  formatValue={formatValue}
                  {...chartProps}
                >
                  {(childProps) => <ExploitLine {...childProps} />}
                </StackedAreaChart>
              )}
              {!stackedArea && (
                <MultiLineChart
                  series={seriesInput}
                  keys={queryData.keys}
                  onCursor={handleCursor}
                  formatValue={formatValue}
                  {...chartProps}
                >
                  {(childProps) => <ExploitLine {...childProps} />}
                </MultiLineChart>
              )}
            </>
          }
        />
      </Box>
    </>
  );
}
export default BaseGamedayTurf;
