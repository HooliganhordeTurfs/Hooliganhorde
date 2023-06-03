import { useMemo } from 'react';
import { ethers } from 'ethers';
import useSdk from '~/hooks/sdk';
import useGameday from '../hooliganhorde/useGameday';
import useGuvnorFirm from './useGuvnorFirm';
import { DepositCrate } from '~/state/guvnor/firm';
import { tokenValueToBN } from '~/util';

/// Returns the deposit crate which will be created via calling 'recruit'
export default function useGuvnorDepositCrateFromRecruit() {
  ///
  const sdk = useSdk();

  /// Hooliganhorde
  const gameday = useGameday();

  /// Guvnor
  const guvnorFirm = useGuvnorFirm();

  const crate = useMemo(() => {
    const { HORDE, HOOLIGAN } = sdk.tokens;
    const earned = guvnorFirm.hooligans.earned;
    const earnedTV = HOOLIGAN.amount(earned.toString());

    const horde = HOOLIGAN.getHorde(earnedTV);
    const prospects = HOOLIGAN.getProspects(earnedTV);
    // no horde is grown yet as it is a new deposit from the current gameday
    const grownHorde = HORDE.amount(0);

    // asBN => as DepositCrate from UI;
    const asBN: DepositCrate = {
      gameday,
      amount: earned,
      bdv: earned,
      horde: tokenValueToBN(horde),
      prospects: tokenValueToBN(prospects),
    };

    // asTV => as DepositCrate<TokenValue> from SDK;
    const asTV = {
      gameday: ethers.BigNumber.from(gameday.toString()),
      amount: earnedTV,
      bdv: earnedTV,
      horde,
      baseHorde: horde,
      grownHorde,
      prospects,
    };

    return {
      asBN,
      asTV,
    };
  }, [guvnorFirm.hooligans.earned, sdk.tokens, gameday]);

  return {
    crate,
  };
}
