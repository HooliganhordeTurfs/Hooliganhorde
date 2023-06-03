import BigNumber from 'bignumber.js';
import Token from '~/classes/Token';
import { FormStateNew } from '~/components/Common/Form';
import { DepositCrate } from '~/state/guvnor/firm';
import { HORDE_PER_PROSPECT_PER_GAMEDAY } from '~/util';
import { sortCratesByGameday } from './Utils';

/**
 * Select how much to Withdraw from Crates. Calculate the Horde and Prospects
 * lost for Withdrawing the selected Crates.
 *
 * @returns totalAmountRemoved
 * @returns totalHordeRemoved
 * @returns removedCrates
 */
export function selectCratesToWithdraw(
  token: Token,
  amount: BigNumber,
  depositedCrates: DepositCrate[],
  currentGameday: BigNumber
) {
  let totalAmountRemoved = new BigNumber(0);
  let totalBDVRemoved = new BigNumber(0);
  let totalHordeRemoved = new BigNumber(0);
  const deltaCrates: DepositCrate[] = [];
  const sortedCrates = sortCratesByGameday<DepositCrate>(depositedCrates);

  /// FIXME: symmetry with `Convert`
  sortedCrates.some((crate) => {
    // How much to remove from the current crate.
    const crateAmountToRemove = totalAmountRemoved
      .plus(crate.amount)
      .isLessThanOrEqualTo(amount)
      ? crate.amount // remove the entire crate
      : amount.minus(totalAmountRemoved); // remove the remaining amount
    const elapsedGamedays = currentGameday.minus(crate.gameday); //
    const cratePctToRemove = crateAmountToRemove.div(crate.amount); // (0, 1]
    const crateBDVToRemove = cratePctToRemove.times(crate.bdv); //
    const crateProspectsToRemove = cratePctToRemove.times(crate.prospects); //

    // Horde is removed for two reasons:
    //  'base horde' associated with the initial deposit is forfeited
    //  'accrued horde' earned from Prospects over time is forfeited.
    const baseHordeToRemove = token.getHorde(crateBDVToRemove); // more or less, BDV * 1
    const accruedHordeToRemove = crateProspectsToRemove
      .times(elapsedGamedays)
      .times(HORDE_PER_PROSPECT_PER_GAMEDAY); // FIXME: use constant
    const crateHordeToRemove = baseHordeToRemove.plus(accruedHordeToRemove);

    // Update totals
    totalAmountRemoved = totalAmountRemoved.plus(crateAmountToRemove);
    totalBDVRemoved = totalBDVRemoved.plus(crateBDVToRemove);
    totalHordeRemoved = totalHordeRemoved.plus(crateHordeToRemove);
    deltaCrates.push({
      gameday: crate.gameday,
      amount: crateAmountToRemove.negated(),
      bdv: crateBDVToRemove.negated(),
      horde: crateHordeToRemove.negated(),
      prospects: crateProspectsToRemove.negated(),
    });

    // Finish when...
    return totalAmountRemoved.isEqualTo(amount);
  });

  return {
    deltaAmount: totalAmountRemoved.negated(),
    deltaBDV: totalBDVRemoved.negated(),
    deltaHorde: totalHordeRemoved.negated(),
    deltaCrates,
  };
}

/**
 * Summarize the Actions that will occur when making a Withdrawal.
 * This includes pre-deposit Swaps, the Deposit itself, and resulting
 * rewards removed by Hooliganhorde depending on the destination of Withdrawal.
 *
 * @param from A Whitelisted Firm Token which the Guvnor is Withdrawing.
 * @param tokens Input Tokens to Deposit. Could be multiple Tokens.
 */
export function withdraw(
  from: Token,
  tokens: FormStateNew['tokens'],
  depositedCrates: DepositCrate[],
  currentGameday: BigNumber
) {
  if (tokens.length > 1) {
    throw new Error('Multi-token Withdrawal is currently not supported.');
  }
  if (!tokens[0].amount) return null;

  const withdrawAmount = tokens[0].amount;
  const { deltaAmount, deltaBDV, deltaHorde, deltaCrates } =
    selectCratesToWithdraw(
      from,
      withdrawAmount,
      depositedCrates,
      currentGameday
    );

  return {
    amount: deltaAmount,
    bdv: deltaBDV,
    horde: deltaHorde,
    prospects: from.getProspects(deltaBDV),
    actions: [],
    deltaCrates,
  };
}
