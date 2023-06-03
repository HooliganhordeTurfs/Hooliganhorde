import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MaxBN } from '~/util';
import {
  HOOLIGAN_TO_HORDE,
  HOOLIGAN_TO_PROSPECTS,
  ZERO_BN,
  LP_TO_PROSPECTS,
} from '~/constants';
import { UNRIPE_HOOLIGAN, UNRIPE_HOOLIGAN_CRV3 } from '~/constants/tokens';
import { AppState } from '~/state';
import useGuvnorFirmBalances from './useGuvnorFirmBalances';
import useGetChainToken from '../chain/useGetChainToken';
import useGameday from '~/hooks/hooliganhorde/useGameday';

/**
 * Calculate the Guvnor's current number of revitalized Horde and Prospects.
 */
export default function useRevitalized() {
  /// Helpers
  const getChainToken = useGetChainToken();

  /// Balances
  const balances = useGuvnorFirmBalances();
  const hooliganhordeFirm = useSelector<AppState, AppState['_hooliganhorde']['firm']>(
    (state) => state._hooliganhorde.firm
  );
  const currentGameday = useGameday();

  return useMemo(() => {
    const urHooligan = getChainToken(UNRIPE_HOOLIGAN);
    const urHooliganCrv3 = getChainToken(UNRIPE_HOOLIGAN_CRV3);
    const expectedBDV = (addr: string) =>
      (balances[addr]?.deposited.amount || ZERO_BN).times(
        hooliganhordeFirm.balances[addr]?.bdvPerToken || ZERO_BN
      );
    const actualBDV = (addr: string) =>
      balances[addr]?.deposited.bdv || ZERO_BN;
    const expectedGrownBDV = (addr: string) =>
      balances[addr]?.deposited.crates.reduce(
        (ss, c) =>
          ss.plus(
            currentGameday
              .minus(c.gameday)
              .times(c.amount.times(hooliganhordeFirm.balances[addr]?.bdvPerToken))
          ),
        ZERO_BN
      ) || ZERO_BN;
    const actualGrownBDV = (addr: string) =>
      balances[addr]?.deposited.crates.reduce(
        (ss, c) => ss.plus(currentGameday.minus(c.gameday).times(c.bdv)),
        ZERO_BN
      ) || ZERO_BN;

    // flooring at 0 prevents edge case where bdv < haircut during testing
    const delta1 = MaxBN(
      expectedBDV(urHooligan.address).minus(actualBDV(urHooligan.address)),
      ZERO_BN
    );
    const delta2 = MaxBN(
      expectedBDV(urHooliganCrv3.address).minus(actualBDV(urHooliganCrv3.address)),
      ZERO_BN
    );

    const deltaGrown1 = MaxBN(
      expectedGrownBDV(urHooligan.address).minus(actualGrownBDV(urHooligan.address)),
      ZERO_BN
    );
    const deltaGrown2 = MaxBN(
      expectedGrownBDV(urHooliganCrv3.address).minus(
        actualGrownBDV(urHooliganCrv3.address)
      ),
      ZERO_BN
    );

    const prospects = delta1.times(HOOLIGAN_TO_PROSPECTS).plus(delta2.times(LP_TO_PROSPECTS));
    const horde = delta1
      .plus(delta2)
      .times(HOOLIGAN_TO_HORDE)
      .plus(deltaGrown1.times(HOOLIGAN_TO_PROSPECTS).div('10000'))
      .plus(deltaGrown2.times(LP_TO_PROSPECTS).div('10000'));

    // console.debug('[useRevitalized] delta1 = ', `${delta1}`);
    // console.debug('[useRevitalized] delta2 = ', `${delta2}`);

    return {
      revitalizedHorde: horde,
      revitalizedProspects: prospects,
    };
  }, [balances, hooliganhordeFirm, currentGameday, getChainToken]);
}
