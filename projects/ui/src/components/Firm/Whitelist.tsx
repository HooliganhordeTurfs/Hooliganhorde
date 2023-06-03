import React from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Pool, Token } from '~/classes';
import { AppState } from '~/state';
import TokenIcon from '~/components/Common/TokenIcon';
import {
  HOOLIGAN,
  PROSPECTS,
  HORDE,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
} from '~/constants/tokens';
import { AddressMap, ONE_BN, ZERO_BN } from '~/constants';
import { displayFullBN, displayTokenAmount } from '~/util/Tokens';
import useBDV from '~/hooks/hooliganhorde/useBDV';
import {
  HooliganhordePalette,
  FontSize,
  IconSize,
} from '~/components/App/muiTheme';
import Fiat from '~/components/Common/Fiat';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import useSetting from '~/hooks/app/useSetting';
import Row from '~/components/Common/Row';
import Stat from '~/components/Common/Stat';
import useUnripeUnderlyingMap from '~/hooks/hooliganhorde/useUnripeUnderlying';
import useAPY from '~/hooks/hooliganhorde/useAPY';
import hordeIconBlue from '~/img/hooliganhorde/horde-icon-blue.svg';
import FirmAssetApyChip from './FirmAssetApyChip';

/**
 * Display a pseudo-table of Whitelisted Firm Tokens.
 * This table is the entry point to deposit Hooligans, LP, etc.
 */
import { FC } from '~/types';

const ARROW_CONTAINER_WIDTH = 20;
const TOOLTIP_COMPONENT_PROPS = {
  tooltip: {
    sx: {
      maxWidth: 'none !important',
      // boxShadow: '0px 6px 20px 10px rgba(255,255,255,0.3) !important'
    },
  },
};

