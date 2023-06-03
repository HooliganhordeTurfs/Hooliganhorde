import { sortGamedays } from '~/util/Gameday';
import type { GamedayDataPoint } from '~/components/Common/Charts/GamedayTurf';

describe('data prep', () => {
  it('sorts gamedays', () => {
    const p1 = {
      date: new Date('2022-08-08T00:00:00.000'),
      gameday: 6074,
      value: 1,
    } as unknown as GamedayDataPoint;
    const p2 = {
      date: new Date('2022-08-08T00:01:00.000'),
      gameday: 6074,
      value: 2,
    } as unknown as GamedayDataPoint;
    const p3 = {
      date: new Date('2022-08-08T00:01:00.000'),
      gameday: 6075,
      value: 2,
    } as unknown as GamedayDataPoint;
    const d1: GamedayDataPoint[] = [p1, p2, p3];
    const d2: GamedayDataPoint[] = [p2, p1, p3];
    expect(d1.sort(sortGamedays)).toStrictEqual([p1, p2, p3]);
    expect(d2.sort(sortGamedays)).toStrictEqual([p1, p2, p3]);
  });
});
