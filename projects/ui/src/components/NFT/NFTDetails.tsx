import React from 'react';
import { Stack, Typography } from '@mui/material';
import { ClaimStatus, Nft } from '../../util/HooligaNFTs';
import NFTImage from './NFTImage';
import Row from '~/components/Common/Row';

import { FC } from '~/types';
import { HooliganhordePalette } from '../App/muiTheme';

export interface NFTContentProps {
  collection: string;
  nft: Nft;
}

const NFTDetails: FC<NFTContentProps> = ({ nft, collection }) => (
  <Stack gap={1} sx={{ width: '100%', aspectRatio: '1/1' }}>
    <NFTImage nft={nft} />
    <Row alignItems="start" justifyContent="space-between">
      {/* Name */}
      <Typography variant="h4">HooligaNFT {nft.id}</Typography>
      <Typography
        variant="bodySmall"
        textAlign="right"
        color={
          nft.claimed === ClaimStatus.UNCLAIMED
            ? HooliganhordePalette.logoGreen
            : 'text.tertiary'
        }
      >
        {nft.claimed === ClaimStatus.UNCLAIMED ? 'Ready to mint' : 'Minted'}
      </Typography>
    </Row>
  </Stack>
);

export default NFTDetails;
