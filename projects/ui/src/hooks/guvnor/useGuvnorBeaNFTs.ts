import { useBeaNftUsersQuery } from '~/generated/graphql';
import useAccount from '../ledger/useAccount';

export enum HooligaNFTCollection {
  GENESIS = 'genesis',
  WINTER = 'winter',
  BARRACK_RAISE = 'barrackRaise',
}

export type GuvnorHooligaNFTsMap = {
  [key in HooligaNFTCollection]: {
    /// NFT IDs that have been minted
    ids: number[];
  };
};

const parseHooligaNFTsResult = (_data: ReturnType<typeof useBeaNftUsersQuery>) => {
  const data = _data.data?.beaNFTUsers || [];
  return data.reduce<{
    [guvnorAddress: string]: GuvnorHooligaNFTsMap;
  }>((acc, curr) => {
    const account = curr.id;

    acc[account] = {
      [HooligaNFTCollection.BARRACK_RAISE]: {
        ids: curr.barrackRaise || [],
      },
      [HooligaNFTCollection.WINTER]: {
        ids: curr.winter || [],
      },
      [HooligaNFTCollection.GENESIS]: {
        ids: curr.genesis || [],
      },
    };

    return acc;
  }, {});
};

export default function useGuvnorHooligaNFTs(
  _addresses?: string[],
  skip?: boolean
) {
  const account = useAccount();

  const addresses = _addresses || (account ? [account] : undefined);

  const query = useBeaNftUsersQuery({
    variables: {
      id_in: addresses,
    },
    context: {
      subgraph: 'hooliganft',
    },
    fetchPolicy: 'cache-and-network',
    skip: !addresses || !addresses.length || skip,
  });

  const parsedNFTData = parseHooligaNFTsResult(query);

  return {
    data: parsedNFTData,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
  };
}
