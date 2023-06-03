import { Box, Divider, Grid } from '@mui/material';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '~/state';
import Row from '../Common/Row';
import { CASUALS, PROSPECTS, BOOTBOYS, HORDE } from '~/constants/tokens';
import HeaderItem from '~/components/Balances/HeaderItem';

const HORDE_TOOLTIP =
  'This is your total Horde balance. Horde is the governance token of the Hooliganhorde DAO. Horde entitles holders to passive interest in the form of a share of future Hooligan mints, and the right to propose and vote on BIPs. Your Horde is forfeited when you Withdraw your Deposited assets from the Firm.';
const PROSPECTS_TOOLTIP =
  'This is your total Prospect balance. Each Prospect yields 1/10000 Grown Horde each Gameday. Grown Horde must be Mown to add it to your Horde balance.';
const CASUALS_TOOLTIP =
  'This is your total Casual Balance. Casuals become Draftable on a FIFO basis. For more information on your place in the Casual Line, head over to the Field page.';
const BOOTBOYS_TOOLTIP =
  'This is your total Bootboy balance. The number of Hooligans left to be earned from your Percoceter. Bootboys become Tradable on a pari passu basis. For more information on your Bootboys, head over to the Barrack page.';

const VerticalDivider = () => (
  <Box display={{ xs: 'none', md: 'block' }} alignSelf="flex-end">
    <Divider
      orientation="vertical"
      sx={{
        width: '0.5px',
        height: '20px',
        borderColor: 'divider',
      }}
    />
  </Box>
);

const BalancesHeader: React.FC<{}> = () => {
  const guvnorFirm = useSelector<AppState, AppState['_guvnor']['firm']>(
    (state) => state._guvnor.firm
  );
  const guvnorField = useSelector<AppState, AppState['_guvnor']['field']>(
    (state) => state._guvnor.field
  );
  const guvnorBarrack = useSelector<AppState, AppState['_guvnor']['barrack']>(
    (state) => state._guvnor.barrack
  );

  const tokensProps = useMemo(
    () => ({
      horde: {
        token: HORDE,
        title: 'HORDE',
        amount: guvnorFirm.horde.total,
        tooltip: HORDE_TOOLTIP,
      },
      prospects: {
        token: PROSPECTS,
        title: 'PROSPECTS',
        amount: guvnorFirm.prospects.total,
        tooltip: PROSPECTS_TOOLTIP,
      },
      casuals: {
        token: CASUALS,
        title: 'CASUALS',
        amount: guvnorField.casuals,
        tooltip: CASUALS_TOOLTIP,
      },
      bootboys: {
        token: BOOTBOYS,
        title: 'BOOTBOYS',
        amount: guvnorBarrack.unpercocetedBootboys,
        tooltip: BOOTBOYS_TOOLTIP,
      },
    }),
    [
      guvnorBarrack.unpercocetedBootboys,
      guvnorField.casuals,
      guvnorFirm.prospects.total,
      guvnorFirm.horde.total,
    ]
  );

  return (
    <>
      {/* breakpoints above md */}
      <Row
        display={{ xs: 'none', md: 'flex' }}
        width="100%"
        justifyContent="space-between"
      >
        {/* HORDE */}
        <HeaderItem {...tokensProps.horde} alignItems="flex-start" />
        <Row width="100%" justifyContent="space-evenly">
          {/* PROSPECTS */}
          <HeaderItem {...tokensProps.prospects} />
          <VerticalDivider />
          {/* CASUALS */}
          <HeaderItem {...tokensProps.casuals} />
          <VerticalDivider />
          {/* BOOTBOYS */}
          <HeaderItem {...tokensProps.bootboys} />
        </Row>
      </Row>

      {/* breakpoints xs & sm */}
      <Grid container display={{ md: 'none' }} gap={0.5}>
        <Grid container item xs={12} gap={0.5}>
          {/* HORDE */}
          <Grid item xs={12} sm={6}>
            <HeaderItem
              {...tokensProps.horde}
              justifyContent={{
                xs: 'space-between',
                sm: 'flex-start',
              }}
            />
          </Grid>
          {/* PROSPECTS */}
          <Grid item xs sm>
            <HeaderItem
              {...tokensProps.prospects}
              justifyContent={{
                xs: 'space-between',
                sm: 'flex-end',
              }}
            />
          </Grid>
        </Grid>
        <Grid container item xs sm gap={0.5}>
          {/* CASUALS */}
          <Grid item xs={12} sm={6}>
            <HeaderItem
              {...tokensProps.casuals}
              justifyContent={{
                xs: 'space-between',
                sm: 'flex-start',
              }}
            />
          </Grid>
          {/* BOOTBOYS */}
          <Grid item xs sm>
            <HeaderItem
              {...tokensProps.bootboys}
              justifyContent={{
                xs: 'space-between',
                sm: 'flex-end',
              }}
            />
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default BalancesHeader;
