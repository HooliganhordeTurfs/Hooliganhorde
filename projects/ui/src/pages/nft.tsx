import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Stack,
  Tab,
  Tabs,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSigner } from '~/hooks/ledger/useSigner';
import useTabs from '~/hooks/display/useTabs';
import { getAccount } from '~/util/Account';
import { ADDRESS_COLLECTION, ClaimStatus, loadNFTs, Nft } from '~/util/HooligaNFTs';
import NFTDialog from '~/components/NFT/NFTDialog';
import {
  HOOLIGANFT_GENESIS_ADDRESSES,
  HOOLIGANFT_WINTER_ADDRESSES,
  HOOLIGANFT_BARRACKRAISE_ADDRESSES,
} from '~/constants';
import NFTGrid from '~/components/NFT/NFTGrid';
import {
  useGenesisNFTContract,
  useWinterNFTContract,
} from '~/hooks/ledger/useContract';
import TransactionToast from '~/components/Common/TxnToast';
import useAccount from '../hooks/ledger/useAccount';
import AuthEmptyState from '~/components/Common/ZeroState/AuthEmptyState';
import PageHeader from '~/components/Common/PageHeader';
import GuideButton from '~/components/Common/Guide/GuideButton';
import { HOW_TO_MINT_HOOLIGANFTS } from '~/util/Guides';
import Row from '~/components/Common/Row';
import { FC } from '~/types';

const SLUGS = ['genesis', 'winter', 'barrackraise'];

