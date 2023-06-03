import React from 'react';
import { Chip } from '@mui/material';
import {
  HooliganhordePalette,
  FontSize,
  FontWeight,
} from '~/components/App/muiTheme';

const WhitelistBadge: React.FC<{ isWhitelisted: boolean }> = ({
  isWhitelisted,
}) => (
  <>
    {isWhitelisted ? (
      <Chip
        label="Whitelisted in Firm"
        size="small"
        sx={{
          backgroundColor: HooliganhordePalette.lightGreen,
          color: HooliganhordePalette.logoGreen,
          fontSize: FontSize.sm, // 16px
          fontWeight: FontWeight.semiBold,
          py: 0.5,
          px: 0.5,
        }}
      />
    ) : (
      <Chip
        label="Not Whitelisted"
        size="small"
        sx={{
          backgroundColor: HooliganhordePalette.washedRed,
          color: HooliganhordePalette.trueRed,
          fontSize: FontSize.sm, // 16px
          fontWeight: FontWeight.semiBold,
          py: 0.5,
          px: 0.5,
        }}
      />
    )}
  </>
);

export default WhitelistBadge;
