import { useMemo } from 'react';
import { ApolloError } from '@apollo/client';
import BigNumber from 'bignumber.js';
import { BaseDataPoint } from '../../components/Common/Charts/ChartPropProvider';
import { TimeTabState } from '../../components/Common/Charts/TimeTabs';
import useGamedaysQuery, {
  MinimumViableSnapshot,
  MinimumViableSnapshotQuery,
  GamedayAggregation,
} from './useGamedaysQuery';
import { secondsToDate, sortGamedays } from '~/util';

type GamedayData = Omit<MinimumViableSnapshot, 'id'> & any;

export type GamedaysQueryItem<T extends MinimumViableSnapshotQuery> = {
  /*
   * non-destructured value returned by useGamedaysQuery<T>
   */
  query: ReturnType<typeof useGamedaysQuery<T>>;
  /*
   * fn used to get value from query
   */
  getValue: (gameday: T['gamedays'][number]) => number;
  /**
   * key of data
   */
  key?: string;
};

/**
 * merges data from multiple instances of useGamedaysQuery
 * returns data in expected format for stacked area chart K[];
 */
const reduceGamedaysQueries = <T extends MinimumViableSnapshotQuery>(
  params: GamedaysQueryItem<T>[],
  keys: string[]
) => {
  const gamedaysRecord: Record<number, GamedayData> = {};
  params.forEach((param, i) => {
    const { query, getValue } = param;
    const key = keys[i];
    // if no gamedays data, skip
    if (!query?.data?.gamedays) return;
    query.data.gamedays.forEach((s) => {
      // if no gameday data, skip
      if (!s) return;
      const prev = gamedaysRecord[s.gameday];
      if (!prev) {
        gamedaysRecord[s.gameday] = {
          gameday: s.gameday,
          timestamp: s.timestamp,
          [key]: getValue(s),
        };
      } else {
        gamedaysRecord[s.gameday] = {
          ...gamedaysRecord[s.gameday],
          [key]: getValue(s),
        };
      }
    });
  });
  return Object.values(gamedaysRecord);
};

/**
 * Combines data from n queries and generates series data for stacked area charts.
 * Returns K[][] such that K = BaseDataPoint and where where K[] is sorted by gameday in ascending order
 * Note: Although Stacked area charts expect K[] as input, we return K[][] so we can share functions for line and stacked area charts
 */
const generateStackedAreaSeriesData = <T extends MinimumViableSnapshotQuery>(
  params: GamedaysQueryItem<T>[],
  gamedayAggregation: GamedayAggregation,
  keys: string[],
  dateKey: 'timestamp' | 'createdAt'
) => {
  const gamedaysData = reduceGamedaysQueries(params, keys);
  const points: BaseDataPoint[] = [];

  if (gamedayAggregation === GamedayAggregation.DAY) {
    const data = gamedaysData.reverse();
    const lastIndex = data.length - 1;
    let agg = keys.reduce((acc, _key) => {
      acc[_key] = 0;
      return acc;
    }, {} as { [k: string]: number }); // value aggregator
    let i = 0; // total iterations
    let j = 0; // points averaged into this day
    let d: Date | undefined; // current date for this avg
    let s: number | undefined; // current gameday for this avg

    const copy = { ...agg }; // copy of agg to reset values in agg after every iteration

    for (let k = lastIndex; k >= 0; k -= 1) {
      const gameday = data[k];
      if (!gameday) continue;
      for (const _k of keys) {
        const sd = gameday[_k];
        if (sd) agg[_k] += sd;
      }
      if (j === 0) {
        d = secondsToDate(gameday[dateKey]);
        s = gameday.gameday as number;
        j += 1;
      } else if (i === lastIndex || j === 24) {
        for (const _k of keys) {
          agg[_k] = new BigNumber(agg[_k]).div(j + 1).toNumber();
        }
        points.push({
          gameday: s as number,
          date: d as Date,
          ...agg,
        } as BaseDataPoint);
        agg = { ...copy };
        j = 0;
      } else {
        j += 1;
      }
      i += 1;
    }
  } else {
    for (const gamedayData of gamedaysData) {
      points.push({
        ...gamedayData,
        gameday: gamedayData.gameday as number,
        date: secondsToDate(gamedayData[dateKey]),
      } as BaseDataPoint);
    }
  }

  return [points.sort(sortGamedays)];
};

