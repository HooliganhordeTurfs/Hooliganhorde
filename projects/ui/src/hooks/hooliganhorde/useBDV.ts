import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Token } from '@xblackfury/sdk';
import TokenOld from '~/classes/Token';
import { ZERO_BN } from '~/constants';
import { AppState } from '~/state';

/**
 * Return the BDV that Hooliganhorde will honor for a
 * given token when it is deposited in the Firm.
 */
export default function useBDV() {
  const hooliganhordeFirmBalances = useSelector<
    AppState,
    AppState['_hooliganhorde']['firm']['balances']
  >((state) => state._hooliganhorde.firm.balances);
  return useCallback(
    (_token: Token | TokenOld) =>
      hooliganhordeFirmBalances[_token.address]?.bdvPerToken || ZERO_BN,
    [hooliganhordeFirmBalances]
  );
}
