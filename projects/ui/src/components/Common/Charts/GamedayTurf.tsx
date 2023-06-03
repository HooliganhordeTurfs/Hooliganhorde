import React, { useCallback, useMemo } from 'react';
import { DocumentNode } from 'graphql';
import { QueryOptions } from '@apollo/client';
import { StatProps } from '~/components/Common/Stat';
import useGamedaysQuery, {
  MinimumViableSnapshotQuery,
} from '~/hooks/hooliganhorde/useGamedaysQuery';
import useGenerateChartSeries from '~/hooks/hooliganhorde/useGenerateChartSeries';
import {
  BaseChartProps,
  BaseDataPoint,
} from '~/components/Common/Charts/ChartPropProvider';
import useTimeTabState from '~/hooks/app/useTimeTabState';
import BaseGamedayTurf, {
  QueryData,
} from '~/components/Common/Charts/BaseGamedayTurf';

export const defaultValueFormatter = (value: number) => `$${value.toFixed(4)}`;

export type GamedayDataPoint = BaseDataPoint;

export type GamedayTurfBaseProps = {
  /** */
  document: DocumentNode;
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
  /** True if this turf should be a StackedAreaChard */
  stackedArea?: boolean;
};

type GamedayTurfFinalProps<T extends MinimumViableSnapshotQuery> =
  GamedayTurfBaseProps & {
    /**
     * Which value to display from the Gameday object
     */
    getValue: (snapshot: T['gamedays'][number]) => number;
    /**
     * Format the value from number -> string
     */
    formatValue?: (value: number) => string | JSX.Element;
    dateKey?: 'timestamp' | 'createdAt';
    queryConfig?: Partial<QueryOptions>;
    StatProps: Omit<StatProps, 'amount' | 'subtitle'>;
    LineChartProps?: Pick<BaseChartProps, 'curve' | 'isTWAP'>;
    statsRowFullWidth?: boolean;
  };

/**
 * Wraps {BaseGamedayTurf} with data.
 */
function GamedayTurf<T extends MinimumViableSnapshotQuery>({
  document,
  defaultValue: _defaultValue,
  defaultGameday: _defaultGameday,
  defaultDate: _defaultDate,
  getValue,
  formatValue = defaultValueFormatter,
  height = '175px',
  StatProps: statProps, // renamed to prevent type collision
  LineChartProps,
  dateKey = 'createdAt',
  queryConfig,
  stackedArea,
  statsRowFullWidth,
}: GamedayTurfFinalProps<T>) {
  const timeTabParams = useTimeTabState();
  const getDisplayValue = useCallback((v?: BaseDataPoint[]) => {
    if (!v?.length) return 0;
    const curr = v[0];
    return curr && 'value' in curr ? curr.value : 0;
  }, []);

  const gamedaysQuery = useGamedaysQuery<T>(
    document,
    timeTabParams[0][1],
    queryConfig
  );

  const queryParams = useMemo(
    () => [{ query: gamedaysQuery, getValue, key: 'value' }],
    [gamedaysQuery, getValue]
  );

  const queryData: QueryData = useGenerateChartSeries(
    queryParams,
    timeTabParams[0],
    dateKey,
    stackedArea
  );

  return (
    <BaseGamedayTurf
      queryData={queryData}
      height={height}
      StatProps={statProps}
      timeTabParams={timeTabParams}
      stackedArea={stackedArea}
      formatValue={formatValue}
      ChartProps={{
        getDisplayValue: getDisplayValue,
        tooltip: false,
        ...LineChartProps,
      }}
      statsRowFullWidth={statsRowFullWidth}
    />
  );
}

export default GamedayTurf;
