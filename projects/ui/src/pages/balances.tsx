import React from 'react';
import { Box, Card, Container, Stack, Typography } from '@mui/material';
import { XXLWidth } from '~/components/App/muiTheme';
import { FC } from '~/types';
import TokenBalanceCards from '~/components/Balances/TokenBalanceCards';
import BalancesActions from '~/components/Balances/Actions';
import BalancesHeader from '~/components/Balances/Header';
import FirmBalancesHistory from '~/components/Balances/FirmBalancesHistory';
import FirmBalances from '~/components/Balances/FirmBalances';

const BalancesPage: FC<{}> = () => (
  <Container sx={{ maxWidth: `${XXLWidth}px !important`, width: '100%' }}>
    <Stack gap={2}>
      <Stack width={{ xs: '100%', lg: 'calc(100% - 380px)' }} gap={0.5}>
        <Typography variant="h1">Balances</Typography>
        <BalancesHeader />
      </Stack>
      <Stack gap={2} direction="row">
        <Stack sx={{ minWidth: 0 }} width="100%" gap={2}>
          <Card sx={{ pt: 2, pb: 0 }}>
            <FirmBalancesHistory />
          </Card>
          {/* Deposit Balances */}
          <Card>
            <FirmBalances />
          </Card>

          {/* Actions: Quick Draft, Quick Trade, & Firm Rewards */}
          <Box display={{ xs: 'block', lg: 'none' }}>
            <BalancesActions />
          </Box>
          {/* Farm & Circulating Balances */}
          <TokenBalanceCards />
        </Stack>

        {/* Actions: Quick Draft, Quick Trade, & Firm Rewards */}
        <Box
          display={{ xs: 'none', lg: 'block' }}
          sx={{ position: 'relative' }}
        >
          <BalancesActions />
        </Box>
      </Stack>
    </Stack>
  </Container>
);

export default BalancesPage;
