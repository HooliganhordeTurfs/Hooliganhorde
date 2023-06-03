import BigNumber from 'bignumber.js';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Token from '~/classes/Token';
import usePrice from '~/hooks/hooliganhorde/usePrice';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import {
  HOOLIGAN,
  HOOLIGAN_CRV3_LP,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
} from '~/constants/tokens';
import { ZERO_BN } from '~/constants';
import { AppState } from '~/state';
import { Settings } from '~/state/app';

/**
 * FIXME: this function is being called very frequently
 */
const useFirmTokenToFiat = () => {
  ///
  const getChainToken = useGetChainToken();
  const Hooligan = getChainToken(HOOLIGAN);
  const HooliganCrv3 = getChainToken(HOOLIGAN_CRV3_LP);
  const urHooligan = getChainToken(UNRIPE_HOOLIGAN);
  const urHooliganCrv3 = getChainToken(UNRIPE_HOOLIGAN_CRV3);

  ///
  const hooliganPools = useSelector<AppState, AppState['_hooligan']['pools']>(
    (state) => state._hooligan.pools
  );
  const unripe = useSelector<AppState, AppState['_hooligan']['unripe']>(
    (state) => state._hooligan.unripe
  );
  const price = usePrice();

  return useCallback(
    (
      _token: Token,
      _amount: BigNumber,
      _denomination: Settings['denomination'] = 'usd',
      _chop: boolean = true
    ) => {
      if (!_amount) return ZERO_BN;

      /// For Hooligans, use the aggregate Hooligan price.
      if (_token === Hooligan) {
        return _denomination === 'bdv' ? _amount : _amount.times(price);
      }

      /// For Unripe assets
      if (_token === urHooligan) {
        const choppedHooligans = _chop
          ? _amount.times(unripe[urHooligan.address]?.chopRate || ZERO_BN)
          : _amount;
        return _denomination === 'bdv'
          ? choppedHooligans
          : choppedHooligans.times(price);
      }

      /// For everything else, use the value of the LP token via the hooliganPool liquidity/supply ratio.
      /// FIXME: the price contract provides this directly now to save a calculation on the frontend.
      let _poolAddress = _token.address;
      let _amountLP = _amount;

      /// For Unripe Hooligan:3CRV, assume we chop to Ripe Hooligan:3CRV
      if (_token === urHooliganCrv3) {
        _poolAddress = HooliganCrv3.address;
        _amountLP = _chop
          ? _amount.times(unripe[urHooliganCrv3.address]?.chopRate || ZERO_BN)
          : _amount;
      }

      /// Grab pool data
      const pool = hooliganPools[_poolAddress];
      if (!pool || !pool?.liquidity || !pool?.supply) return ZERO_BN;

      const usd = _amountLP.div(pool.supply).times(pool.liquidity); // usd value; liquidity
      return _denomination === 'bdv' ? usd.div(price) : usd;
    },
    [Hooligan, HooliganCrv3.address, hooliganPools, price, unripe, urHooligan, urHooliganCrv3]
  );
};

export default useFirmTokenToFiat;