const Whitelist: FC<{
  guvnorFirm: AppState['_guvnor']['firm'];
  config: {
    whitelist: Token[];
    poolsByAddress: AddressMap<Pool>;
  };
}> = ({ guvnorFirm, config }) => {
  /// Settings
  const [denomination] = useSetting('denomination');

  /// Chain
  const getChainToken = useGetChainToken();
  const Hooligan = getChainToken(HOOLIGAN);
  const urHooligan = getChainToken(UNRIPE_HOOLIGAN);
  const urHooliganCrv3 = getChainToken(UNRIPE_HOOLIGAN_CRV3);
  const unripeUnderlyingTokens = useUnripeUnderlyingMap();

  /// State
  const apyQuery = useAPY();
  const getBDV = useBDV();
  const hooliganhordeFirm = useSelector<AppState, AppState['_hooliganhorde']['firm']>(
    (state) => state._hooliganhorde.firm
  );
  const unripeTokens = useSelector<AppState, AppState['_hooligan']['unripe']>(
    (state) => state._hooligan.unripe
  );

  return (
    <Card>
      <Box
        display="flex"
        sx={{
          px: 3, // 1 + 2 from Table Body
          pt: '14px', // manually adjusted
          pb: '5px', // manually adjusted
          borderBottomStyle: 'solid',
          borderBottomColor: 'divider',
          borderBottomWidth: 1,
        }}
      >
        <Grid container alignItems="flex-end">
          <Grid item md={2.5} xs={4}>
            <Typography color="text.secondary">Token</Typography>
          </Grid>
          <Grid item md={3} xs={0} display={{ xs: 'none', md: 'block' }}>
            <Row gap={0.25}>
              <Tooltip
                title={
                  <>
                    The amount of Horde and Prospects earned for each 1 Hooligan
                    Denominated Value (BDV) Deposited in the Firm.
                  </>
                }
              >
                <Typography color="text.secondary">Rewards</Typography>
              </Tooltip>
              &nbsp;
              <Tooltip
                title={
                  <>
                    <strong>vAPY</strong> (Variable APY) uses historical data
                    about Hooligans earned by Hordeholders to estimate future
                    returns for Depositing assets in the Firm.&nbsp;
                    <Link
                      underline="hover"
                      href="https://docs.hooligan.black/almanac/guides/firm/understand-vapy"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Learn more
                    </Link>
                    <Divider sx={{ my: 1, borderColor: 'divider' }} />
                    <Typography fontSize={FontSize.sm}>
                      <strong>Hooligan vAPY:</strong> Estimated annual Hooligans earned
                      by a Hordeholder for Depositing an asset.
                      <br />
                      <strong>Horde vAPY:</strong> Estimated annual growth in
                      Horde for Depositing an asset.
                    </Typography>
                  </>
                }
              >
                <span>
                  <Row gap={0.25}>
                    <Chip
                      variant="filled"
                      color="primary"
                      label={
                        <Row gap={0.5}>
                          <TokenIcon token={HOOLIGAN[1]} /> vAPY
                        </Row>
                      }
                      onClick={undefined}
                      size="small"
                    />
                    <Chip
                      variant="filled"
                      color="secondary"
                      label={
                        <Row gap={0.5}>
                          <TokenIcon
                            token={
                              { symbol: 'Horde', logo: hordeIconBlue } as Token
                            }
                          />{' '}
                          vAPY
                        </Row>
                      }
                      onClick={undefined}
                      size="small"
                    />
                    {apyQuery.loading && (
                      <CircularProgress
                        variant="indeterminate"
                        size={12}
                        thickness={4}
                        sx={{ ml: 0.5 }}
                      />
                    )}
                  </Row>
                </span>
              </Tooltip>
            </Row>
          </Grid>
          <Grid item md={1.5} xs={0} display={{ xs: 'none', md: 'block' }}>
            <Tooltip title="Total Value Deposited in the Firm.">
              <Typography color="text.secondary">TVD</Typography>
            </Tooltip>
          </Grid>
          <Grid item md={3.5} xs={0} display={{ xs: 'none', md: 'block' }}>
            <Typography color="text.secondary">Amount Deposited</Typography>
          </Grid>
          <Grid
            item
            md={1.5}
            xs={8}
            sx={{
              textAlign: 'right',
              paddingRight: { xs: 0, md: `${ARROW_CONTAINER_WIDTH}px` },
            }}
          >
            <Tooltip
              title={
                <>
                  The value of your Firm deposits for each whitelisted token,
                  denominated in {denomination === 'bdv' ? 'Hooligans' : 'USD'}.
                  <br />
                  <Typography
                    color="text.secondary"
                    fontSize={FontSize.sm}
                    fontStyle="italic"
                  >
                    Switch to {denomination === 'bdv' ? 'USD' : 'Hooligans'}: Option
                    + F
                  </Typography>
                </>
              }
            >
              <Typography color="text.secondary">Value Deposited</Typography>
            </Tooltip>
          </Grid>
        </Grid>
      </Box>
      <Stack gap={1} p={1}>
        {config.whitelist.map((token) => {
          const deposited = guvnorFirm.balances[token.address]?.deposited;
          const isUnripe = token === urHooligan || token === urHooliganCrv3;
          // Unripe data
          const underlyingToken = isUnripe
            ? unripeUnderlyingTokens[token.address]
            : null;
          const pctUnderlyingDeposited = isUnripe
            ? (
                hooliganhordeFirm.balances[token.address]?.deposited.amount ||
                ZERO_BN
              ).div(unripeTokens[token.address]?.supply || ONE_BN)
            : ONE_BN;

          return (
            <Box key={`${token.address}-${token.chainId}`}>
              <Button
                component={RouterLink}
                to={`/firm/${token.address}`}
                fullWidth
                variant="outlined"
                color="secondary"
                size="large"
                sx={{
                  textAlign: 'left',
                  px: 2,
                  py: 1.5,
                  borderColor: 'divider',
                  borderWidth: '0.5px',
                  background: HooliganhordePalette.white,
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.light',
                  },
                }}
              >
                <Grid container alignItems="center">
                  {/**
                   * Cell: Token
                   */}
                  <Grid item md={2.5} xs={7}>
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
                   * Cell: Rewards
                   */}
                  <Grid
                    item
                    md={3}
                    xs={0}
                    display={{ xs: 'none', md: 'block' }}
                  >
                    <Row gap={0.75}>
                      <Tooltip
                        placement="right"
                        title={
                          <>
                            1 {token.symbol} = {displayFullBN(getBDV(token))}{' '}
                            BDV
                          </>
                        }
                      >
                        <Box>
                          <Row gap={0.2}>
                            <TokenIcon
                              token={HORDE}
                              css={{ height: '0.8em', marginTop: '-1px' }}
                            />
                            <Typography color="text.primary" mr={0.2}>
                              {token.rewards?.horde}
                            </Typography>
                            <TokenIcon token={PROSPECTS} />
                            <Typography color="text.primary">
                              {token.rewards?.prospects}
                            </Typography>
                          </Row>
                        </Box>
                      </Tooltip>
                      <Row gap={0.25}>
                        <FirmAssetApyChip token={token} metric="hooligan" />
                        <FirmAssetApyChip token={token} metric="horde" />
                      </Row>
                    </Row>
                  </Grid>

                  {/**
                   * Cell: TVD
                   */}
                  <Grid
                    item
                    md={1.5}
                    xs={0}
                    display={{ xs: 'none', md: 'block' }}
                  >
                    <Tooltip
                      placement="right"
                      componentsProps={TOOLTIP_COMPONENT_PROPS}
                      title={
                        isUnripe ? (
                          <Stack gap={0.5}>
                            <Stack
                              direction={{ xs: 'column', md: 'row' }}
                              gap={{ xs: 0, md: 1 }}
                              alignItems="stretch"
                            >
                              <Row display={{ xs: 'none', md: 'flex' }}>=</Row>
                              <Box sx={{ px: 1, py: 0.5, maxWidth: 215 }}>
                                <Stat
                                  title={
                                    <Row gap={0.5}>
                                      <TokenIcon token={underlyingToken!} />{' '}
                                      Ripe {underlyingToken!.symbol}
                                    </Row>
                                  }
                                  gap={0.25}
                                  variant="h4"
                                  amount={
                                    <Fiat
                                      token={underlyingToken!}
                                      amount={
                                        unripeTokens[token.address]
                                          ?.underlying || ZERO_BN
                                      }
                                      chop={false}
                                    />
                                  }
                                  subtitle={`The ${denomination.toUpperCase()} value of the ${
                                    underlyingToken!.symbol
                                  } underlying all ${token.symbol}.`}
                                />
                              </Box>
                              <Row>×</Row>
                              <Box sx={{ px: 1, py: 0.5, maxWidth: 245 }}>
                                <Stat
                                  title="% Deposited"
                                  gap={0.25}
                                  variant="h4"
                                  amount={`${pctUnderlyingDeposited
                                    .times(100)
                                    .toFixed(2)}%`}
                                  subtitle={
                                    <>
                                      The percentage of all {token.symbol} that
                                      is currently Deposited in the Firm.
                                    </>
                                  }
                                />
                              </Box>
                            </Stack>
                            <Divider sx={{ borderColor: 'divider' }} />
                            <Box sx={{ pl: { xs: 0, md: 2.7 } }}>
                              <Typography
                                variant="bodySmall"
                                color="text.tertiary"
                                textAlign="left"
                              >
                                Total Amount Deposited:{' '}
                                {displayFullBN(
                                  hooliganhordeFirm.balances[token.address]
                                    ?.deposited.amount || ZERO_BN,
                                  token.displayDecimals
                                )}{' '}
                                {token.symbol}
                                <br />
                                Total Supply:{' '}
                                {displayFullBN(
                                  unripeTokens[token.address]?.supply || ZERO_BN
                                )}{' '}
                                {token.symbol}
                                <br />
                              </Typography>
                            </Box>
                          </Stack>
                        ) : (
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            gap={{ xs: 0, md: 1 }}
                            alignItems="stretch"
                          >
                            <Row display={{ xs: 'none', md: 'flex' }}>=</Row>
                            <Box sx={{ px: 1, py: 0.5, maxWidth: 245 }}>
                              <Stat
                                title={
                                  <Row gap={0.5}>
                                    <TokenIcon token={token} /> Total Deposited{' '}
                                    {token.symbol}
                                  </Row>
                                }
                                gap={0.25}
                                variant="h4"
                                amount={displayTokenAmount(
                                  hooliganhordeFirm.balances[token.address]
                                    ?.deposited.amount || ZERO_BN,
                                  token,
                                  { showName: false }
                                )}
                                subtitle={
                                  <>
                                    The total number of {token.symbol} Deposited
                                    in the Firm.
                                  </>
                                }
                              />
                            </Box>
                            <Row>×</Row>
                            <Box sx={{ px: 1, py: 0.5 }}>
                              <Stat
                                title={`${token.symbol} Price`}
                                gap={0.25}
                                variant="h4"
                                amount={<Fiat token={token} amount={ONE_BN} />}
                                subtitle={`The current price of ${token.symbol}.`}
                              />
                            </Box>
                          </Stack>
                        )
                      }
                    >
                      <Typography display="inline" color="text.primary">
                        {isUnripe ? (
                          <>
                            <Fiat
                              token={underlyingToken!}
                              amount={pctUnderlyingDeposited.times(
                                unripeTokens[token.address]?.underlying ||
                                  ZERO_BN
                              )}
                              truncate
                              chop={false}
                            />
                            <Typography
                              display="inline"
                              color={HooliganhordePalette.theme.winter.red}
                            >
                              *
                            </Typography>
                          </>
                        ) : (
                          <Fiat
                            token={token}
                            amount={
                              hooliganhordeFirm.balances[token.address]?.deposited
                                .amount
                            }
                            truncate
                          />
                        )}
                      </Typography>
                    </Tooltip>
                  </Grid>

                  {/**
                   * Cell: Deposited Amount
                   */}
                  <Grid
                    item
                    md={3.5}
                    xs={0}
                    display={{ xs: 'none', md: 'block' }}
                  >
                    <Typography color="text.primary">
                      {/* If this is the entry for Hooligan deposits,
                       * display Earned Hooligans and Deposited Hooligans separately.
                       * Internally they are both considered "Deposited". */}
                      {token === Hooligan ? (
                        <Tooltip
                          title={
                            <>
                              {displayFullBN(
                                deposited?.amount || ZERO_BN,
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
                                  deposited?.amount || ZERO_BN
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
                              deposited?.amount || ZERO_BN,
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
                          deposited?.amount || ZERO_BN,
                          token.displayDecimals
                        )
                      )}
                      <Box display={{ md: 'inline', xs: 'none' }}>
                        &nbsp;{token.symbol}
                      </Box>
                    </Typography>
                  </Grid>

                  {/**
                   * Cell: My Deposits
                   */}
                  <Grid item md={1.5} xs={5}>
                    <Row justifyContent="flex-end">
                      <Tooltip
                        placement="left"
                        componentsProps={TOOLTIP_COMPONENT_PROPS}
                        title={
                          isUnripe ? (
                            <Stack
                              direction={{ xs: 'column', md: 'row' }}
                              gap={{ xs: 0, md: 1 }}
                              alignItems="stretch"
                            >
                              <Box sx={{ px: 1, py: 0.5 }}>
                                <Stat
                                  title={
                                    <Row gap={0.5}>
                                      <TokenIcon token={token} /> {token.symbol}
                                    </Row>
                                  }
                                  gap={0.25}
                                  variant="h4"
                                  amount={displayTokenAmount(
                                    deposited?.amount || ZERO_BN,
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
                              <Row>×</Row>
                              <Box sx={{ px: 1, py: 0.5, maxWidth: 215 }}>
                                <Stat
                                  title="Chop Rate"
                                  gap={0.25}
                                  variant="h4"
                                  amount={`1 - ${(
                                    unripeTokens[token.address]?.chopPenalty ||
                                    ZERO_BN
                                  ).toFixed(4)}%`}
                                  subtitle={
                                    <>
                                      The current penalty for chopping
                                      <br />
                                      {token.symbol} for{' '}
                                      {
                                        unripeUnderlyingTokens[token.address]
                                          .symbol
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
                                        unripeUnderlyingTokens[token.address]
                                      }
                                      amount={ONE_BN}
                                      chop={false}
                                    />
                                  }
                                  subtitle={`The current price of ${
                                    unripeUnderlyingTokens[token.address].symbol
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
                          ) : (
                            ''
                          )
                        }
                      >
                        <Typography color="text.primary">
                          <Row gap={0.3}>
                            <Fiat token={token} amount={deposited?.amount} />
                            {isUnripe ? (
                              <Typography
                                display="inline"
                                color={HooliganhordePalette.theme.winter.red}
                              >
                                *
                              </Typography>
                            ) : null}
                          </Row>
                        </Typography>
                      </Tooltip>
                      <Stack
                        display={{ xs: 'none', md: 'block' }}
                        sx={{ width: ARROW_CONTAINER_WIDTH }}
                        alignItems="center"
                      >
                        <ArrowRightIcon
                          sx={{ color: 'secondary.main', marginTop: '3px' }}
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
    </Card>
  );
};

export default Whitelist;
