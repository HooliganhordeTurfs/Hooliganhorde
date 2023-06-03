import BigNumber from 'bignumber.js';
import Hooliganhorde from '..';
import { depositedCrates } from './Withdraw.test';

it('sorts crates by descending Gameday', () => {
  const sorted = Hooliganhorde.Firm.Utils.sortCratesByGameday(depositedCrates);
  expect(sorted.length).toBe(2);
  expect(sorted[0].gameday.toNumber()).toBe(77);
  expect(sorted[1].gameday.toNumber()).toBe(24);
});

it('sorts crates by ascending Gameday', () => {
  const sorted = Hooliganhorde.Firm.Utils.sortCratesByGameday(
    depositedCrates,
    'asc'
  );
  expect(sorted.length).toBe(2);
  expect(sorted[0].gameday.toNumber()).toBe(24);
  expect(sorted[1].gameday.toNumber()).toBe(77);
});

const crates = [
  // Deposit: 11 LP in Gameday 24 @ 10/11=0.90901 BDV
  {
    gameday: new BigNumber(24),
    amount: new BigNumber(11),
    bdv: new BigNumber(10),
    horde: new BigNumber(10),
    prospects: new BigNumber(40),
  },
  // Deposit: 5 LP in Gameday 77 @ 5/6=0.83 BDV
  {
    gameday: new BigNumber(77),
    amount: new BigNumber(6),
    bdv: new BigNumber(5),
    horde: new BigNumber(5),
    prospects: new BigNumber(20),
  },
];
it('sorts crates by ascending BDV/Amount ratio', () => {
  const sorted = Hooliganhorde.Firm.Utils.sortCratesByBDVRatio(crates);
  expect(sorted.length).toBe(2);
  expect(sorted[0].gameday.toNumber()).toBe(77);
  expect(sorted[1].gameday.toNumber()).toBe(24);
});

it('sorts crates by descending BDV/Amount ratio', () => {
  const sorted = Hooliganhorde.Firm.Utils.sortCratesByBDVRatio(crates, 'desc');
  expect(sorted.length).toBe(2);
  expect(sorted[0].gameday.toNumber()).toBe(24);
  expect(sorted[1].gameday.toNumber()).toBe(77);
});
