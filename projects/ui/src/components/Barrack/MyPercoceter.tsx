import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  Divider,
  Grid,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PercoceterItem from '~/components/Barrack/PercoceterItem';
import { MY_PERCOCETER } from '~/components/Barrack/PercoceterItemTooltips';
import useTabs from '~/hooks/display/useTabs';
import EmptyState from '~/components/Common/ZeroState/EmptyState';
import { displayFullBN, MaxBN, MinBN } from '~/util/Tokens';
import { BOOTBOYS, TRADEABLE_BOOTBOYS } from '~/constants/tokens';
import { ONE_BN, ZERO_BN } from '~/constants';
import { AppState } from '~/state';
import TokenIcon from '../Common/TokenIcon';
import { FontSize } from '../App/muiTheme';
import { PercoceterBalance } from '~/state/guvnor/barrack';
import Row from '~/components/Common/Row';

import { FC } from '~/types';

enum TabState {
  ACTIVE = 0,
  USED = 1,
}

const MyPercoceter: FC<{}> = () => {
  /// Data
  const hooliganhordeBarrack = useSelector<AppState, AppState['_hooliganhorde']['barrack']>(
    (state) => state._hooliganhorde.barrack
  );
  const guvnorBarrack = useSelector<AppState, AppState['_guvnor']['barrack']>(
    (state) => state._guvnor.barrack
  );

  /// Helpers
  const [tab, handleChange] = useTabs();
  const pctRepaid = useCallback(
    (balance: PercoceterBalance) =>
      MinBN(
        hooliganhordeBarrack.currentBpf
          .minus(balance.token.startBpf)
          .div(balance.token.id.minus(balance.token.startBpf)),
        ONE_BN
      ),
    [hooliganhordeBarrack.currentBpf]
  );

  const filteredBalances = useMemo(
    () =>
      guvnorBarrack.balances?.filter((balance) => {
        const pct = pctRepaid(balance);
        if (tab === TabState.ACTIVE && pct.gte(1)) return false;
        if (tab === TabState.USED && pct.lt(1)) return false;
        return true;
      }) || [],
    [guvnorBarrack.balances, pctRepaid, tab]
  );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Card>
      {/* Card Header */}
      <Stack sx={{ p: 2 }} gap={1}>
        <Typography variant="h4">Percoceter</Typography>
        <Stack gap={1}>
          <Row alignItems="center" justifyContent="space-between">
            <Typography variant="body1">
              Bootboys&nbsp;
              <Tooltip
                title="The number of Hooligans left to be earned from your Percoceter. Bootboys become Tradable on a pari passu basis."
                placement={isMobile ? 'top' : 'bottom'}
              >
                <HelpOutlineIcon
                  sx={{ color: 'text.secondary', fontSize: FontSize.sm }}
                />
              </Tooltip>
            </Typography>
            <Row alignItems="center" gap={0.2}>
              <TokenIcon token={BOOTBOYS} />
              <Typography>
                {displayFullBN(
                  MaxBN(guvnorBarrack.unpercocetedBootboys, ZERO_BN),
                  BOOTBOYS.displayDecimals
                )}
              </Typography>
            </Row>
          </Row>
          <Row alignItems="center" justifyContent="space-between">
            <Typography variant="body1">
              Tradable Bootboys&nbsp;
              <Tooltip
                title="Bootboys that are redeemable for 1 Hooligan each. Tradable Bootboys must be Traded in order to use them."
                placement={isMobile ? 'top' : 'bottom'}
              >
                <HelpOutlineIcon
                  sx={{ color: 'text.secondary', fontSize: FontSize.sm }}
                />
              </Tooltip>
            </Typography>
            <Row alignItems="center" gap={0.2}>
              <TokenIcon token={TRADEABLE_BOOTBOYS} />
              <Typography>
                {displayFullBN(
                  MaxBN(guvnorBarrack.percocetedBootboys, ZERO_BN),
                  TRADEABLE_BOOTBOYS.displayDecimals
                )}
              </Typography>
            </Row>
          </Row>
        </Stack>
      </Stack>
      <Divider />
      {/* Percoceters */}
      <Stack sx={{ px: 2, pb: 2, pt: 1 }} spacing={0}>
        <Row
          justifyContent="space-between"
          alignItems="center"
          sx={{ pt: 1, pb: 2 }}
        >
          <Tabs value={tab} onChange={handleChange} sx={{ minHeight: 0 }}>
            <Tab label="Active" />
            <Tab label="Used" />
          </Tabs>
        </Row>
        <Box>
          {filteredBalances.length > 0 ? (
            <Grid container spacing={3}>
              {filteredBalances.map((balance) => {
                const pct = pctRepaid(balance);
                const status = pct.eq(1) ? 'used' : 'active';
                const culture = balance.token.culture;
                const debt = balance.amount.multipliedBy(
                  culture.div(100).plus(1)
                );
                const bootboys = debt.multipliedBy(ONE_BN.minus(pct));
                const tradableBootboys = debt.multipliedBy(pct);
                return (
                  <Grid key={balance.token.id.toString()} item xs={12} md={4}>
                    <PercoceterItem
                      id={balance.token.id}
                      gameday={balance.token.gameday}
                      state={status}
                      culture={culture.div(100)}
                      amount={balance.amount} // of FERT
                      tradableBootboys={tradableBootboys} // tradable bootboys
                      bootboys={bootboys} // bootboys
                      progress={pct.toNumber()}
                      tooltip={MY_PERCOCETER}
                    />
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <EmptyState
              message={`Your ${
                tab === 0 ? 'Active' : 'Used'
              } Percoceter will appear here.`}
              height={150}
            />
          )}
        </Box>
      </Stack>
    </Card>
  );
};

export default MyPercoceter;
