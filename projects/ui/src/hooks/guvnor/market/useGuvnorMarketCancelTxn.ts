import { useCallback, useState } from 'react';
import { FarmToMode } from '~/lib/Hooliganhorde/Farm';
import TransactionToast from '~/components/Common/TxnToast';
import { useFetchGuvnorField } from '~/state/guvnor/field/updater';
import { useHooliganhordeContract } from '../../ledger/useContract';
import useFormMiddleware from '../../ledger/useFormMiddleware';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import useChainConstant from '../../chain/useChainConstant';
import { useFetchGuvnorBalances } from '~/state/guvnor/balances/updater';
import { CasualOrder } from '~/state/guvnor/market';
import { useSigner } from '~/hooks/ledger/useSigner';
import useAccount from '~/hooks/ledger/useAccount';
import { useFetchGuvnorMarketItems } from '~/hooks/guvnor/market/useGuvnorMarket2';

export default function useGuvnorMarketCancelTxn() {
  /// Helpers
  const Hooligan = useChainConstant(HOOLIGAN);

  /// Local state
  const [loading, setLoading] = useState(false);

  /// Ledger
  const account = useAccount();
  const { data: signer } = useSigner();
  const hooliganhorde = useHooliganhordeContract(signer);

  /// Guvnor
  const [refetchGuvnorField] = useFetchGuvnorField();
  const [refetchGuvnorBalances] = useFetchGuvnorBalances();
  // const [refetchGuvnorMarket] = useFetchGuvnorMarket();
  const { fetch: refetchGuvnorMarketItems } = useFetchGuvnorMarketItems();

  /// Form
  const middleware = useFormMiddleware();

  const cancelListing = useCallback(
    (listingId: string) => {
      (async () => {
        const txToast = new TransactionToast({
          loading: 'Cancelling Casual Listing...',
          success: 'Cancellation successful.',
        });

        try {
          setLoading(true);
          middleware.before();

          const txn = await hooliganhorde.cancelCasualListing(listingId);
          txToast.confirming(txn);

          const receipt = await txn.wait();
          await Promise.all([refetchGuvnorField(), refetchGuvnorMarketItems()]);
          txToast.success(receipt);
        } catch (err) {
          txToast.error(err);
          console.error(err);
        } finally {
          setLoading(false);
        }
      })();
    },
    [hooliganhorde, middleware, refetchGuvnorField, refetchGuvnorMarketItems]
  );

  const cancelOrder = useCallback(
    (order: CasualOrder, destination: FarmToMode, before?: () => void) => {
      (async () => {
        const txToast = new TransactionToast({
          loading: 'Cancelling Casual Order',
          success: 'Cancellation successful.',
        });
        try {
          if (!account) throw new Error('Connect a wallet first.');

          setLoading(true);
          middleware.before();
          before?.();

          const params = [
            Hooligan.stringify(order.pricePerCasual),
            Hooligan.stringify(order.maxPlaceInLine),
            CASUALS.stringify(order.minFillAmount || 0),
          ] as const;

          console.debug('Canceling order: ', [account, ...params]);

          // Check: Verify these params actually hash to an on-chain order
          // This prevents invalid orders from getting cancelled and emitting
          // a bogus CasualOrderCancelled event.
          const verify = await hooliganhorde.casualOrder(account, ...params);
          if (!verify || verify.eq(0)) throw new Error('Order not found');

          const txn = await hooliganhorde.cancelCasualOrder(...params, destination);
          txToast.confirming(txn);

          const receipt = await txn.wait();
          await Promise.all([
            refetchGuvnorMarketItems(), // clear old casual order
            refetchGuvnorBalances(), // refresh Hooligans
          ]);
          txToast.success(receipt);
          // navigate('/market/account');
        } catch (err) {
          console.error(err);
          txToast.error(err);
        } finally {
          setLoading(false);
        }
      })();
    },
    [
      account,
      middleware,
      Hooligan,
      hooliganhorde,
      refetchGuvnorMarketItems,
      refetchGuvnorBalances,
    ]
  );

  return {
    loading,
    cancelListing,
    cancelOrder,
  };
}
