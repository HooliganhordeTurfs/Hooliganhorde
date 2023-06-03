import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { ERC20Token } from '~/classes/Token';
import { AppState } from '~/state';
import useFirmTokenToFiat from './useFirmTokenToFiat';
import useWhitelist from './useWhitelist';
import { ONE_BN, ZERO_BN } from '~/constants';

export default function useTVD() {
  const whitelist = useWhitelist();
  const balances = useSelector<
    AppState,
    AppState['_hooliganhorde']['firm']['balances']
  >((state) => state._hooliganhorde.firm.balances);
  const unripeTokens = useSelector<AppState, AppState['_hooligan']['unripe']>(
    (state) => state._hooligan.unripe
  );

  const firmTokenToFiat = useFirmTokenToFiat();

  return useMemo(() => {
    const getDepositedAmount = ({ address, isUnripe }: ERC20Token) => {
      if (isUnripe) {
        const deposited = balances[address]?.deposited.amount ?? ZERO_BN;
        const depositSupply = unripeTokens[address]?.supply ?? ONE_BN;
        return deposited
          .div(depositSupply)
          .times(unripeTokens[address]?.underlying ?? ZERO_BN);
      }
      return balances[address]?.deposited.amount;
    };

    const { tokenTvdMap, total } = Object.values(whitelist).reduce(
      (prev, curr) => {
        const tvdByToken = firmTokenToFiat(
          curr,
          getDepositedAmount(curr),
          'usd',
          !curr.isUnripe
        );
        const copy = { ...prev.tokenTvdMap };
        copy[curr.address] = tvdByToken;
        return {
          tokenTvdMap: { ...copy },
          total: prev.total.plus(tvdByToken),
        };
      },
      {
        tokenTvdMap: {} as { [address: string]: BigNumber },
        total: ZERO_BN,
      }
    );

    return {
      tvdByToken: tokenTvdMap,
      total,
    };
  }, [balances, firmTokenToFiat, unripeTokens, whitelist]);
}