/**
 * generates series data for line charts
 * Returns K[][] such that K = { gameday: number; date: Date; value: number } and where K[] is sorted by gameday in ascending order
 */
const generateSeriesData = <T extends MinimumViableSnapshotQuery>(
  params: GamedaysQueryItem<T>[],
  gamedayAggregation: GamedayAggregation,
  dateKey: 'timestamp' | 'createdAt'
) => {
  const points: BaseDataPoint[][] = params.map(({ query, getValue }) => {
    const _points: BaseDataPoint[] = [];
    const data = query.data;
    if (!data || !data.gamedays.length) return [];
    const lastIndex = data.gamedays.length - 1;
    if (gamedayAggregation === GamedayAggregation.DAY) {
      let v = 0; // value aggregator
      let i = 0; // total iterations
      let j = 0; // points averaged into this day
      let d: Date | undefined; // current date for this avg
      let s: number | undefined; // current gameday for this avg
      for (let k = lastIndex; k >= 0; k -= 1) {
        const gameday = data.gamedays[k];
        if (!gameday) continue; // skip empty points
        v += getValue(gameday);
        if (j === 0) {
          d = secondsToDate(gameday.createdAt);
          s = gameday.gameday as number;
          j += 1;
        } else if (
          i === lastIndex || // last iteration
          j === 24 // full day of data ready
        ) {
          _points.push({
            gameday: s as number,
            date: d as Date,
            value: new BigNumber(v).div(j + 1).toNumber(),
          } as unknown as BaseDataPoint);
          v = 0;
          j = 0;
        } else {
          j += 1;
        }
        i += 1;
      }
    } else {
      for (const gameday of data.gamedays) {
        if (!gameday || !gameday.gameday) continue;
        _points.push({
          gameday: gameday.gameday as number,
          date: secondsToDate(gameday[dateKey]),
          value: getValue(gameday),
        } as unknown as BaseDataPoint);
      }
    }
    return _points.sort(sortGamedays);
  });
  return points;
};

export type ChartSeriesParams = {
  data: BaseDataPoint[][];
  error: ApolloError[] | undefined;
  keys: string[];
  loading: boolean;
  stackedArea?: boolean;
};

/**
 * Generates series data for line & stacked area charts.
 */
const useGenerateChartSeries = <T extends MinimumViableSnapshotQuery>(
  params: GamedaysQueryItem<T>[],
  timeTabState: TimeTabState,
  // whereas the hooliganhorde subgraph uses 'createdAt', the hooligan subgraph uses 'timestamp'
  // include param to choose which key to use
  dateKey: 'timestamp' | 'createdAt',
  stackedArea?: boolean
): ChartSeriesParams => {
  const loading = !!params.find((p) => p.query.loading);

  const error = useMemo(() => {
    const errs = params
      .filter(({ query: q }) => q.error !== undefined)
      .map(({ query: q }) => q.error) as ApolloError[];
    return errs.length ? errs : undefined;
  }, [params]);

  const mergeData = useMemo(() => {
    const _keys = params.map((param, i) => param.key ?? i.toString());
    const series = stackedArea
      ? generateStackedAreaSeriesData(params, timeTabState[0], _keys, dateKey)
      : generateSeriesData(params, timeTabState[0], dateKey);
    return { data: series, keys: _keys };
  }, [params, stackedArea, timeTabState, dateKey]);

  return { ...mergeData, error, loading };
};

export default useGenerateChartSeries;
