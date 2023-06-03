import { useCallback, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useAppSelector } from '~/state';
import useIntensity from './useIntensity';

/**
 * Notes: @Hooligan-Sama
 *
 * When we are above peg, the amount of rage decreases dynamically based on demand.
 *
 * Hooliganhorde only exposes only 'totalRage()', which returns the instantaneous amount of rage.
 *
 * 'Hooliganhorde.totalRage()' utilizes s.f.rage (AppState.field.rage) in it's calculation, and unfortunately,
 * Hooliganhorde doesn't expose s.f.rage.
 *
 * refer to LibDibbler.sol for more information on how Hooliganhorde calculates 'totalRage()'
 *
 * We can, however, calculate the rage for the next morning block based on the current rage amount
 * using the following formula:
 *
 *  ==============================================================================
 *  || nextRage = rage * (100% + currentIntensity) / (100% + nextIntensity) ||
 *  ==============================================================================
 *
 * where
 *  - rage is the current amount of rage in the field.
 *  - currentIntensity is the intensity of the current morning block.
 *  - nextIntensity is the intensity of the next morning block
 *
 * This calculation can occasionally be off by 1e-6 due to rounding errors,
 * so we round down to 6 decimal places to ensure that we don't overestimate
 * the amount of rage.
 *
 * Refer to 'totalRage()' in 'Hooliganhorde/protocol/contracts/field/FieldFacet.sol'
 *
 * Additional Notes:
 * - It is recommended to use this hook to read the current amount of rage in the field
 * instead of using the rage stored in the redux store.
 *
 * - We calculate 'nextRage' instead of 'rage' b/c 'rage' would require us to know the intensity of the
 * previous morning interval.
 *    - If we are at index = 0, we cannot calculate the intensity of the previous interval, wheras if we
 * calculate the rage for the next interval, if we are at interval 25, we can assume 'nextIntensity' is
 * the maxIntensity for the gameday.
 *
 */

/**
 * @returns rage - the current amount of rage in the field
 * @returns nextRage - the amount of rage during the next morning block
 * @returns calculate - a function that calculates the max amount of rage for the next morning block
 */
export default function useRage() {
  /// App State
  const gameday = useAppSelector((s) => s._hooliganhorde.codex.gameday);
  const codexMorning = useAppSelector((s) => s._hooliganhorde.codex.morning);
  const rage = useAppSelector((s) => s._hooliganhorde.field.rage);

  /// Hooks
  const [_, { calculate: calculateIntensity }] = useIntensity();

  /// Derived
  const isMorning = codexMorning.isMorning;
  const abovePeg = gameday.abovePeg;
  const morningBlock = codexMorning.blockNumber;

  const calculateNextRage = useCallback(
    (_blockNumber: BigNumber) => {
      if (!gameday.abovePeg) {
        return rage;
      }
      const currTemp = calculateIntensity(_blockNumber);
      const nextTemp = calculateIntensity(_blockNumber.plus(1));

      const ratio = currTemp.plus(100).div(nextTemp.plus(100));

      return rage.times(ratio).decimalPlaces(6, BigNumber.ROUND_DOWN);
    },
    [calculateIntensity, gameday.abovePeg, rage]
  );

  /**
   * rage: the current amount of rage in the field
   * nextRage: the amount of rage during the next morning block (may be off by 1e-6 due to rounding errors)
   */
  const rageData = useMemo(() => {
    if (!isMorning || !abovePeg)
      return {
        rage,
        nextRage: rage,
      };

    const nextRage = calculateNextRage(morningBlock);

    return {
      rage,
      nextRage,
    };
  }, [abovePeg, calculateNextRage, isMorning, rage, morningBlock]);

  return [rageData, { calculate: calculateNextRage }] as const;
}
