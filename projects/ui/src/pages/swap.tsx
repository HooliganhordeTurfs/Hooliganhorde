import React from 'react';
import { Container, Stack } from '@mui/material';
import SwapActions from '~/components/Swap/Actions';
import PageHeader from '~/components/Common/PageHeader';
import GuideButton from '~/components/Common/Guide/GuideButton';
import { HOW_TO_TRANSFER_BALANCES, HOW_TO_TRADE_HOOLIGANS } from '~/util/Guides';

import { FC } from '~/types';

const SwapPage: FC<{}> = () => (
  <Container maxWidth="sm">
    <Stack gap={2}>
      <PageHeader
        title="Swap"
        description="Trade Hooligans and transfer Hooliganhorde assets"
        href="https://docs.hooligan.black/almanac/guides/swap"
        control={
          <GuideButton
            title="The Guvnors' Almanac: Swap Guides"
            guides={[HOW_TO_TRADE_HOOLIGANS, HOW_TO_TRANSFER_BALANCES]}
          />
        }
      />
      <SwapActions />
    </Stack>
  </Container>
);
export default SwapPage;
