import {
  HOOLIGANFT_BARRACKRAISE_ADDRESSES,
  HOOLIGANFT_GENESIS_ADDRESSES,
  HOOLIGANFT_WINTER_ADDRESSES,
} from '~/constants';

export enum ClaimStatus {
  CLAIMED = 0,
  UNCLAIMED = 1,
}

export type Nft = {
  /** The HooligaNFT number (eg: HooligaNFT 1634 */
  id: number;
  /** ETH address of owner. */
  account: string;
  /** Winter or Genesis */
  subcollection: string;
  /** */
  imageIpfsHash?: string;
  /** 0 => claimed, 1 => unclaimed  */
  claimed?: ClaimStatus;

  // genesis only
  metadataIpfsHash?: string;
  signature?: string;

  // winter and genesis
  signature2?: string;
};

/** Maps an NFT collection to its ETH address. */
export const COLLECTION_ADDRESS: { [c: string]: string } = {
  Genesis: HOOLIGANFT_GENESIS_ADDRESSES[1],
  Winter: HOOLIGANFT_WINTER_ADDRESSES[1],
  BarrackRaise: HOOLIGANFT_BARRACKRAISE_ADDRESSES[1],
};

export const ADDRESS_COLLECTION: { [c: string]: string } = {
  [HOOLIGANFT_GENESIS_ADDRESSES[1]]: COLLECTION_ADDRESS.Genesis,
  [HOOLIGANFT_WINTER_ADDRESSES[1]]: COLLECTION_ADDRESS.Winter,
  [HOOLIGANFT_BARRACKRAISE_ADDRESSES[1]]: COLLECTION_ADDRESS.BarrackRaise,
};

export async function loadNFTs(account: string) {
  const genesisNFTs: Nft[] = [];
  const winterNFTs: Nft[] = [];
  const barrackRaiseNFTs: Nft[] = [];

  try {
    const ownedNFTs = await fetch(
      'https://graph.node.hooligan.black/subgraphs/name/hooliganft',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query NFTData($account: ID!) {
              beaNFTUser(id: $account) {
                id
                genesis
                barrackRaise
                winter
              }
            }
          `,
          variables: {
            account: account.toLowerCase(),
          },
        }),
      }
    );

    const ownedNFTsJSON = await ownedNFTs.json();
    console.log('OWNED NFTS', ownedNFTsJSON);

    if (ownedNFTsJSON.data.beaNFTUser) {
      if (ownedNFTsJSON.data.beaNFTUser.genesis) {
        ownedNFTsJSON.data.beaNFTUser.genesis.sort();
        ownedNFTsJSON.data.beaNFTUser.genesis.forEach((element: number) => {
          genesisNFTs.push({
            id: element,
            account: account.toLowerCase(),
            subcollection: 'Genesis',
          });
        });
      }

      if (ownedNFTsJSON.data.beaNFTUser.winter) {
        ownedNFTsJSON.data.beaNFTUser.winter.sort();
        ownedNFTsJSON.data.beaNFTUser.winter.forEach((element: number) => {
          winterNFTs.push({
            id: element,
            account: account.toLowerCase(),
            subcollection: 'Winter',
          });
        });
      }

      if (ownedNFTsJSON.data.beaNFTUser.barrackRaise) {
        ownedNFTsJSON.data.beaNFTUser.barrackRaise.sort();
        ownedNFTsJSON.data.beaNFTUser.barrackRaise.forEach((element: number) => {
          barrackRaiseNFTs.push({
            id: element,
            account: account.toLowerCase(),
            subcollection: 'Barrack Raise',
          });
        });
      }
    }
  } catch (e) {
    console.log('HOOLIGANFT - ERROR FETCHING DATA FROM SUBGRAPH - ', e);
  }

  return {
    genesis: genesisNFTs,
    winter: winterNFTs,
    barrackRaise: barrackRaiseNFTs,
  };
}
