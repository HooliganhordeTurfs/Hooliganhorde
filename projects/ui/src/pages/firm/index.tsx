import React, { useMemo } from 'react';
import { Box, Button, Card, Container, Stack } from '@mui/material';
import { useSelector } from 'react-redux';
import Overview from '~/components/Firm/Overview';
import RewardsBar from '~/components/Firm/RewardsBar';
import Whitelist from '~/components/Firm/Whitelist';
import PageHeader from '~/components/Common/PageHeader';
import RewardsDialog from '~/components/Firm/RewardsDialog';
import DropdownIcon from '~/components/Common/DropdownIcon';
import useWhitelist from '~/hooks/hooliganhorde/useWhitelist';
import usePools from '~/hooks/hooliganhorde/usePools';
import useGuvnorBalancesBreakdown from '~/hooks/guvnor/useGuvnorBalancesBreakdown';
import useToggle from '~/hooks/display/useToggle';
import useRevitalized from '~/hooks/guvnor/useRevitalized';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { AppState } from '~/state';
import { UNRIPE_HOOLIGAN, UNRIPE_HOOLIGAN_CRV3 } from '~/constants/tokens';
import useGuvnorFirmBalances from '~/hooks/guvnor/useGuvnorFirmBalances';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import GuideButton from '~/components/Common/Guide/GuideButton';
import { CLAIM_FIRM_REWARDS, HOW_TO_DEPOSIT_IN_THE_FIRM } from '~/util/Guides';

import { FC } from '~/types';

const FirmPage: FC<{}> = () => {
  /// Helpers
  const getChainToken = useGetChainToken();

  /// Chain Constants
  const whitelist = useWhitelist();
  const pools = usePools();

  /// State
  const guvnorFirm = useSelector<AppState, AppState['_guvnor']['firm']>(
    (state) => state._guvnor.firm
  );
  const hooliganhordeFirm = useSelector<AppState, AppState['_hooliganhorde']['firm']>(
    (state) => state._hooliganhorde.firm
  );
  const breakdown = useGuvnorBalancesBreakdown();
  const balances = useGuvnorFirmBalances();
  const gameday = useGameday();
  const { revitalizedHorde, revitalizedProspects } = useRevitalized();

  /// Calculate Unripe Firm Balance
  const urHooligan = getChainToken(UNRIPE_HOOLIGAN);
  const urHooliganCrv3 = getChainToken(UNRIPE_HOOLIGAN_CRV3);
  const unripeDepositedBalance = balances[
    urHooligan.address
  ]?.deposited.amount.plus(balances[urHooliganCrv3.address]?.deposited.amount);

  /// Local state
  const [open, show, hide] = useToggle();
  const config = useMemo(
    () => ({
      whitelist: Object.values(whitelist),
      poolsByAddress: pools,
    }),
    [whitelist, pools]
  );

  return (
    <Container maxWidth="lg">
      <Stack gap={2}>
        <PageHeader
          title="The Firm"
          description="Earn yield and participate in Hooliganhorde governance by depositing whitelisted assets"
          href="https://docs.hooligan.black/almanac/farm/firm"
          // makes guide display to the right of the title on mobile
          OuterStackProps={{ direction: 'row' }}
          control={
            <GuideButton
              title="The Guvnors' Almanac: Firm Guides"
              guides={[HOW_TO_DEPOSIT_IN_THE_FIRM, CLAIM_FIRM_REWARDS]}
            />
          }
        />
        <Overview
          guvnorFirm={guvnorFirm}
          hooliganhordeFirm={hooliganhordeFirm}
          breakdown={breakdown}
          gameday={gameday}
        />
        <Card>
          <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            <Stack
              sx={{ p: 1.5 }}
              direction={{ xs: 'column', lg: 'row' }}
              justifyContent={{ lg: 'space-between' }}
              alignItems={{ xs: 'auto', lg: 'center' }}
              rowGap={1.5}
            >
              <RewardsBar
                hooligans={guvnorFirm.hooligans}
                horde={guvnorFirm.horde}
                prospects={guvnorFirm.prospects}
                revitalizedHorde={revitalizedHorde}
                revitalizedProspects={revitalizedProspects}
                hideRevitalized={unripeDepositedBalance?.eq(0)}
              />
              <Box
                justifySelf={{ xs: 'auto', lg: 'flex-end' }}
                width={{ xs: '100%', lg: 'auto' }}
              >
                <Button
                  size="medium"
                  variant="contained"
                  sx={{ width: '100%', whiteSpace: 'nowrap' }}
                  endIcon={
                    <DropdownIcon
                      open={false}
                      disabled={breakdown.totalValue?.eq(0)}
                      light
                    />
                  }
                  onClick={show}
                  disabled={breakdown.totalValue?.eq(0)}
                >
                  Claim Rewards
                </Button>
              </Box>
            </Stack>
          </Box>
        </Card>
        <Whitelist config={config} guvnorFirm={guvnorFirm} />
        <RewardsDialog
          open={open}
          handleClose={hide}
          hooligans={guvnorFirm.hooligans}
          horde={guvnorFirm.horde}
          prospects={guvnorFirm.prospects}
          revitalizedHorde={revitalizedHorde}
          revitalizedProspects={revitalizedProspects}
        />
      </Stack>
    </Container>
  );
};

export default FirmPage;
