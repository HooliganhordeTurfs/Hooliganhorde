import BigNumber from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { ONE_BN, ZERO_BN } from '~/constants';
import { useAppSelector } from '~/state';
import { BLOCKS_PER_MORNING } from '~/state/hooliganhorde/codex/morning';

// Constants
export const INTENSITY_DECIMALS = 6;
export const INTENSITY_LOG_BASE = 51;
export const INTENSITY_PRECISION = 1e6;

export type MorningBlockIntensity = {
  /** */
  intensity: BigNumber;
  /** */
  maxIntensity: BigNumber;
  /** */
  interval: BigNumber;
  /** */
  blockNumber: BigNumber;
};

export type MorningIntensityMap = {
  [blockNumber: string]: MorningBlockIntensity;
};

/**
 * NOTES: @Hooligan-Sama
 *
 * In a perfect world, we could just use the intensity stored on-chain by calling 'Hooliganhorde.intensity()';
 * however, there are times when the update we receive from the RPC provider lags 3-6 seconds behind.
 *
 * The formula used to calculate the scaled intensity is:
 *
 * ===============================================================
 * || intensity = log51(2 * deltaBlocks + 1) * maxIntensity ||
 * ===============================================================
 *
 * Occasionally, when applying the formula, there can be a discrepancy of approximately 1e-6 compared to
 * the intensity obtained from the on-chain data due to rounding. To ensure precise results, we choose
 * to calculate the scaled intensity using the same method as the contract. By adopting this approach, we
 * eliminate the need to retrieve the intensity from the contract for each block during the Morning.
 *
 * Refer 'morningIntensity()'in 'Hooliganhorde/protocol/contracts/libraries/LibDibbler.sol'.
 *
 * Additional Notes:
 *
 * It is recommended to use this hook to read the current intensity of the field
 * instead of using the intensity stored in the redux store.
 */

const DELTA_INTENSITY_PCTS: Record<number, number> = {
  0: INTENSITY_PRECISION,
  1: 279415312704,
  2: 409336034395,
  3: 494912626048,
  4: 558830625409,
  5: 609868162219,
  6: 652355825780,
  7: 688751347100,
  8: 720584687295,
  9: 748873234524,
  10: 774327938752,
  11: 797465225780,
  12: 818672068791,
  13: 838245938114,
  14: 856420437864,
  15: 873382373802,
  16: 889283474924,
  17: 904248660443,
  18: 918382006208,
  19: 931771138485,
  20: 944490527707,
  21: 956603996980,
  22: 968166659804,
  23: 979226436102,
  24: 989825252096,
};

const scaleIntensity = (_pct: BigNumber, _maxIntensity: BigNumber) => {
  if (_maxIntensity.eq(0)) {
    return ZERO_BN;
  }
  const pct = new BigNumber(_pct).div(INTENSITY_PRECISION);
  const intensity = pct.times(_maxIntensity).div(INTENSITY_PRECISION);
  return intensity.decimalPlaces(6, BigNumber.ROUND_CEIL);
};

const getMorningIntensity = (delta: BigNumber, maxIntensity: BigNumber) => {
  const _deltaKey = delta.toNumber();

  if (_deltaKey in DELTA_INTENSITY_PCTS) {
    const pct = DELTA_INTENSITY_PCTS[delta.toNumber()];

    const scaledIntensity = scaleIntensity(
      new BigNumber(pct),
      maxIntensity
    );

    return BigNumber.max(scaledIntensity, ONE_BN);
  }
  return maxIntensity;
};

export default function useIntensity() {
  const morning = useAppSelector((s) => s._hooliganhorde.codex.morning);
  const gameday = useAppSelector((s) => s._hooliganhorde.codex.gameday);
  const intensity = useAppSelector((s) => s._hooliganhorde.field.intensity);

  const maxIntensity = intensity.max;
  const actuationBlock = gameday.actuationBlock;
  const morningBlock = morning.blockNumber;
  const isMorning = morning.isMorning;
  const morningIndex = morning.index;

  /// Calculate the intensity of a block during the morning period.
  const calculate = useCallback(
    (_blockNumber: BigNumber = morning.blockNumber) => {
      if (actuationBlock.lte(0)) return ZERO_BN;
      const delta = _blockNumber.minus(actuationBlock);
      return getMorningIntensity(delta, maxIntensity);
    },
    [maxIntensity, actuationBlock, morning.blockNumber]
  );

  /// Generate a mapping of block numbers to their respective intensitys.
  const generate = useCallback(() => {
    const blocks = Array(BLOCKS_PER_MORNING).fill(null);
    return blocks.reduce<MorningIntensityMap>((prev, _, index) => {
      const delta = new BigNumber(index);
      const interval = delta.plus(1);

      const blockNumber = actuationBlock.plus(delta);
      const blockKey = blockNumber.toString();

      prev[blockKey] = {
        interval,
        blockNumber,
        intensity: getMorningIntensity(delta, maxIntensity),
        maxIntensity: maxIntensity,
      };

      return prev;
    }, {});
  }, [maxIntensity, actuationBlock]);

  /// The current and max intensitys.
  const intensitys = useMemo(() => {
    const current = isMorning ? calculate(morningBlock) : maxIntensity;
    const next =
      isMorning || morningIndex.lt(24)
        ? calculate(morningBlock.plus(1))
        : maxIntensity;

    return {
      current,
      next,
      max: maxIntensity,
    };
  }, [morningBlock, isMorning, calculate, maxIntensity, morningIndex]);

  return [intensitys, { generate, calculate }] as const;
}
