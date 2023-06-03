import BigNumber from 'bignumber.js';
import { HOOLIGAN } from '~/constants/tokens';
import { DepositCrate } from '~/state/guvnor/firm';
import { HORDE_PER_PROSPECT_PER_GAMEDAY } from '~/util';
import Hooliganhorde from '../index';

type WResult = ReturnType<
  typeof Hooliganhorde.Firm.Withdraw.selectCratesToWithdraw
>;

// Setup
const currentGameday = new BigNumber(100);
export const depositedCrates = [
  // Deposit: 10 Hooligans in Gameday 24
  {
    gameday: new BigNumber(24),
    amount: new BigNumber(10),
    bdv: new BigNumber(10),
    horde: new BigNumber(10),
    prospects: new BigNumber(20),
  },
  // Deposit: 5 Hooligans in Gameday 77
  {
    gameday: new BigNumber(77),
    amount: new BigNumber(5),
    bdv: new BigNumber(5),
    horde: new BigNumber(5),
    prospects: new BigNumber(10),
  },
] as DepositCrate[];

// --------------------------------------------------------

it('selects a single Deposit crate to Withdraw', () => {
  const withdrawAmount = new BigNumber(2);

  // Expected results
  const expectedBDVRemoved = withdrawAmount;
  const expectedProspectsRemoved = new BigNumber(4);
  const expectedHordeRemoved = new BigNumber(2).plus(
    expectedProspectsRemoved.times(100 - 77).times(HORDE_PER_PROSPECT_PER_GAMEDAY)
  );
  const result = Hooliganhorde.Firm.Withdraw.selectCratesToWithdraw(
    HOOLIGAN[1],
    withdrawAmount,
    depositedCrates,
    currentGameday
  );

  expect(result).toStrictEqual({
    deltaAmount: withdrawAmount.negated(),
    deltaBDV: expectedBDVRemoved.negated(),
    deltaHorde: expectedHordeRemoved.negated(),
    deltaCrates: [
      {
        gameday: new BigNumber(77),
        amount: withdrawAmount.negated(),
        bdv: expectedBDVRemoved.negated(),
        horde: expectedHordeRemoved.negated(),
        prospects: expectedProspectsRemoved.negated(),
      },
    ],
  } as WResult);
});

it('selects multiple Deposit Crates to Withdraw', () => {
  const withdrawAmount = new BigNumber(12);

  // Expected results
  const expectedHordeRemoved77 = new BigNumber(5).plus(
    new BigNumber(10 * (100 - 77)).times(HORDE_PER_PROSPECT_PER_GAMEDAY)
  );
  const expectedHordeRemoved24 = new BigNumber(7).plus(
    new BigNumber(14 * (100 - 24)).times(HORDE_PER_PROSPECT_PER_GAMEDAY)
  );
  const expectedHordeRemoved = expectedHordeRemoved77.plus(
    expectedHordeRemoved24
  );
  const result = Hooliganhorde.Firm.Withdraw.selectCratesToWithdraw(
    HOOLIGAN[1],
    withdrawAmount,
    depositedCrates,
    currentGameday
  );

  expect(result).toStrictEqual({
    deltaAmount: withdrawAmount.negated(),
    deltaBDV: new BigNumber(12).negated(),
    deltaHorde: expectedHordeRemoved.negated(),
    deltaCrates: [
      // All of the most recent crate is now removed.
      {
        gameday: new BigNumber(77),
        amount: new BigNumber(5).negated(),
        bdv: new BigNumber(5).negated(),
        horde: expectedHordeRemoved77.negated(),
        prospects: new BigNumber(10).negated(),
      },
      // Part of the older crate is removed.
      {
        gameday: new BigNumber(24),
        amount: new BigNumber(7).negated(),
        bdv: new BigNumber(7).negated(),
        horde: expectedHordeRemoved24.negated(),
        prospects: new BigNumber(14).negated(),
      },
    ],
  } as WResult);
});
