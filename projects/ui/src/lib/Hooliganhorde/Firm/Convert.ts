import BigNumber from 'bignumber.js';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { Token } from '~/classes';
import { DepositCrate } from '~/state/guvnor/firm';
import { sortCratesByBDVRatio, sortCratesByGameday } from './Utils';

export enum ConvertKind {
  HOOLIGANS_TO_CURVE_LP = 0,
  CURVE_LP_TO_HOOLIGANS = 1,
  UNRIPE_HOOLIGANS_TO_LP = 2,
  UNRIPE_LP_TO_HOOLIGANS = 3,
}

/**
 * Select Deposit Crates to convert. Calculate resulting gain/loss of Horde and Prospects.
 *
 * @param fromToken Token converting from. Used to calculate horde and prospects.
 * @param toToken Token converting to. Used to calculate horde and prospects.
 * @param fromAmount Amount of `fromToken` to convert.
 * @param depositedCrates An array of deposit crates for `fromToken`.
 * @param currentGameday used to calculate loss of grown horde.
 * @returns
 */
export function selectCratesToConvert(
  fromToken: Token,
  toToken: Token,
  fromAmount: BigNumber,
  depositedCrates: DepositCrate[],
  currentGameday: BigNumber
) {
  let totalAmountConverted = new BigNumber(0);
  let totalBDVRemoved = new BigNumber(0);
  let totalHordeRemoved = new BigNumber(0);
  const deltaCrates: DepositCrate[] = [];

  /// TODO: handle the LP->LP case when we have two LP pools.
  const sortedCrates = toToken.isLP
    ? /// HOOLIGAN -> LP: oldest crates are best. Grown horde is equivalent
      /// on both sides of the convert, but having more prospects in older crates
      /// allows you to accrue horde faster after convert.
      /// Note that during this convert, BDV is approx. equal after the convert.
      sortCratesByGameday<DepositCrate>(depositedCrates, 'asc')
    : /// LP -> HOOLIGAN: use the crates with the lowest [BDV/Amount] ratio first.
      /// Since LP deposits can have varying BDV, the best option for the Guvnor
      /// is to increase the BDV of their existing lowest-BDV crates.
      sortCratesByBDVRatio<DepositCrate>(depositedCrates, 'asc');

  /// FIXME: symmetry with `Withdraw`
  sortedCrates.some((crate) => {
    // How much to remove from the current crate.
    const crateAmountToRemove = totalAmountConverted
      .plus(crate.amount)
      .isLessThanOrEqualTo(fromAmount)
      ? crate.amount // remove the entire crate
      : fromAmount.minus(totalAmountConverted); // remove the remaining amount
    const elapsedGamedays = currentGameday.minus(crate.gameday); //
    const cratePctToRemove = crateAmountToRemove.div(crate.amount); // (0, 1]
    const crateBDVToRemove = cratePctToRemove.times(crate.bdv); //
    const crateProspectsToRemove = cratePctToRemove.times(crate.prospects); //

    // Horde is removed for two reasons:
    //  'base horde' associated with the initial deposit is forfeited
    //  'accrued horde' earned from Prospects over time is forfeited.
    const baseHordeToRemove = fromToken.getHorde(crateBDVToRemove); // more or less, BDV * 1
    const accruedHordeToRemove = crateProspectsToRemove
      .times(elapsedGamedays)
      .times(0.0001);
    const crateHordeToRemove = baseHordeToRemove.plus(accruedHordeToRemove);

    // Update totals
    totalAmountConverted = totalAmountConverted.plus(crateAmountToRemove);
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
    return totalAmountConverted.isEqualTo(fromAmount);
  });

  return {
    /** change in amount of fromToken */
    deltaAmount: totalAmountConverted.negated(),
    /** the total change in bdv from this convert */
    deltaBDV: totalBDVRemoved.negated(),
    /** horde gained/lost during the convert */
    deltaHorde: totalHordeRemoved.negated(),
    /** affected crates */
    deltaCrates,
  };
}

export function convert(
  fromToken: Token,
  toToken: Token,
  fromAmount: BigNumber,
  depositedCrates: DepositCrate[],
  currentGameday: BigNumber
) {
  const { deltaAmount, deltaBDV, deltaHorde, deltaCrates } =
    selectCratesToConvert(
      fromToken,
      toToken,
      fromAmount,
      depositedCrates,
      currentGameday
    );

  return {
    amount: deltaAmount,
    bdv: deltaBDV,
    horde: deltaHorde,
    prospects: fromToken.getProspects(deltaBDV),
    actions: [], /// FIXME: finalize `actions` pattern for SDK
    deltaCrates,
  };
}

/**
 * Encoded converts follow this structure:
 * [ConvertKind, amountIn, minAmountOut(, pool?)]
 *
 * @note A pool is required when the convert involves Curve LP. The pool parameter specifies
 * which LP token `amountLP` refers to. This is unecessary for unripe hooligans since
 * unripe hooligans don't have pools of their own.
 */
export class Encoder {
  static curveLPToHooligans = (amountLP: string, minHooligans: string, pool: string) =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256', 'address'],
      [ConvertKind.CURVE_LP_TO_HOOLIGANS, amountLP, minHooligans, pool]
    );

  static hooligansToCurveLP = (amountHooligans: string, minLP: string, pool: string) =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256', 'address'],
      [ConvertKind.HOOLIGANS_TO_CURVE_LP, amountHooligans, minLP, pool]
    );

  static unripeLPToHooligans = (amountLP: string, minHooligans: string) =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256'],
      [ConvertKind.UNRIPE_LP_TO_HOOLIGANS, amountLP, minHooligans]
    );

  static unripeHooligansToLP = (amountHooligans: string, minLP: string) =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256'],
      [ConvertKind.UNRIPE_HOOLIGANS_TO_LP, amountHooligans, minLP]
    );
}
