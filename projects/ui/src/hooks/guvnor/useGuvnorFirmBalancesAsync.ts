import { Token, DataSource } from '@xblackfury/sdk';

import useAsyncMemo from '~/hooks/display/useAsyncMemo';
import useAccount from '~/hooks/ledger/useAccount';
import useSdk from '~/hooks/sdk';
import { IS_DEV } from '~/util';

/// Temporary solution. Remove this when we move the site to use the new sdk types.
export default function useGuvnorFirmBalancesAsync(token: Token | undefined) {
  const sdk = useSdk();
  const account = useAccount();

  const [guvnorBalances, refetchGuvnorBalances] = useAsyncMemo(async () => {
    if (!account || !token) return undefined;
    console.debug(`[Transfer] Fetching firm balances for FIRM:${token.symbol}`);
    return sdk.firm.getBalance(
      token,
      account,
      IS_DEV ? { source: DataSource.LEDGER } : undefined
    );
  }, [account, sdk, token]);

  return [guvnorBalances, refetchGuvnorBalances] as const;
}
