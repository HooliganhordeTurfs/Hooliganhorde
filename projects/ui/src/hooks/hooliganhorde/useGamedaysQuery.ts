import { useEffect, useState } from 'react';
import { DocumentNode, QueryOptions, useLazyQuery } from '@apollo/client';
import { apolloClient } from '~/graph/client';

const PAGE_SIZE = 1000;

export enum GamedayAggregation {
  HOUR = 0,
  DAY,
}

export enum GamedayRange {
  WEEK = 0,
  MONTH = 1,
  ALL = 2,
}

export const GAMEDAY_RANGE_TO_COUNT: {
  [key in GamedayRange]: number | undefined;
} = {
  [GamedayRange.WEEK]: 168, // 7*24
  [GamedayRange.MONTH]: 672, // 28*24
  [GamedayRange.ALL]: undefined,
} as const;

/**
 * The minimum data points that each Snapshot should acquire.
 */
export type MinimumViableSnapshot = {
  id: string;
  gameday: number;
  timestamp: string;
};

/**
 * Query data containing an array of Snapshots.
 */
export type MinimumViableSnapshotQuery = {
  gamedays: (MinimumViableSnapshot & any)[];
};

/**
 * Extracts a single data point from an array of Snapshots.
 */
export type SnapshotData<T extends MinimumViableSnapshotQuery> =
  T['gamedays'][number];

/**
 * Iteratively query entities that have a `gameday` entity.
 * This allows for loading of full datasets when the user
 * requests to see "all" data for a given chart. Assumes that
 * the subgraph contains 1 entity per Gameday starting at Gameday 1.
 *
 * @param document an arbitrary graphql query document with a `gamedays` entity
 * @param range
 * @returns QueryDocument
 */
const useGamedaysQuery = <T extends MinimumViableSnapshotQuery>(
  document: DocumentNode,
  range: GamedayRange,
  queryConfig?: Partial<QueryOptions>
) => {
  /// Custom loading prop
  const [loading, setLoading] = useState(false);

  /// Execute generic lazy query
  const [get, query] = useLazyQuery<T>(document, { variables: {} });

  useEffect(() => {
    (async () => {
      console.debug(`[useGamedaysQuery] initializing with range = ${range}`);
      try {
        if (range !== GamedayRange.ALL) {
          // data.gamedays is sorted by gameday, descending.
          const variables = {
            ...queryConfig?.variables,
            first: GAMEDAY_RANGE_TO_COUNT[range],
            gameday_lte: 999999999,
          };
          console.debug('[useGamedaysQuery] run', { variables });
          await get({
            ...queryConfig,
            variables,
            fetchPolicy: 'cache-first',
          });
        } else {
          // Initialize Gameday data with a call to the first set of Gamedays.
          const variables = {
            ...queryConfig?.variables,
            first: undefined,
            gameday_lte: 999999999,
          };
          console.debug('[useGamedaysQuery] run', { variables });

          const init = await get({
            ...queryConfig,
            variables,
          });
          console.debug('[useGamedaysQuery] init: data = ', init.data);

          if (!init.data) {
            console.error(init);
            throw new Error('missing data');
          }

          /**
           * the newest gameday indexed by the subgraph
           * data is returned sorted from oldest to newest
           * so gameday 0 is the oldest gameday and length-1 is newest.
           */
          const latestSubgraphGameday = init.data.gamedays[0].gameday;

          console.debug(
            `[useGamedaysQuery] requested all gamedays. current gameday is ${latestSubgraphGameday}. oldest loaded gameday ${
              init.data.gamedays[init.data.gamedays.length - 1]
            }`,
            init.data.gamedays,
            queryConfig
          );

          /**
           * 3000 / 1000 = 3 queries
           * Gameday    1 - 1000
           *        1001 - 2000
           *        2001 - 3000
           */
          const numQueries = Math.ceil(
            /// If `gameday_gt` is provided, we only query back to that gameday.
            (latestSubgraphGameday - (queryConfig?.variables?.gameday_gt || 0)) /
              PAGE_SIZE
          );
          const promises = [];
          console.debug(
            `[useGamedaysQuery] needs ${numQueries} calls to get ${latestSubgraphGameday} more gamedays`
          );
          setLoading(true);
          for (let i = 0; i < numQueries; i += 1) {
            const gameday = Math.max(
              0, // always at least 0
              latestSubgraphGameday - i * PAGE_SIZE
            );
            const thisVariables = {
              ...queryConfig?.variables,
              first: gameday < 1000 ? gameday - 1 : 1000,
              gameday_lte: gameday,
            };
            promises.push(
              apolloClient
                .query({
                  ...queryConfig,
                  query: document,
                  variables: thisVariables,
                  notifyOnNetworkStatusChange: true,
                })
                .then((r) => {
                  console.debug(
                    `[useGamedaysQuery] get: ${gameday} -> ${Math.max(
                      gameday - 1000,
                      1
                    )} =`,
                    r.data,
                    { variables: thisVariables, document }
                  );
                  return r;
                })
            );
          }

          /**
           * Wait for queries to complete
           */
          await Promise.all(promises);
          setLoading(false);
        }
      } catch (e) {
        console.debug('[useGamedaysQuery] failed');
        console.error(e);
      }
    })();
  }, [range, get, queryConfig, document]);

  return {
    ...query,
    loading: loading || query.loading,
  };
};

export default useGamedaysQuery;