const NFTPage: FC<{}> = () => {
  const account = useAccount();
  const theme = useTheme();
  const { data: signer } = useSigner();
  const genesisContract = useGenesisNFTContract(signer);
  const winterContract = useWinterNFTContract(signer);

  // component state
  const [tab, handleChangeTab] = useTabs(SLUGS, 'collection');
  const [dialogOpen, setDialogOpen] = useState(false);

  // NFT state
  const [selectedNFT, setSelectedNFT] = useState<Nft | null>(null);
  const [genesisNFTs, setGenesisNFTs] = useState<Nft[] | null>(null);
  const [winterNFTs, setWinterNFTs] = useState<Nft[] | null>(null);
  const [barrackRaiseNFTs, setBarrackRaiseNFTs] = useState<Nft[] | null>(null);
  const unmintedGenesis = genesisNFTs?.filter(
    (nft) => nft.claimed === ClaimStatus.UNCLAIMED
  );
  const unmintedWinter = winterNFTs?.filter(
    (nft) => nft.claimed === ClaimStatus.UNCLAIMED
  );

  /// Handlers
  const handleDialogOpen = (nft: Nft) => {
    setSelectedNFT(nft);
    setDialogOpen(true);
  };
  const handleDialogClose = () => {
    setSelectedNFT(null);
    setDialogOpen(false);
  };

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  async function getNFTMetadataBatch(nftArray: any[], contractAddress: string) {
    const nftMetadataBatchBaseURL =
      'https://eth-mainnet.alchemyapi.io/nft/v2/demo/getNFTMetadataBatch';

    const nfts: any[] = [];
    let batchRequest: any[] = [];

    try {
      if (nftArray.length > 0) {
        for (let i = 0; i < nftArray.length; i += 1) {
          batchRequest.push({
            contractAddress: contractAddress,
            tokenId: nftArray[i].id,
          });
          if (batchRequest.length === 100 || i === nftArray.length - 1) {
            const requestData = JSON.stringify(batchRequest);
            const request = await fetch(nftMetadataBatchBaseURL, {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: `{
                "tokens": ${requestData},
                "refreshCache": false
              }
              `,
            });
            if (request.ok === false) {
              // eslint-disable-next-line no-throw-literal
              throw 'ALCHEMY FETCH ERROR';
            }
            const response = await request.json();
            response.forEach((element: any) => {
              nfts.push(element);
            });
            batchRequest = [];
          }
        }
      }
    } catch (e) {
      console.log('HOOLIGANFT - ERROR FETCHING METADATA', e);
      return ['ERROR'];
    }

    return nfts;
  }

  const parseMints = useCallback(
    async (accountNFTs: Nft[], contractAddress: string, setNFTs: any) => {
      if (!account) {
        return;
      }
      const nfts: Nft[] = [];
      let mintables = [];

      try {
        mintables = await fetch(
          `/.netlify/functions/nfts?account=${account}`
        ).then((response) => response.json());
      } catch (e) {
        console.log('HOOLIGANFT - ERROR FECTHING MINTABLE NFTS');
        console.log('HOOLIGANFT - ERROR FETCHING MINTABLE NFTS');
      }

      // batchNFTMetadata
      let ownedNfts = [];
      let mintableNfts = [];

      let ownedAttempts = 1;
      do {
        await delay(500 * ownedAttempts);
        ownedNfts = await getNFTMetadataBatch(accountNFTs, contractAddress);
        ownedAttempts += 1;
      } while (ownedNfts[0] === 'ERROR');

      let mintableAttempts = 1;
      do {
        await delay(500 * mintableAttempts);
        mintableNfts = await getNFTMetadataBatch(mintables, contractAddress);
        mintableAttempts += 1;
      } while (mintableNfts[0] === 'ERROR');

      const nftHashes = ownedNfts.map((nft: any) =>
        nft.metadata.image.replace('ipfs://', '')
      );

      // Unminted NFTs
      if (mintableNfts.length > 0) {
        for (let i = 0; i < mintableNfts.length; i += 1) {
          const isNotMinted = mintableNfts[i].error;
          const mintableSubcollection = mintables[i].subcollection;
          let currentCollection;
          switch (mintableSubcollection) {
            case 'Genesis':
              contractAddress === HOOLIGANFT_GENESIS_ADDRESSES[1]
                ? (currentCollection = true)
                : (currentCollection = false);
              break;
            case 'Winter':
              contractAddress === HOOLIGANFT_WINTER_ADDRESSES[1]
                ? (currentCollection = true)
                : (currentCollection = false);
              break;
            case 'Barrack Raise':
              contractAddress === HOOLIGANFT_BARRACKRAISE_ADDRESSES[1]
                ? (currentCollection = true)
                : (currentCollection = false);
              break;
            default:
              currentCollection = false;
          }
          // if nft hash is NOT included in mintableNfts but IS minted
          // that means a new address owns this NFT now]
          if (
            !nftHashes.includes(mintables[i].imageIpfsHash) &&
            isNotMinted &&
            currentCollection
          ) {
            nfts.push({
              account: mintables[i].account,
              id: mintables[i].id,
              imageIpfsHash: mintables[i].imageIpfsHash,
              signature2: mintables[i].signature2,
              subcollection:
                ADDRESS_COLLECTION[mintableNfts[i].contract.address],
              claimed: ClaimStatus.UNCLAIMED,
            });
          }
        }
      }

      /// Minted NFTs
      if (ownedNfts.length > 0) {
        for (let i = 0; i < ownedNfts.length; i += 1) {
          const subcollection =
            ADDRESS_COLLECTION[ownedNfts[i].contract.address];
          nfts.push({
            // Genesis HooligaNFT titles: 'HooligaNFT (ID number)' || Winter and Barrack Raise HooligaNFT titles: '(ID number)'
            id:
              subcollection === HOOLIGANFT_GENESIS_ADDRESSES[1]
                ? parseInt(ownedNfts[i].title.split(' ')[1], 10)
                : ownedNfts[i].title,
            account: account,
            subcollection: subcollection,
            claimed: ClaimStatus.CLAIMED,
            imageIpfsHash: nftHashes[i],
          });
        }
      }

      setNFTs(nfts);
    },
    [account]
  );

  // Mint Single Genesis HooligaNFT
  const mintGenesis = () => {
    if (selectedNFT?.claimed === ClaimStatus.UNCLAIMED && account) {
      const txToast = new TransactionToast({
        loading: `Minting Genesis HooligaNFT ${selectedNFT.id}...`,
        success: 'Mint successful.',
      });

      genesisContract
        .mint(
          getAccount(account),
          selectedNFT.id,
          selectedNFT.metadataIpfsHash as string,
          selectedNFT.signature as string
        )
        .then((txn) => {
          txToast.confirming(txn);
          return txn.wait();
        })
        .then((receipt) => {
          txToast.success(receipt);
        })
        .catch((err) => {
          console.error(txToast.error(err.error || err));
        });
    }
  };

  // Mint All Genesis HooligaNFTs
  const mintAllGenesis = () => {
    if (
      unmintedGenesis &&
      genesisNFTs &&
      account &&
      unmintedGenesis?.length > 0
    ) {
      const txToast = new TransactionToast({
        loading: 'Minting all Genesis HooligaNFTs...',
        success: 'Mint successful.',
      });

      const accounts = Array(unmintedGenesis.length).fill(getAccount(account));
      const tokenIds = unmintedGenesis.map((nft) => nft.id);
      const ipfsHashes = unmintedGenesis.map(
        (nft) => nft.metadataIpfsHash as string
      );
      const signatures = unmintedGenesis.map((nft) => nft.signature as string);
      genesisContract
        .batchMint(accounts, tokenIds, ipfsHashes, signatures)
        .then((txn) => {
          txToast.confirming(txn);
          return txn.wait();
        })
        .then((receipt) => {
          txToast.success(receipt);
        })
        .catch((err) => {
          console.error(txToast.error(err.error || err));
        });
    }
  };

  // Mint Single Winter HooligaNFT
  const mintWinter = () => {
    if (selectedNFT?.claimed === ClaimStatus.UNCLAIMED && account) {
      const txToast = new TransactionToast({
        loading: `Minting Winter HooligaNFT ${selectedNFT.id}...`,
        success: 'Mint successful.',
      });

      winterContract
        .mint(
          getAccount(account),
          selectedNFT.id,
          selectedNFT.signature2 as string
        )
        .then((txn) => {
          txToast.confirming(txn);
          return txn.wait();
        })
        .then((receipt) => {
          txToast.success(receipt);
        })
        .catch((err) => {
          console.error(txToast.error(err.error || err));
        });
    }
  };

  // Mint All Winter HooligaNFTs
  const mintAllWinter = () => {
    if (unmintedWinter && winterNFTs && account && unmintedWinter.length > 0) {
      const txToast = new TransactionToast({
        loading: 'Minting all Winter HooligaNFTs...',
        success: 'Mint successful.',
      });

      const tokenIds = unmintedWinter.map((nft) => nft.id);
      const signatures = unmintedWinter.map((nft) => nft.signature2 as string);
      winterContract
        .batchMintAccount(getAccount(account), tokenIds, signatures)
        .then((txn) => {
          txToast.confirming(txn);
          return txn.wait();
        })
        .then((receipt) => {
          txToast.success(receipt);
        })
        .catch((err) => {
          console.error(txToast.error(err.error || err));
        });
    }
  };

  // maps a NFT collection to a mint function
  const contractMap: { [s: string]: any } = {
    Genesis: mintGenesis,
    Winter: mintWinter,
  };

  useEffect(() => {
    if (account !== undefined) {
      loadNFTs(getAccount(account)).then((data) => {
        const genNFTs = data.genesis;
        const winNFTs = data.winter;
        const barrackNFTs = data.barrackRaise;

        parseMints(genNFTs, HOOLIGANFT_GENESIS_ADDRESSES[1], setGenesisNFTs);
        parseMints(winNFTs, HOOLIGANFT_WINTER_ADDRESSES[1], setWinterNFTs);
        parseMints(barrackNFTs, HOOLIGANFT_BARRACKRAISE_ADDRESSES[1], setBarrackRaiseNFTs);
      });
    }
  }, [account, parseMints]);

  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); //

  const hideGenesis = !unmintedGenesis || unmintedGenesis.length === 0;
  const hideWinter = !unmintedWinter || unmintedWinter.length === 0;

  return (
    <Container maxWidth="lg">
      <Stack spacing={2}>
        <PageHeader
          title="HooligaNFTs"
          description="View and mint your HooligaNFTs"
          href="https://docs.hooligan.black/almanac/governance/hooliganfts"
          control={
            <GuideButton
              title="The Guvnors' Almanac: HooligaNFT Guides"
              guides={[HOW_TO_MINT_HOOLIGANFTS]}
            />
          }
        />
        <Card sx={{ p: 2 }}>
          <Stack gap={1.5}>
            <Row
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 0.5 }}
            >
              <Tabs
                value={tab}
                onChange={handleChangeTab}
                sx={{ minHeight: 0 }}
              >
                <Tab
                  label={`Genesis (${
                    genesisNFTs === null ? 0 : genesisNFTs?.length
                  })`}
                />
                \
                <Tab
                  label={`Winter (${
                    winterNFTs === null ? 0 : winterNFTs?.length
                  })`}
                />
                \
                <Tab
                  label={`Barrack Raise (${
                    barrackRaiseNFTs === null ? 0 : barrackRaiseNFTs?.length
                  })`}
                />
              </Tabs>
              {/* TODO: componentize these card action buttons */}
              {tab === 0 && genesisNFTs && !hideGenesis && (
                <Button
                  size="small"
                  onClick={mintAllGenesis}
                  color="primary"
                  variant="text"
                  sx={{ p: 0, '&:hover': { backgroundColor: 'transparent' } }}
                >
                  {isMobile ? 'Mint all' : 'Mint All Genesis'}
                </Button>
              )}
              {tab === 1 && winterNFTs && !hideWinter && (
                <Button
                  size="small"
                  onClick={mintAllWinter}
                  color="primary"
                  variant="text"
                  sx={{ p: 0, '&:hover': { backgroundColor: 'transparent' } }}
                >
                  {isMobile ? 'Mint all' : 'Mint All Winter'}
                </Button>
              )}
            </Row>
            {/* Zero state when not logged in */}
            {account === undefined ? (
              <Box height={300}>
                <AuthEmptyState message="Your HooligaNFTs will appear here." />
              </Box>
            ) : (
              <>
                {/* genesis */}
                {tab === 0 && (
                  <NFTGrid
                    nfts={genesisNFTs}
                    handleDialogOpen={handleDialogOpen}
                  />
                )}
                {/* winter */}
                {tab === 1 && (
                  <NFTGrid
                    nfts={winterNFTs}
                    handleDialogOpen={handleDialogOpen}
                  />
                )}
                {/* barrack raise */}
                {tab === 2 && (
                  <NFTGrid
                    nfts={barrackRaiseNFTs}
                    handleDialogOpen={handleDialogOpen}
                  />
                )}
              </>
            )}
          </Stack>
        </Card>
      </Stack>
      {selectedNFT !== null && account && (
        <NFTDialog
          nft={selectedNFT}
          dialogOpen={dialogOpen}
          handleDialogClose={handleDialogClose}
          handleMint={contractMap[selectedNFT.subcollection]}
        />
      )}
    </Container>
  );
};

export default NFTPage;
