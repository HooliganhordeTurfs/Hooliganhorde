import { ZERO_BN } from '~/constants';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import useGuvnorFirmBalances from '~/hooks/guvnor/useGuvnorFirmBalances';

/**
 * @note unused as of 10/21/2022.
 */
export default function useGuvnorHordeSources() {
  const balances = useGuvnorFirmBalances();
  const gameday = useGameday();

  return Object.keys(balances).reduce(
    (prev, curr) => {
      const crates = balances[curr].deposited.crates;
      if (!gameday) return prev;
      crates.forEach((crate) => {
        const elapsedGamedays = gameday.minus(crate.gameday);
        prev.base = prev.base.plus(crate.horde);
        prev.grown = prev.grown.plus(
          crate.prospects.times(elapsedGamedays).times(0.0001) // FIXME: make this a constant or helper function
        );
      });
      return prev;
    },
    {
      base: ZERO_BN,
      grown: ZERO_BN,
    }
  );
}
