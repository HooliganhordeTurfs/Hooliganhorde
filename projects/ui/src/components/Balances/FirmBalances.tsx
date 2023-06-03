import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Divider,
  Grid,
  Stack,
  Tooltip,
  Typography,
  Link,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { useSelector } from 'react-redux';
import {
  HOOLIGAN,
  PROSPECTS,
  HORDE,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
} from '~/constants/tokens';
import useWhitelist from '~/hooks/hooliganhorde/useWhitelist';
import { HooliganhordePalette, IconSize } from '../App/muiTheme';
import Fiat from '~/components/Common/Fiat';

import Row from '../Common/Row';
import { displayFullBN, displayTokenAmount } from '~/util';
import TokenIcon from '../Common/TokenIcon';
import { AppState } from '~/state';
import { ONE_BN, ZERO_BN } from '~/constants';
import useGuvnorHordeByToken from '~/hooks/guvnor/useGuvnorHordeByToken';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import useUnripeUnderlyingMap from '~/hooks/hooliganhorde/useUnripeUnderlying';
import Stat from '../Common/Stat';

const ARROW_CONTAINER_WIDTH = 20;

const TOOLTIP_COMPONENT_PROPS = {
  tooltip: {
    sx: {
      maxWidth: 'none !important',
      zIndex: 99999,
      // boxShadow: '0px 6px 20px 10px rgba(255,255,255,0.3) !important'
    },
  },
};

