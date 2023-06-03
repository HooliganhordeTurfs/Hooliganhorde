import { Contract, ContractInterface, ethers } from 'ethers';
import { useCallback, useMemo } from 'react';
import { useProvider, useContract as useWagmiContract } from 'wagmi';

import HOOLIGANHORDE_ABI from '@xblackfury/protocol/abi/Hooliganhorde.json';
import HOOLIGANHORDE_PRICE_ABI from '~/constants/abi/Hooliganhorde/HooliganhordePrice.json';
import HOOLIGANHORDE_PERCOCETER_ABI from '~/constants/abi/Hooliganhorde/HooliganhordePercoceter.json';
import ERC20_ABI from '~/constants/abi/ERC20.json';
import HOOLIGANFT_GENESIS_ABI from '~/constants/abi/HooligaNFT/HooligaNFTGenesis.json';
import HOOLIGANFT_WINTER_ABI from '~/constants/abi/HooligaNFT/HooligaNFTWinter.json';
import HOOLIGANFT_BARRACKRAISE_ABI from '~/constants/abi/HooligaNFT/HooligaNFTBarrackRaise.json';
import AGGREGATOR_V3_ABI from '~/constants/abi/Chainlink/AggregatorV3.json';
import GNOSIS_DELEGATE_REGISTRY_ABI from '~/constants/abi/Gnosis/DelegateRegistry.json';
import useChainConstant from '../chain/useChainConstant';
import { SupportedChainId } from '~/constants/chains';
import {
  HOOLIGANFT_GENESIS_ADDRESSES,
  HOOLIGANFT_WINTER_ADDRESSES,
  HOOLIGANFT_BARRACKRAISE_ADDRESSES,
  HOOLIGANHORDE_ADDRESSES,
  HOOLIGANHORDE_PERCOCETER_ADDRESSES,
  HOOLIGANHORDE_PRICE_ADDRESSES,
  DELEGATES_REGISTRY_ADDRESSES,
} from '~/constants/addresses';
import { ChainConstant } from '~/constants';
import { getChainConstant } from '~/util/Chain';
import { useSigner } from '~/hooks/ledger/useSigner';
import {
  HooligaNFTGenesis,
  HooligaNFTWinter,
  HooligaNFTBarrackRaise,
  HooliganhordePercoceter,
  Hooliganhorde,
  HooliganhordePrice,
  ERC20,
  AggregatorV3,
  DelegateRegistry,
} from '~/generated/index';

export type AddressOrAddressMap = string | ChainConstant<string>;
export type AbiOrAbiMap = ContractInterface | ChainConstant<ContractInterface>;

// -------------------------------------------------

export function useContractReadOnly<T extends Contract = Contract>(
  addressOrAddressMap: AddressOrAddressMap,
  abiOrAbiMap: AbiOrAbiMap
): [T | null, SupportedChainId] {
  const provider = useProvider();
  const address =
    typeof addressOrAddressMap === 'string'
      ? addressOrAddressMap
      : getChainConstant(addressOrAddressMap, provider.network.chainId);
  const abi = Array.isArray(abiOrAbiMap)
    ? abiOrAbiMap
    : getChainConstant(
        abiOrAbiMap as ChainConstant<ContractInterface>,
        provider.network.chainId
      );
  return useMemo(
    () =>
      // console.debug(`[useContractReadOnly] creating new instance of ${address}`);
      [
        address ? (new ethers.Contract(address, abi, provider) as T) : null,
        provider.network.chainId,
      ],
    [address, abi, provider]
  );
  // if (!address) throw new Error('Attempted to instantiate contract without address.')
  // if (!abi)     throw new Error('Attempted to instantiate contract without ABI.')
  // console.debug(`[useContractReadOnly] contract = ${address}, chainId = ${provider.network.chainId}`, {
  //   abi,
  //   abiLength: abi.length,
  //   lbn: provider._lastBlockNumber,
  //   chainId: provider.network.chainId,
  // })
  // return useWagmiContract<T>({
  //   addressOrName: address,
  //   contractInterface: abi,
  //   signerOrProvider: provider,
  // });
}

export function useGetContract<T extends Contract = Contract>(
  abiOrAbiMap: AbiOrAbiMap,
  useSignerIfPossible: boolean = true
): (addressOrAddressMap: AddressOrAddressMap) => [T | null, SupportedChainId] {
  const provider = useProvider();
  const { data: signer } = useSigner();
  const chainId = provider.network.chainId;
  const abi = Array.isArray(abiOrAbiMap)
    ? abiOrAbiMap
    : getChainConstant(
        abiOrAbiMap as ChainConstant<ContractInterface>,
        chainId
      );
  const signerOrProvider = useSignerIfPossible && signer ? signer : provider;
  // useWhatChanged([abi,signerOrProvider,chainId], 'abi,signerOrProvider,chainId');

  //
  return useCallback(
    (addressOrAddressMap: AddressOrAddressMap) => {
      const address =
        typeof addressOrAddressMap === 'string'
          ? addressOrAddressMap
          : getChainConstant(addressOrAddressMap, chainId);
      // console.debug(`[useGetContract] creating new instance of ${address}, ${abi.length}, ${signerOrProvider}, ${chainId}`);
      return [
        address
          ? (new ethers.Contract(address, abi, signerOrProvider) as T)
          : null,
        chainId,
      ];
    },
    [abi, signerOrProvider, chainId]
  );
}

