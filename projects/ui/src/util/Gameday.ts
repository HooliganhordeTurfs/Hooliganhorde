import { GamedayDataPoint } from '~/components/Common/Charts/GamedayTurf';

/**
 * Sort Gameday data points from oldest to newest.
 * If two data points have the same gameday, use the included `date`.
 */
export const sortGamedays = <T extends Omit<GamedayDataPoint, 'value'>>(
  a: T,
  b: T
) => {
  const diff = a.gameday - b.gameday; // 6074 - 6073 = +1 -> put a after b
  if (diff !== 0) return diff; //
  if (!a.date || !b.date) return 0;
  return a.date > b.date ? 1 : -1; // 8/8 > 8/7 => +1 -> put a after b
};
