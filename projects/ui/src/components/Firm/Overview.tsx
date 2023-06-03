import { Box, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import React, { useCallback, useMemo } from 'react';
import useGuvnorBalancesBreakdown from '~/hooks/guvnor/useGuvnorBalancesBreakdown';
import { AppState } from '~/state';

import useTabs from '~/hooks/display/useTabs';
import TokenIcon from '~/components/Common/TokenIcon';
import { PROSPECTS, HORDE } from '~/constants/tokens';
import {
  displayPercentage,
  displayHorde,
  displayUSD,
  HORDE_PER_PROSPECT_PER_GAMEDAY,
} from '~/util';
import { ChipLabel, StyledTab } from '~/components/Common/Tabs';
import { ZERO_BN } from '~/constants';
import Row from '~/components/Common/Row';
import useAccount from '~/hooks/ledger/useAccount';
import { Module, ModuleTabs } from '~/components/Common/Module';
import OverviewTurf from '~/components/Firm/OverviewTurf';
import Stat from '~/components/Common/Stat';
import useGuvnorFirmHistory from '~/hooks/guvnor/useGuvnorFirmHistory';
import { FC } from '~/types';
import { BaseDataPoint } from '~/components/Common/Charts/ChartPropProvider';

import hordeIconWinter from '~/img/hooliganhorde/horde-icon-green.svg';
import prospectIconWinter from '~/img/hooliganhorde/prospect-icon-green.svg';

const depositStats = (s: BigNumber, v: BigNumber[], d: string) => (
  <Stat
    title="Value Deposited"
    titleTooltip={
      <>
        Shows the historical value of your Firm Deposits. <br />
        <Typography variant="bodySmall">
          Note: Unripe assets are valued based on the current Chop Rate. Earned
          Hooligans are shown upon Recruit.
        </Typography>
      </>
    }
    color="primary"
    subtitle={`Gameday ${s.toString()}`}
    secondSubtitle={d}
    amount={displayUSD(v[0])}
    amountIcon={undefined}
    gap={0.25}
    sx={{ ml: 0 }}
  />
);

const prospectsStats = (s: BigNumber, v: BigNumber[], d: string) => (
  <Stat
    title="Prospect Balance"
    titleTooltip="Prospects are illiquid tokens that yield 1/10,000 Horde each Gameday."
    subtitle={`Gameday ${s.toString()}`}
    secondSubtitle={d}
    amount={displayHorde(v[0])}
    sx={{ minWidth: 180, ml: 0 }}
    amountIcon={undefined}
    gap={0.25}
  />
);

const SLUGS = ['deposits', 'horde', 'prospects'];

const Overview: FC<{
  guvnorFirm: AppState['_guvnor']['firm'];
  hooliganhordeFirm: AppState['_hooliganhorde']['firm'];
  breakdown: ReturnType<typeof useGuvnorBalancesBreakdown>;
  gameday: BigNumber;
}> = ({ guvnorFirm, hooliganhordeFirm, breakdown, gameday }) => {
  const [tab, handleChange] = useTabs(SLUGS, 'view');

  //
  const account = useAccount();
  const { data, loading } = useGuvnorFirmHistory(account, false, true);

  //
  const ownership =
    guvnorFirm.horde.active?.gt(0) && hooliganhordeFirm.horde.total?.gt(0)
      ? guvnorFirm.horde.active.div(hooliganhordeFirm.horde.total)
      : ZERO_BN;
  const hordeStats = useCallback(
    (s: BigNumber, v: BigNumber[], d: string) => (
      <>
        <Stat
          title="Horde Balance"
          titleTooltip="Horde is the governance token of the Hooliganhorde DAO. Horde entitles holders to passive interest in the form of a share of future Hooligan mints, and the right to propose and vote on BIPs. Your Horde is forfeited when you Withdraw your Deposited assets from the Firm."
          subtitle={`Gameday ${s.toString()}`}
          secondSubtitle={d}
          amount={displayHorde(v[0])}
          color="text.primary"
          sx={{ minWidth: 220, ml: 0 }}
          gap={0.25}
        />
        <Stat
          title="Horde Ownership"
          titleTooltip="Your current ownership of Hooliganhorde is displayed as a percentage. Ownership is determined by your proportional ownership of the total Horde supply."
          amount={displayPercentage(ownership.multipliedBy(100))}
          color="text.primary"
          gap={0.25}
          sx={{ minWidth: 200, ml: 0 }}
        />
        <Stat
          title="Grown Horde per Day"
          titleTooltip="The number of Horde your Prospects will grow every 24 Gamedays based on your current Prospect balance."
          amount={displayHorde(
            guvnorFirm.prospects.active.times(HORDE_PER_PROSPECT_PER_GAMEDAY).times(24)
          )}
          color="text.primary"
          gap={0.25}
          sx={{ minWidth: 120, ml: 0 }}
        />
      </>
    ),
    [guvnorFirm, ownership]
  );

  return (
    <Module>
      <ModuleTabs value={tab} onChange={handleChange} sx={{ minHeight: 0 }}>
        <StyledTab
          label={
            <ChipLabel name="Deposits">
              {displayUSD(breakdown.states.deposited.value)}
            </ChipLabel>
          }
        />
        <StyledTab
          label={
            <ChipLabel name="Horde">
              <Row alignItems="center">
                <TokenIcon token={HORDE} logoOverride={hordeIconWinter} />{' '}
                {displayHorde(guvnorFirm.horde.active, 0)}
              </Row>
            </ChipLabel>
          }
        />
        <StyledTab
          label={
            <ChipLabel name="Prospects">
              <Row alignItems="center">
                <TokenIcon token={PROSPECTS} logoOverride={prospectIconWinter} />{' '}
                {displayHorde(guvnorFirm.prospects.active, 0)}
              </Row>
            </ChipLabel>
          }
        />
      </ModuleTabs>
      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
        <OverviewTurf
          label="Firm Deposits"
          account={account}
          current={useMemo(
            () => [breakdown.states.deposited.value],
            [breakdown.states.deposited.value]
          )}
          date={
            data.deposits[data.deposits.length - 1]
              ? data.deposits[data.deposits.length - 1].date
              : ''
          }
          series={
            useMemo(() => [data.deposits], [data.deposits]) as BaseDataPoint[][]
          }
          gameday={gameday}
          stats={depositStats}
          loading={loading}
          empty={breakdown.states.deposited.value.eq(0)}
        />
      </Box>
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <OverviewTurf
          label="Horde Ownership"
          account={account}
          current={useMemo(
            () => [
              guvnorFirm.horde.active,
              // Show zero while these data points are loading
              ownership,
            ],
            [guvnorFirm.horde.active, ownership]
          )}
          date={
            data.horde[data.horde.length - 1]
              ? data.horde[data.horde.length - 1].date
              : ''
          }
          series={useMemo(
            () => [
              data.horde,
              // mockOwnershipPctData
            ],
            [data.horde]
          )}
          gameday={gameday}
          stats={hordeStats}
          loading={loading}
          empty={guvnorFirm.horde.total.lte(0)}
        />
      </Box>
      <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
        <OverviewTurf
          label="Prospects Ownership"
          account={account}
          current={useMemo(
            () => [guvnorFirm.prospects.active],
            [guvnorFirm.prospects.active]
          )}
          series={useMemo(() => [data.prospects], [data.prospects])}
          date={
            data.prospects[data.prospects.length - 1]
              ? data.prospects[data.prospects.length - 1].date
              : ''
          }
          gameday={gameday}
          stats={prospectsStats}
          loading={loading}
          empty={guvnorFirm.prospects.total.lte(0)}
        />
      </Box>
    </Module>
  );
};

export default Overview;