export function useContract<T extends Contract = Contract>(
  addressOrAddressMap: AddressOrAddressMap,
  abiOrAbiMap: AbiOrAbiMap,
  useSignerIfPossible: boolean = true
): [T | null, SupportedChainId] {
  const getContract = useGetContract(abiOrAbiMap, useSignerIfPossible);
  return getContract(addressOrAddressMap) as [T | null, SupportedChainId]; // FIXME: hard casting
}

// --------------------------------------------------

const HOOLIGANHORDE_PRICE_ABIS = {
  [SupportedChainId.MAINNET]: HOOLIGANHORDE_PRICE_ABI,
};

export function useHooliganhordePriceContract() {
  return useContractReadOnly<HooliganhordePrice>(
    HOOLIGANHORDE_PRICE_ADDRESSES,
    HOOLIGANHORDE_PRICE_ABIS
  );
}

export function useHooliganhordePercoceterContract() {
  return useContract<HooliganhordePercoceter>(
    HOOLIGANHORDE_PERCOCETER_ADDRESSES,
    HOOLIGANHORDE_PERCOCETER_ABI,
    true
  );
}

export function useGetERC20Contract() {
  return useGetContract<ERC20>(ERC20_ABI, true);
}

export function useERC20Contract(addressOrAddressMap: AddressOrAddressMap) {
  const get = useGetERC20Contract();
  return get(addressOrAddressMap);
}

// --------------------------------------------------

export function usePercoceterContract(signer?: ethers.Signer | null) {
  const fertAddress = useChainConstant(HOOLIGANHORDE_PERCOCETER_ADDRESSES);
  const provider = useProvider();
  return useWagmiContract({
    address: fertAddress,
    abi: HOOLIGANHORDE_PERCOCETER_ABI,
    signerOrProvider: signer || provider,
  }) as HooliganhordePercoceter;
}

export function useHooliganhordeContract(signer?: ethers.Signer | null) {
  const address = useChainConstant(HOOLIGANHORDE_ADDRESSES);
  const provider = useProvider();
  return useWagmiContract({
    address,
    abi: HOOLIGANHORDE_ABI,
    signerOrProvider: signer || provider,
  }) as Hooliganhorde;
}

export function useGenesisNFTContract(signer?: ethers.Signer | null) {
  const address = useChainConstant(HOOLIGANFT_GENESIS_ADDRESSES);
  const provider = useProvider();
  return useWagmiContract({
    address,
    abi: HOOLIGANFT_GENESIS_ABI,
    signerOrProvider: signer || provider,
  }) as HooligaNFTGenesis;
}

export function useWinterNFTContract(signer?: ethers.Signer | null) {
  const address = useChainConstant(HOOLIGANFT_WINTER_ADDRESSES);
  const provider = useProvider();
  return useWagmiContract({
    address,
    abi: HOOLIGANFT_WINTER_ABI,
    signerOrProvider: signer || provider,
  }) as HooligaNFTWinter;
}

export function useBarrackRaiseNFTContract(signer?: ethers.Signer | null) {
  const address = useChainConstant(HOOLIGANFT_BARRACKRAISE_ADDRESSES);
  const provider = useProvider();
  return useWagmiContract({
    address,
    abi: HOOLIGANFT_BARRACKRAISE_ABI,
    signerOrProvider: signer || provider,
  }) as HooligaNFTBarrackRaise;
}

/** used to access chainlink price data feeds */
export function useAggregatorV3Contract(
  chainConstant: ChainConstant<string>,
  signer?: ethers.Signer | null
) {
  const address = useChainConstant(chainConstant);
  const provider = useProvider();
  return useWagmiContract({
    address,
    abi: AGGREGATOR_V3_ABI,
    signerOrProvider: signer || provider,
  }) as AggregatorV3;
}

export function useDelegatesRegistryContract(signer?: ethers.Signer | null) {
  const address = useChainConstant(DELEGATES_REGISTRY_ADDRESSES);
  const provider = useProvider();
  return useWagmiContract({
    address,
    abi: GNOSIS_DELEGATE_REGISTRY_ABI,
    signerOrProvider: signer || provider,
  }) as DelegateRegistry;
}
