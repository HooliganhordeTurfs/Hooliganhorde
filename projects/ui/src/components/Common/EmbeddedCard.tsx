import React from 'react';
import { Card, CardProps } from '@mui/material';

import { FC } from '~/types';
import { HooliganhordePalette } from '../App/muiTheme';

const EmbeddedCard: FC<CardProps> = ({ children, ...cardProps }) => (
  <Card
    {...cardProps}
    sx={{
      ...cardProps.sx,
      border: 'none',
      borderRadius: '6px !important',
      background: HooliganhordePalette.white,
    }}
  >
    {children}
  </Card>
);

export default EmbeddedCard;
