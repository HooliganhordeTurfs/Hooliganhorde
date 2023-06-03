import React, { useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import {
  BASE_IPFS_LINK,
  HOOLIGANFT_GENESIS_ADDRESSES,
  HOOLIGANFT_WINTER_ADDRESSES,
} from '../../constants';
import { HooliganhordePalette } from '~/components/App/muiTheme';
import { Nft } from '~/util';

import { FC } from '~/types';

export interface NFTContentProps {
  nft: Nft;
}

/** Maps an NFT collection to its ETH address. */
export const nftCollections: { [c: string]: string } = {
  Genesis: HOOLIGANFT_GENESIS_ADDRESSES[1],
  Winter: HOOLIGANFT_WINTER_ADDRESSES[1],
};

const NFTImage: FC<NFTContentProps> = ({ nft }) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  return (
    <>
      <Box display={loaded ? 'block' : 'none'}>
        <img
          onLoad={() => setLoaded(true)}
          src={`${BASE_IPFS_LINK}${nft.imageIpfsHash}`}
          alt=""
          width="100%"
          css={{ display: 'block', borderRadius: '7px', aspectRatio: '1/1' }}
        />
      </Box>
      {!loaded && (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            width: '100%',
            aspectRatio: '1/1',
            borderRadius: '7px',
            backgroundColor: HooliganhordePalette.lightestBlue,
          }}
        >
          <CircularProgress />
        </Stack>
      )}
    </>
  );
};

export default NFTImage;
