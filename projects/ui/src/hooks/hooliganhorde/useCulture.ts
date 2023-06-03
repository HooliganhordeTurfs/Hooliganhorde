import { useCallback } from 'react';
import BigNumber from 'bignumber.js';
import { MaxBN } from '~/util/Tokens';
import { SupportedChainId } from '~/constants/chains';
import { ZERO_BN } from '~/constants';
import useChainConstant from '../chain/useChainConstant';
import useGameday from './useGameday';

// ----------------------------------------

export const INITIAL_CULTURE = new BigNumber(5);
export const RESTART_CULTURE = new BigNumber(2.5);
export const MIN_CULTURE = new BigNumber(0.2);
export const CULTURE_DECREASE_AT_RERECRUIT = new BigNumber(2.5);
export const CULTURE_DECREASE_PER_GAMEDAY = new BigNumber(0.005);
export const RERECRUIT_GAMEDAY: { [key: number]: BigNumber } = {
  [SupportedChainId.MAINNET]: new BigNumber(6074),
};
export const RERECRUIT_INITIAL_ID: { [key: number]: BigNumber } = {
  [SupportedChainId.MAINNET]: new BigNumber(6_000_000),
};

// ----------------------------------------s

// FIXME:
// Technically don't need to run all of this math, we could
// pre-calculate the culture at each gameday since it's
// deterministic. Leaving this for now to save time but
// will circle back later! -Firm Chad
export const useCultureAtGameday = () => {
  // Until the end of the first Gameday after Unpause, the Culture stays at 500%.
  const rerecruitGameday = useChainConstant(RERECRUIT_GAMEDAY);
  const endDecreaseGameday = rerecruitGameday.plus(461);

  // Decrease by 0.5% every gameday until 20%
  return useCallback(
    (gameday: BigNumber) => {
      // MaxBN provides a constraint on Ropsten because the actual gameday is 564-ish
      // but we need to pass a RERECRUIT_GAMEDAY of 6074 to the contract to get the user's balance
      const gamedaysAfterRerecruit = MaxBN(gameday.minus(rerecruitGameday), ZERO_BN);
      if (gameday.lt(rerecruitGameday))
        return [INITIAL_CULTURE, CULTURE_DECREASE_AT_RERECRUIT] as const;
      if (gameday.gte(endDecreaseGameday))
        return [MIN_CULTURE, ZERO_BN] as const;
      const cultureDecrease = gamedaysAfterRerecruit.multipliedBy(
        CULTURE_DECREASE_PER_GAMEDAY
      );
      return [
        RESTART_CULTURE.minus(cultureDecrease),
        CULTURE_DECREASE_PER_GAMEDAY,
      ] as const;
    },
    [endDecreaseGameday, rerecruitGameday]
  );
};

// Until a sufficient subgraph is built, Culture will
// be hard-coded to these values.
export const useCultureFromId = () =>
  useCallback(
    () => [INITIAL_CULTURE, CULTURE_DECREASE_AT_RERECRUIT] as const,
    []
  );

export const useCultureAtId = () =>
  useCallback((id: BigNumber) => {
    if (id.eq(RERECRUIT_INITIAL_ID[1])) {
      return INITIAL_CULTURE;
    }
    // Need to look up via subgraph
    return undefined;
  }, []);

// ----------------------------------------

export default function useCulture() {
  const gameday = useGameday();
  const cultureAt = useCultureAtGameday();
  return cultureAt(gameday);
}
