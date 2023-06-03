import { Stack } from '@mui/material';
import { StackProps } from '@mui/system';
import React from 'react';
import { HooliganhordePalette } from '~/components/App/muiTheme';
import TokenIcon from '~/components/Common/TokenIcon';
import { CASUALS } from '~/constants/tokens';

import { FC } from '~/types';

const EntityIcon: FC<
  { size?: number; type: 'listing' | 'order' } & StackProps
> = ({ size = 25, type, sx }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    sx={{
      backgroundColor:
        type === 'listing'
          ? HooliganhordePalette.mediumRed
          : HooliganhordePalette.mediumGreen,
      width: size,
      height: size,
      fontSize: size / 1.1,
      p: 1,
      borderRadius: '50%',
      ...sx,
    }}
  >
    <TokenIcon token={CASUALS} />
  </Stack>
);

export default EntityIcon;