const FirmBalances: React.FC<{}> = () => {
  // Chain Constants
  const whitelist = useWhitelist();
  const getChainToken = useGetChainToken();

  const Hooligan = getChainToken(HOOLIGAN);
  const urHooligan = getChainToken(UNRIPE_HOOLIGAN);
  const urHooliganCrv3 = getChainToken(UNRIPE_HOOLIGAN_CRV3);
  const unripeUnderlyingTokens = useUnripeUnderlyingMap();

  // State
  const balances = useSelector<
    AppState,
    AppState['_guvnor']['firm']['balances']
  >((state) => state._guvnor.firm.balances);
  const unripeTokens = useSelector<AppState, AppState['_hooligan']['unripe']>(
    (state) => state._hooligan.unripe
  );

  const guvnorFirm = useSelector<AppState, AppState['_guvnor']['firm']>(
    (state) => state._guvnor.firm
  );

  const hordeByToken = useGuvnorHordeByToken();

  const tokens = useMemo(() => Object.entries(whitelist), [whitelist]);

  return (
    <Stack width="100%">
      <Box
        {...{ pb: 0.5, px: 1, pt: 1.5 }}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Grid
          container
          rowSpacing={1}
          width="100%"
          boxSizing="border-box"
          whiteSpace="nowrap"
        >
          <Grid item xs={6} sm={5} md={3} textAlign="left" pl={2}>
            <Typography color="text.secondary">Token</Typography>
          </Grid>
          <Grid
            item
            {...{ xs: 0, sm: 3.75, md: 3.25 }}
            display={{ xs: 'none', sm: 'block' }}
            textAlign="left"
          >
            <Typography color="text.secondary">Amount Deposited</Typography>
          </Grid>
          <Grid
            item
            {...{ xs: 6, sm: 3.25, md: 2 }}
            pr={{ xs: 4, md: 0 }}
            textAlign="right"
          >
            <Typography color="text.secondary">Value Deposited</Typography>
          </Grid>
          <Grid
            item
            {...{ xs: 0, md: 1.75 }}
            display={{ xs: 'none', md: 'block' }}
            textAlign="right"
          >
            <Typography color="text.secondary">Horde</Typography>
          </Grid>
          <Grid
            item
            {...{ xs: 0, md: 2 }}
            display={{ xs: 'none', md: 'block' }}
            textAlign="right"
            pr={4}
          >
            <Typography color="text.secondary">Prospects</Typography>
          </Grid>
        </Grid>
      </Box>
      <Stack px={1} py={1} spacing={1}>
        {tokens.map(([address, token]) => {
          const deposits = balances[address]?.deposited;
          const isUnripe = token === urHooligan || token === urHooliganCrv3;

          return (
            <Box key={`${token.address}-${token.chainId}`}>
              <Button
                component={RouterLink}
                to={`/firm/${address}`}
                fullWidth
                variant="outlined"
                color="primary"
                size="large"
                sx={{
                  textAlign: 'left',
                  px: 0,
                  py: 1,
                  borderWidth: 0.5,
                  borderColor: 'divider',
                  background: HooliganhordePalette.white,
                  '&:hover': {
                    borderColor: 'unset',
                  },
                }}
              >
                <Grid container alignItems="center">
                  {/**
                   * Cell: Token
                   */}
                  <Grid item {...{ xs: 6, sm: 5, md: 3 }} pl={2}>
                    <Row gap={1}>
                      <img
                        src={token.logo}
                        alt={token.name}
                        css={{ height: IconSize.medium, display: 'inline' }}
                      />
                      <Typography display="inline" color="text.primary">
                        {token.name}
                      </Typography>
                    </Row>
                  </Grid>
                  {/**
                   * Cell: Amount Deposited
                   */}
                  <Grid
                    item
                    {...{ xs: 0, sm: 3.75, md: 3.25 }}
                    display={{ xs: 'none', sm: 'block' }}
                    textAlign="left"
                  >
                    <Typography color="text.primary">
                      {token === Hooligan ? (
                        <Tooltip
                          title={
                            <>
                              {displayFullBN(
                                deposits?.amount || ZERO_BN,
                                token.displayDecimals
                              )}{' '}
                              Deposited HOOLIGAN
                              <br />
                              +&nbsp;
                              <Typography display="inline" color="primary">
                                {displayFullBN(
                                  guvnorFirm.hooligans.earned || ZERO_BN,
                                  token.displayDecimals
                                )}
                              </Typography>{' '}
                              Earned HOOLIGAN
                              <br />
                              <Divider
                                sx={{
                                  my: 0.5,
                                  opacity: 0.7,
                                  borderBottomWidth: 0,
                                  borderColor: 'divider',
                                }}
                              />
                              ={' '}
                              {displayFullBN(
                                guvnorFirm.hooligans.earned.plus(
                                  deposits?.amount || ZERO_BN
                                ),
                                token.displayDecimals
                              )}{' '}
                              HOOLIGAN
                              <br />
                            </>
                          }
                        >
                          <span>
                            {displayFullBN(
                              deposits?.amount || ZERO_BN,
                              token.displayDecimals
                            )}
                            {guvnorFirm.hooligans.earned.gt(0) ? (
                              <Typography component="span" color="primary.main">
                                {' + '}
                                {displayFullBN(
                                  guvnorFirm.hooligans.earned,
                                  token.displayDecimals
                                )}
                              </Typography>
                            ) : null}
                          </span>
                        </Tooltip>
                      ) : (
                        displayFullBN(
                          deposits?.amount || ZERO_BN,
                          token.displayDecimals
                        )
                      )}
                      <Box display={{ md: 'inline', xs: 'none' }}>
                        &nbsp;{token.symbol}
                      </Box>
                    </Typography>
                  </Grid>
                  {/**
                   * Cell: Value of Deposited
                   */}
                  <Grid
                    item
                    {...{ xs: 6, sm: 3.25, md: 2 }}
                    textAlign="right"
                    pr={{ xs: 2, md: 0 }}
                  >
                    <Box>
                      <Row justifyContent="flex-end" width="100%">
                        <Tooltip
                          placement="left"
                          componentsProps={TOOLTIP_COMPONENT_PROPS}
                          title={
                            isUnripe ? (
                              <Box width="100%">
                                <Stack
                                  direction={{ xs: 'column', md: 'row' }}
                                  gap={{ xs: 0, md: 1 }}
                                  alignItems="stretch"
                                >
                                  <Box px={1} py={0.5}>
                                    <Stat
                                      title={
                                        <Row gap={0.5}>
                                          <TokenIcon token={token} />{' '}
                                          {token.symbol}
                                        </Row>
                                      }
                                      gap={0.25}
                                      variant="h4"
                                      amount={displayTokenAmount(
                                        deposits?.amount || ZERO_BN,
                                        token,
                                        { showName: false }
                                      )}
                                      subtitle={
                                        <>
                                          The number of {token.symbol}
                                          <br />
                                          you have Deposited in the Firm.
                                        </>
                                      }
                                    />
                                  </Box>
                                  <Row>x</Row>
                                  <Box sx={{ px: 1, py: 0.5, maxWidth: 215 }}>
                                    <Stat
                                      title="Chop Rate"
                                      gap={0.25}
                                      variant="h4"
                                      amount={`1 - ${(
                                        unripeTokens[token.address]
                                          ?.chopPenalty || ZERO_BN
                                      ).toFixed(4)}%`}
                                      subtitle={
                                        <>
                                          The current penalty for chopping
                                          <br />
                                          {token.symbol} for{' '}
                                          {
                                            unripeUnderlyingTokens[
                                              token.address
                                            ].symbol
                                          }
                                          .{' '}
                                          <Link
                                            href="https://docs.hooligan.black/almanac/farm/barrack#chopping"
                                            target="_blank"
                                            rel="noreferrer"
                                            underline="hover"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                            }}
                                          >
                                            Learn more
                                          </Link>
                                        </>
                                      }
                                    />
                                  </Box>
                                  <Row>×</Row>
                                  <Box sx={{ px: 1, py: 0.5, maxWidth: 215 }}>
                                    <Stat
                                      title={`${
                                        unripeUnderlyingTokens[token.address]
                                      } Price`}
                                      gap={0.25}
                                      variant="h4"
                                      amount={
                                        <Fiat
                                          token={
                                            unripeUnderlyingTokens[
                                              token.address
                                            ]
                                          }
                                          amount={ONE_BN}
                                          chop={false}
                                        />
                                      }
                                      subtitle={`The current price of ${
                                        unripeUnderlyingTokens[token.address]
                                          .symbol
                                      }.`}
                                    />
                                  </Box>
                                  <Stack
                                    display={{ xs: 'none', md: 'flex' }}
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    =
                                  </Stack>
                                </Stack>
                              </Box>
                            ) : (
                              ''
                            )
                          }
                        >
                          <Typography color="text.primary" component="span">
                            <Fiat
                              token={token}
                              amount={deposits?.amount ?? ZERO_BN}
                            />
                            {isUnripe ? (
                              <Typography
                                display="inline"
                                color={HooliganhordePalette.washedRed}
                              >
                                *
                              </Typography>
                            ) : null}
                          </Typography>
                        </Tooltip>
                        <Stack
                          display={{ xs: 'block', md: 'none' }}
                          sx={{ width: ARROW_CONTAINER_WIDTH }}
                          alignItems="center"
                        >
                          <ArrowRightIcon sx={{ color: 'primary.main' }} />
                        </Stack>
                      </Row>
                    </Box>
                  </Grid>
                  {/**
                   * Cell: Horde
                   */}
                  <Grid
                    item
                    {...{ xs: 0, md: 1.75 }}
                    display={{ xs: 'none', md: 'block' }}
                    textAlign="right"
                  >
                    <Row justifyContent="flex-end" gap={0.2}>
                      <TokenIcon token={HORDE} css={{ marginBottom: '2px' }} />
                      <Typography color="text.primary" component="span">
                        {token === Hooligan
                          ? displayFullBN(
                              (hordeByToken[address]?.base ?? ZERO_BN)
                                .plus(hordeByToken[address]?.grown ?? ZERO_BN)
                                .plus(
                                  guvnorFirm.horde.earned.gt(ZERO_BN)
                                    ? guvnorFirm.horde.earned
                                    : ZERO_BN
                                )
                                .minus(
                                  hordeByToken[address]?.unclaimed ?? ZERO_BN
                                ) ?? ZERO_BN,
                              HORDE.displayDecimals
                            )
                          : displayFullBN(
                              (hordeByToken[address]?.base ?? ZERO_BN)
                                .plus(hordeByToken[address]?.grown ?? ZERO_BN)
                                .minus(
                                  hordeByToken[address]?.unclaimed ?? ZERO_BN
                                ) ?? ZERO_BN,
                              HORDE.displayDecimals
                            )}
                      </Typography>
                    </Row>
                  </Grid>
                  {/**
                   *Cell: Prospects
                   */}
                  <Grid
                    item
                    {...{ xs: 0, md: 2 }}
                    display={{ xs: 'none', md: 'block' }}
                    textAlign="right"
                    pr={2}
                  >
                    <Row justifyContent="flex-end">
                      <Row gap={0.2}>
                        <TokenIcon token={PROSPECTS} />
                        <Typography color="text.primary" component="span">
                          {displayFullBN(
                            token.getProspects(deposits?.bdv ?? ZERO_BN),
                            0
                          )}
                        </Typography>
                      </Row>
                      <Stack
                        display={{ xs: 'none', md: 'block' }}
                        sx={{ width: ARROW_CONTAINER_WIDTH }}
                        alignItems="center"
                      >
                        <ArrowRightIcon
                          sx={{
                            color: 'secondary.main',
                            marginTop: '3px',
                          }}
                        />
                      </Stack>
                    </Row>
                  </Grid>
                </Grid>
              </Button>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default FirmBalances;
