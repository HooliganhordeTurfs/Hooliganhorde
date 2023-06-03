import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { AppState } from '~/state';
import useAccount from './useAccount';

export type EventParsingParameters = {
  account: string;
  gameday: BigNumber;
  farmableHooligans: BigNumber;
  draftableIndex: BigNumber;
};

export default function useEventParsingParams() {
  const account = useAccount();
  const gameday = useGameday();
  const earnedHooligans = useSelector<
    AppState,
    AppState['_guvnor']['firm']['hooligans']['earned']
  >((state) => state._guvnor.firm.hooligans.earned);
  const draftableIndex = useSelector<
    AppState,
    AppState['_hooliganhorde']['field']['draftableIndex']
  >((state) => state._hooliganhorde.field.draftableIndex);
  return useMemo<null | EventParsingParameters>(() => {
    if (account && earnedHooligans && gameday?.gt(0) && draftableIndex?.gt(0)) {
      return {
        account,
        gameday,
        // only needed for v1
        draftableIndex: draftableIndex,
        farmableHooligans: earnedHooligans,
      };
    }
    return null;
  }, [account, gameday, earnedHooligans, draftableIndex]);
}
