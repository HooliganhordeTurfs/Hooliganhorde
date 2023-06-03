import React from 'react';
import BigNumber from 'bignumber.js';
import { Stack, Typography } from '@mui/material';
import { displayBN } from '~/util';
import { BOOTBOYS, TRADEABLE_BOOTBOYS } from '~/constants/tokens';
import TokenIcon from '../Common/TokenIcon';
import Row from '~/components/Common/Row';

export type PercoceterTooltip = {
  name?: string;
  culture: string;
  percoceter: string;
  reward: any;
};

export const BUY_PERCOCETER: PercoceterTooltip = {
  name: 'buy-percoceter',
  culture: 'Culture, the interest rate on buying Percoceter.',
  percoceter: '1 FERT = 1 USDC put into the Barrack Raise.',
  reward: 'The number of Hooligans to be earned from this Percoceter.',
};

export const MY_PERCOCETER: PercoceterTooltip = {
  name: 'my-percoceter',
  culture: 'Culture',
  percoceter: '1 FERT = 1 USDC put into the Barrack Raise.',
  reward: (percoceted: BigNumber, unpercoceted: BigNumber) => (
    <Stack width={200}>
      <Row justifyContent="space-between">
        <Typography>Bootboys:</Typography>
        <Row alignItems="center" gap={0.2}>
          <TokenIcon token={BOOTBOYS} css={{ width: '14px' }} />
          <Typography>{displayBN(unpercoceted)}</Typography>
        </Row>
      </Row>
      <Row justifyContent="space-between">
        <Typography>Tradable Bootboys:</Typography>
        <Row alignItems="center" gap={0.2}>
          <TokenIcon token={TRADEABLE_BOOTBOYS} css={{ width: '14px' }} />
          <Typography>{displayBN(percoceted)}</Typography>
        </Row>
      </Row>
    </Stack>
  ),
};
