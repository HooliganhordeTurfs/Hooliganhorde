import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  HOOLIGANFT_BARRACKRAISE_ADDRESSES,
  HOOLIGANFT_GENESIS_ADDRESSES,
  HOOLIGANFT_WINTER_ADDRESSES,
  ZERO_BN,
} from '~/constants';
import {
  useGenesisNFTContract,
  useWinterNFTContract,
} from '~/hooks/ledger/useContract';
import { updateNFTCollectionsMinted } from './actions';
import { AppState } from '~/state';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const BARRACK_RAISE_TOTAL_MINTED = 918;

const BASE_MAPPING = {
  [HOOLIGANFT_GENESIS_ADDRESSES[1]]: ZERO_BN,
  [HOOLIGANFT_WINTER_ADDRESSES[1]]: ZERO_BN,
  [HOOLIGANFT_BARRACKRAISE_ADDRESSES[1]]: ZERO_BN,
};

export function useFetchNFTMintEvents() {
  const winter = useWinterNFTContract();
  const genesis = useGenesisNFTContract();
  const dispatch = useDispatch();

  const hooliganhordeNFT = useSelector<AppState, AppState['_hooliganhorde']['nft']>(
    (state) => state._hooliganhorde.nft
  );

  const getGenesisMintQueryFilters = useCallback(
    () => genesis.queryFilter(genesis.filters.Transfer(ZERO_ADDRESS)),
    [genesis]
  );

  const getWinterMintQueryFilters = useCallback(
    () => winter.queryFilter(winter.filters.Transfer(ZERO_ADDRESS)),
    [winter]
  );

  const fetch = useCallback(async () => {
    const mapping = { ...BASE_MAPPING };

    try {
      const [_genesis, _winter] = await Promise.all([
        getGenesisMintQueryFilters(),
        getWinterMintQueryFilters(),
      ]);

      mapping[HOOLIGANFT_GENESIS_ADDRESSES[1]] = new BigNumber(_genesis.length);
      mapping[HOOLIGANFT_WINTER_ADDRESSES[1]] = new BigNumber(_winter.length);
      mapping[HOOLIGANFT_BARRACKRAISE_ADDRESSES[1]] = new BigNumber(
        BARRACK_RAISE_TOTAL_MINTED
      );

      console.debug('[hooliganhorde/nft/useFetchNFTMintEvents]: ', mapping);

      dispatch(updateNFTCollectionsMinted(mapping));
    } catch (e) {
      return mapping;
    }
  }, [getGenesisMintQueryFilters, getWinterMintQueryFilters, dispatch]);

  const values = useMemo(() => hooliganhordeNFT.amounts, [hooliganhordeNFT.amounts]);

  return [values, fetch] as const;
}

export default function HooliganNftMintSupplyUpdater() {
  const [data, fetch] = useFetchNFTMintEvents();

  useEffect(() => {
    const isFetched = Object.keys(BASE_MAPPING).reduce((prev, key) => {
      prev = prev && data[key].minted.lte(0);
      return prev;
    }, false);

    if (!isFetched) {
      fetch();
    }
  }, [data, fetch]);

  return null;
}
