import { useCallback, useEffect, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useDispatch } from 'react-redux';
import throttle from 'lodash/throttle';
import { useProvider } from 'wagmi';
import {
  useHooliganhordeContract,
  useHooliganhordePriceContract,
} from '~/hooks/ledger/useContract';
import { tokenResult, getChainConstant, displayHooliganPrice } from '~/util';
import { HOOLIGAN } from '~/constants/tokens';
import ALL_POOLS from '~/constants/pools';
import { ERC20__factory } from '~/generated';
import { updatePrice, updateDeltaB, updateSupply } from '../token/actions';
import { resetPools, updateHooliganPools, UpdatePoolPayload } from './actions';

export const useFetchPools = () => {
  const dispatch = useDispatch();
  const hooliganhorde = useHooliganhordeContract();
  const [hooliganhordePriceContract, chainId] = useHooliganhordePriceContract();
  const provider = useProvider();

  // Handlers
  const _fetch = useCallback(async () => {
    try {
      if (hooliganhorde && hooliganhordePriceContract) {
        console.debug(
          '[hooligan/pools/useGetPools] FETCH',
          hooliganhordePriceContract.address,
          chainId
        );
        const Pools = getChainConstant(ALL_POOLS, chainId);
        const Hooligan = getChainConstant(HOOLIGAN, chainId);

        // FIXME: find regression with Hooligan.totalSupply()
        const hooliganErc20 = ERC20__factory.connect(Hooligan.address, provider);
        const [priceResult, totalSupply, totalDeltaB] = await Promise.all([
          hooliganhordePriceContract.price(),
          // FIXME: these should probably reside in hooligan/token/updater,
          // but the above hooliganhordePriceContract call also grabs the
          // aggregate price, so for now we bundle them here.
          hooliganErc20.totalSupply().then(tokenResult(Hooligan)),
          hooliganhorde.totalDeltaB().then(tokenResult(Hooligan)), // TWAdeltaB
        ]);

        if (!priceResult) return;

        console.debug(
          '[hooligan/pools/useGetPools] RESULT: price contract result =',
          priceResult,
          totalSupply.toString()
        );

        // Step 2: Get LP token supply data and format as UpdatePoolPayload
        const dataWithSupplyResult: Promise<UpdatePoolPayload>[] = [
          ...priceResult.ps.reduce<Promise<UpdatePoolPayload>[]>(
            (acc, poolData) => {
              // NOTE:
              // The below address must be lower-cased. All internal Pool/Token
              // addresses are case-insensitive and stored as lowercase strings.
              const address = poolData.pool.toLowerCase();

              // If a new pool is added to the Pools contract before it's
              // configured in the frontend, this function would throw an error.
              // Thus, we only process the pool's data if we have it configured.
              if (Pools[address]) {
                const POOL = Pools[address];
                acc.push(
                  ERC20__factory.connect(POOL.lpToken.address, provider)
                    .totalSupply()
                    .then((supply) => ({
                      address: poolData.pool,
                      pool: {
                        price: tokenResult(HOOLIGAN)(poolData.price.toString()),
                        reserves: [
                          // NOTE:
                          // Assumes that the ordering of tokens in the Pool instance
                          // matches the order returned by the price contract.
                          tokenResult(POOL.tokens[0])(poolData.balances[0]),
                          tokenResult(POOL.tokens[1])(poolData.balances[1]),
                        ],
                        deltaB: tokenResult(HOOLIGAN)(poolData.deltaB.toString()),
                        supply: tokenResult(POOL.lpToken)(supply.toString()),
                        // Liquidity: always denominated in USD for the price contract
                        liquidity: tokenResult(HOOLIGAN)(
                          poolData.liquidity.toString()
                        ),
                        // USD value of 1 LP token == liquidity / supply
                        totalCrosses: new BigNumber(0),
                      },
                    }))
                    .catch((err) => {
                      console.debug(
                        '[hooliganhorde/pools/updater] Failed to get LP token supply',
                        POOL.lpToken
                      );
                      console.error(err);
                      throw err;
                    })
                );
              } else {
                console.debug(
                  `[hooligan/pools/useGetPools] price contract returned data for pool ${address} but it isn't configured, skipping. available pools:`,
                  Pools
                );
              }
              return acc;
            },
            []
          ),
        ];

        console.debug(
          '[hooligan/pools/useGetPools] RESULT: dataWithSupply =',
          dataWithSupplyResult
        );

        const price = tokenResult(HOOLIGAN)(priceResult.price.toString());
        dispatch(updateHooliganPools(await Promise.all(dataWithSupplyResult)));
        dispatch(updatePrice(price));
        dispatch(updateSupply(totalSupply));
        dispatch(updateDeltaB(totalDeltaB));

        if (price) {
          document.title = `$${displayHooliganPrice(price, 4)} · Hooliganhorde App`;
        }
      }
    } catch (e) {
      console.debug('[hooligan/pools/useGetPools] FAILED', e);
      console.error(e);
    }
  }, [dispatch, hooliganhordePriceContract, hooliganhorde, chainId, provider]);
  const clear = useCallback(() => {
    dispatch(resetPools());
  }, [dispatch]);

  const fetch = useMemo(() => throttle(_fetch, 1000), [_fetch]);

  return [fetch, clear];
};

// ------------------------------------------

const PoolsUpdater = () => {
  const [fetch, clear] = useFetchPools();

  useEffect(() => {
    clear();
    fetch();
  }, [fetch, clear]);

  // useTimedRefresh(fetch, 15_000, true, true);

  return null;
};

export default PoolsUpdater;
