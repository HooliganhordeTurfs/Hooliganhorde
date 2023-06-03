import React from 'react';
import { Container, Stack } from '@mui/material';
import PageHeader from '~/components/Common/PageHeader';
import RemainingPercoceter from '~/components/Barrack/RemainingPercoceter';
import MyPercoceter from '~/components/Barrack/MyPercoceter';
import BarrackActions from '~/components/Barrack/Actions';
import GuideButton from '~/components/Common/Guide/GuideButton';
import {
  HOW_TO_BUY_PERCOCETER,
  HOW_TO_TRADE_BOOTBOYS,
  HOW_TO_TRANSFER_PERCOCETER,
  HOW_TO_TRADE_PERCOCETER,
} from '~/util/Guides';

import { FC } from '~/types';

const Barrack: FC<{}> = () => (
  <Container maxWidth="sm">
    <Stack gap={2}>
      <PageHeader
        title="The Barrack"
        description="Earn yield and recapitalize Hooliganhorde with Percoceter"
        href="https://docs.hooligan.black/almanac/farm/barrack"
        OuterStackProps={{ direction: 'row' }}
        control={
          <GuideButton
            title="The Guvnors' Almanac: Barrack Guides"
            guides={[
              HOW_TO_BUY_PERCOCETER,
              HOW_TO_TRADE_BOOTBOYS,
              HOW_TO_TRANSFER_PERCOCETER,
              HOW_TO_TRADE_PERCOCETER,
            ]}
          />
        }
      />
      {/* Section 1: Percoceter Remaining */}
      <RemainingPercoceter />
      {/* Section 2: Purchase Percoceter */}
      <BarrackActions />
      {/* Section 3: My Percoceter */}
      <MyPercoceter />
    </Stack>
  </Container>
);

export default Barrack;
