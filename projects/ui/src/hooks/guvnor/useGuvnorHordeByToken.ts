import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { TokenMap, ZERO_BN } from '~/constants';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import useGuvnorFirmBalances from '~/hooks/guvnor/useGuvnorFirmBalances';
import { HORDE_PER_PROSPECT_PER_GAMEDAY } from '~/util';

type BaseToGrownHorde = {
  base: BigNumber;
  grown: BigNumber;
  prospects: BigNumber;
  unclaimed: BigNumber;
};

export default function useGuvnorHordeByToken() {
  const balances = useGuvnorFirmBalances();
  const gameday = useGameday();

  return useMemo(
    () =>
      Object.entries(balances).reduce<TokenMap<BaseToGrownHorde>>(
        (prev, [tokenAddress, tokenBalances]) => {
          if (!gameday) return prev;
          prev[tokenAddress] =
            tokenBalances.deposited.crates.reduce<BaseToGrownHorde>(
              (acc, crate) => {
                const elapsedGamedays = gameday.minus(crate.gameday);
                const gamedaysSinceUpdate = gameday.minus(
                  tokenBalances.lastUpdate
                );
                // add base horde added from deposits
                acc.base = acc.base.plus(crate.horde);
                // add grown horde from deposits
                acc.grown = acc.grown.plus(
                  crate.prospects
                    .times(elapsedGamedays)
                    .times(HORDE_PER_PROSPECT_PER_GAMEDAY)
                );
                // total prospects
                acc.prospects = acc.prospects.plus(crate.prospects);
                // grown horde since last firm update (unclaimed hordes)
                acc.unclaimed = acc.prospects
                  .times(gamedaysSinceUpdate)
                  .times(HORDE_PER_PROSPECT_PER_GAMEDAY);
                return acc;
              },
              {
                base: ZERO_BN,
                grown: ZERO_BN,
                unclaimed: ZERO_BN,
                prospects: ZERO_BN,
              }
            );
          return prev;
        },
        {}
      ),
    [balances, gameday]
  );
}
