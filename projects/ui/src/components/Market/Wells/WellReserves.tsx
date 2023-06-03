import React from 'react';
import { Card, Divider, Stack, Typography } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import Row from '~/components/Common/Row';
import WhitelistBadge from '~/components/Market/Wells/WhitelistBadge';
import TokenIcon from '~/components/Common/TokenIcon';
import { HOOLIGAN } from '~/constants/tokens';
import { HooliganhordePalette, IconSize } from '~/components/App/muiTheme';

const WellReserves: React.FC = () => (
  <Card sx={{ height: '100%', p: 1 }}>
    <Stack justifyContent="space-between" height="100%">
      <Stack p={1} pb={2} gap={1}>
        <Row justifyContent="space-between">
          <Typography variant="h4">Well Reserves</Typography>
          <WhitelistBadge isWhitelisted />
        </Row>
        <Stack gap={1}>
          <Row justifyContent="space-between">
            <Row gap={0.5}>
              <TokenIcon token={HOOLIGAN[1]} />
              <Typography>HOOLIGAN</Typography>
            </Row>
            <Typography>750,135 (50.05%)</Typography>
          </Row>
          <Row justifyContent="space-between">
            <Row gap={0.5}>
              <TokenIcon token={HOOLIGAN[1]} />
              <Typography>ETH</Typography>
            </Row>
            <Typography>35.15 (49.95%)</Typography>
          </Row>
          <Divider />
          <Row justifyContent="space-between">
            <Typography>USD Total</Typography>
            <Typography>-10,000</Typography>
          </Row>
        </Stack>
      </Stack>
      {/* TODO: if whitelisted, link to specific pool in the firm */}
      <Stack gap={1}>
        <Stack p={1} gap={1}>
          <Row justifyContent="space-between">
            <Typography>Current Hooligan Price</Typography>
            <Typography>0.00012 ETH (~$1.01)</Typography>
          </Row>
          <Row justifyContent="space-between">
            <Typography>Current deltaB</Typography>
            <Typography>+10,000</Typography>
          </Row>
        </Stack>
        <Row
          p={1}
          gap={1}
          sx={{
            borderRadius: 1,
            backgroundColor: HooliganhordePalette.lightestBlue,
          }}
        >
          <InfoIcon
            sx={{ width: IconSize.small, color: HooliganhordePalette.blue }}
          />
          <Typography>
            Earn up to ~5.67% vAPY for adding liquidity to this Well and
            depositing the whitelisted liquidity token in the firm here.
          </Typography>
        </Row>
        {/* <Button fullWidth component={Link} to="/firm"> */}
        {/*  <Typography variant="h4">Deposit Liquidity through the Firm</Typography> */}
        {/* </Button> */}
      </Stack>
    </Stack>
  </Card>
);
export default WellReserves;
