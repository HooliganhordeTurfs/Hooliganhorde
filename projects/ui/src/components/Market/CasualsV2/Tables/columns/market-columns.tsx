import React, { useCallback } from 'react';
import {
  GridColumns,
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridValueFormatterParams,
} from '@mui/x-data-grid';
import BigNumber from 'bignumber.js';
import {
  Box,
  IconButton,
  Link,
  Stack,
  Tooltip,
  TooltipProps,
  Typography,
} from '@mui/material';
import { DateTime } from 'luxon';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
// import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import toast from 'react-hot-toast';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { CasualListing, CasualOrder, PricingType } from '~/state/guvnor/market';
import { displayBN, displayFullBN, MinBN } from '~/util';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import { ZERO_BN } from '~/constants';
import { HooliganhordePalette, FontSize } from '~/components/App/muiTheme';
import { GuvnorMarketOrder } from '~/hooks/guvnor/market/useGuvnorMarket2';
import etherscanIcon from '~/img/hooliganhorde/interface/nav/etherscan.svg';
import EntityIcon from '~/components/Market/CasualsV2/Common/EntityIcon';
import { MarketEvent } from '~/hooks/hooliganhorde/useMarketActivityData';
import { FC } from '~/types';
import StatHorizontal from '~/components/Common/StatHorizontal';

// componentsProps={{ tooltip: { sx: { fontSize: 10 } } }}
const TooltipPill: FC<
  { title: string | React.ReactElement } & {
    placement?: TooltipProps['placement'];
  }
> = ({ children, title, placement }) => (
  <Tooltip
    title={title ? <Typography fontSize={FontSize.sm}>{title}</Typography> : ''}
    placement={placement || 'right'}
  >
    <Box
      sx={{
        display: 'inline-block',
        px: 0.25,
        '&:hover': {
          outlineOffset: 1,
          backgroundColor: HooliganhordePalette.white,
          outlineColor: HooliganhordePalette.lightGrey,
          outlineStyle: 'solid',
          outlineWidth: 1,
          borderRadius: 0.5,
        },
      }}
    >
      {children}
    </Box>
  </Tooltip>
);

const Copy: FC<{ value: string }> = ({ value }) => {
  const onClick = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast('Copied to clipboard');
  }, [value]);
  return (
    <IconButton onClick={onClick} sx={{ ml: 0.5 }}>
      <FileCopyIcon
        width={12}
        height={12}
        fontSize="small"
        sx={{ width: 12, height: 12 }}
      />
    </IconButton>
  );
};

/// ////////////////////////// Constants /////////////////////////////

const MARKET_STATUS_TO_COLOR = {
  active: HooliganhordePalette.logoGreen,
  cancelled: 'text.secondary',
  cancelled_partial: 'text.secondary',
};

const iconSx = {
  width: 14,
  height: 14,
};

const MARKET_EVENT_TO_ICON = {
  fill: <SwapHorizIcon sx={iconSx} />,
  create: <AddCircleOutlineIcon sx={iconSx} />,
  cancel: <DoNotDisturbIcon sx={iconSx} />,
};

/// ////////////////////////// Utilities /////////////////////////////

const formatDate = (value: string | undefined) => {
  if (!value) return '-';
  const date = DateTime.fromMillis((Number(value) * 1000) as number);
  return date.toLocaleString({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/// ////////////////////////// Columns /////////////////////////////

export const MarketColumns = {
  /** Consistent across tabs */
  Shared: {
    /** */
    createdAt: (
      flex: number,
      align?: 'left' | 'right',
      headerName = 'DATE',
      hashKey = 'hash'
    ) =>
      ({
        field: 'createdAt',
        headerName: headerName,
        flex: flex,
        maxWidth: 150, // captures timestamp length
        align: align || 'left',
        headerAlign: align || 'left',
        valueFormatter: (params: GridValueFormatterParams) =>
          formatDate(params.value),
        renderCell: (params: GridRenderCellParams) => (
          <Typography color="text.secondary" sx={{ fontSize: 'inherit' }}>
            {params.row[hashKey] ? (
              <Link
                href={`https://etherscan.io/tx/${params.row[hashKey]}`}
                rel="noreferrer"
                target="_blank"
                underline="hover"
                color="text.tertiary"
                sx={{ '&:hover img': { display: 'inline-block' } }}
              >
                <Row>
                  <span>{params.formattedValue}</span>
                  <img
                    src={etherscanIcon}
                    alt=""
                    css={{ height: 12, marginLeft: 5, display: 'none' }}
                  />
                </Row>
              </Link>
            ) : (
              params.formattedValue
            )}
          </Typography>
        ),
      } as GridColumns[number]),
    /** */
    pricePerCasual: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'pricePerCasual',
        headerName: 'PRICE',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        type: 'number',
        renderCell: (params: GridRenderCellParams) =>
          params.value?.gt(0) ? (
            <Row gap={0.25}>
              <TokenIcon token={HOOLIGAN[1]} />
              <span>{displayFullBN(params.value || ZERO_BN, 6, 0)}</span>
            </Row>
          ) : (
            '-'
          ),
      } as GridColumns[number]),

    /** */
    placeInLine: (
      type: undefined | 'listing' | 'order',
      flex: number,
      align?: 'left' | 'right'
    ) =>
      ({
        field: type === 'order' ? 'maxPlaceInLine' : 'placeInLine',
        headerName: 'PLACE IN LINE',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        type: 'number',
        renderCell: (params: GridRenderCellParams<any, GuvnorMarketOrder>) => {
          if (!params.value || params.value.eq(0)) return <>-</>;
          if ((type || params.row.type) === 'listing') {
            return (
              <TooltipPill
                title={
                  <StatHorizontal label="Place in Line">
                    {displayFullBN(params.value)}
                  </StatHorizontal>
                }
              >
                <>{displayBN(params.value)}</>
              </TooltipPill>
            );
          }
          return (
            <TooltipPill
              title={
                <Stack gap={0.5}>
                  <StatHorizontal label="Max Place in Line">
                    {displayFullBN(params.value)}
                  </StatHorizontal>
                  <Typography fontSize="inherit">
                    <InfoOutlinedIcon fontSize="inherit" sx={{ mb: -0.3 }} />{' '}
                    Any Casual before {displayBN(params.value)} can Fill this
                    Order.
                  </Typography>
                </Stack>
              }
            >
              <>{`${
                params.row.pricingType === PricingType.DYNAMIC ? '*' : '0'
              } - ${displayBN(params.value)}`}</>
            </TooltipPill>
          );
        },
      } as GridColumns[number]),

    /** */
    expiry: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'expiry',
        headerName: 'EXPIRES IN',
        flex: flex,
        align: align || 'left',
        type: 'number',
        headerAlign: align || 'left',
        renderCell: (params: GridRenderCellParams) => {
          const expiry = params.value as BigNumber;
          const hasExpiry = expiry.gt(0);
          return (
            <TooltipPill
              title={
                hasExpiry ? (
                  <Stack gap={0.5}>
                    <StatHorizontal label="Expires in">
                      {displayFullBN(expiry)} Casuals
                    </StatHorizontal>
                    <Typography fontSize="inherit">
                      <InfoOutlinedIcon fontSize="inherit" sx={{ mb: -0.3 }} />{' '}
                      This Listing will automatically expire when{' '}
                      {displayBN(expiry)} more Casuals become Draftable.
                      {/* <InfoOutlinedIcon fontSize="inherit" sx={{ mb: -0.3 }} /> This Listing will automatically expire when the Casual Line moves forward by {displayBN(expiry)} Casuals. */}
                    </Typography>
                  </Stack>
                ) : (
                  ''
                )
              }
            >
              <Typography
                sx={{ fontSize: 'inherit' }}
                color={hasExpiry ? undefined : 'text.tertiary'}
              >
                {hasExpiry ? `${displayBN(expiry)} CASUALS` : 'N/A'}
              </Typography>
            </TooltipPill>
          );
        },
      } as GridColumns[number]),
  },

  /** "MARKET ACTVITY" */
  ActivityItem: {
    /** create | cancel | fill */
    labelAction: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'action',
        headerName: 'ACTION',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        renderCell: (params: GridRenderCellParams<string, MarketEvent>) =>
          params.value ? (
            <Row gap={0.25}>
              {
                MARKET_EVENT_TO_ICON[
                  params.value as keyof typeof MARKET_EVENT_TO_ICON
                ]
              }
              <span>{params.value.toUpperCase()}</span>
            </Row>
          ) : (
            '-'
          ),
      } as GridColumns[number]),
  },

  /** "YOUR ORDERS" */
  HistoryItem: {
    /** order | listing */
    labelType: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'type',
        headerName: 'TYPE',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        renderCell: (
          params: GridRenderCellParams<any, GuvnorMarketOrder | MarketEvent>
        ) => (
          <TooltipPill
            title={
              <>
                <StatHorizontal label="ID">
                  {params.row.type === 'listing'
                    ? params.row.id
                    : params.row.id.substring(0, 8)}
                  <Copy value={params.row.id} />
                </StatHorizontal>
              </>
            }
          >
            <Row gap={0.5}>
              <EntityIcon type={params.value} size={12} />
              <span>{params.value.toString().toUpperCase()}</span>
            </Row>
          </TooltipPill>
        ),
      } as GridColumns[number]),

    /** */
    amountCasuals: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'amountCasuals',
        headerName: 'AMOUNT',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        type: 'number',
        renderCell: (params: GridRenderCellParams) =>
          params.value ? (
            <Row gap={0.25}>
              <TokenIcon token={CASUALS} />
              <span>{displayFullBN(params.value, 2, 0)}</span>
            </Row>
          ) : (
            '-'
          ),
      } as GridColumns[number]),

    /** */
    fillPct: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'fillPct',
        headerName: 'FILL %',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        type: 'number',
        renderCell: (params: GridRenderCellParams<any, GuvnorMarketOrder>) => {
          const progress = MinBN(
            // round down so that we don't show 100% when it's not fully filled
            (params.value as BigNumber).dp(2, BigNumber.ROUND_DOWN),
            // cap at 100% to prevent bad data from confusing users
            new BigNumber(100)
          );
          const title =
            params.row.type === 'listing' ? (
              <>
                <StatHorizontal label="Listed">
                  {displayFullBN(params.row.amountCasuals, 6)} CASUALS
                </StatHorizontal>
                <StatHorizontal label="Sold" color={HooliganhordePalette.washedRed}>
                  - {displayFullBN(params.row.amountCasualsFilled, 6)} CASUALS
                </StatHorizontal>
                <StatHorizontal
                  label="Received"
                  color={HooliganhordePalette.logoGreen}
                >
                  + {displayFullBN(params.row.amountHooligansFilled, 6)} HOOLIGAN
                </StatHorizontal>
              </>
            ) : (
              <>
                <StatHorizontal label="Ordered">
                  {displayFullBN(params.row.amountCasuals, 6)} CASUALS
                </StatHorizontal>
                <StatHorizontal label="Sold" color={HooliganhordePalette.washedRed}>
                  - {displayFullBN(params.row.amountHooligansFilled, 6)} HOOLIGAN
                </StatHorizontal>
                <StatHorizontal
                  label="Received"
                  color={HooliganhordePalette.logoGreen}
                >
                  + {displayFullBN(params.row.amountCasualsFilled, 6)} CASUALS
                </StatHorizontal>
              </>
            );
          return (
            <TooltipPill title={title}>
              <Typography
                sx={{
                  fontSize: 'inherit',
                  color: params.value.gt(0) ? 'text.primary' : 'text.secondary',
                }}
              >
                {progress.isNaN() ? '-' : `${displayFullBN(progress, 2, 2)}%`}
              </Typography>
            </TooltipPill>
          );
        },
      } as GridColumns[number]),

    /** */
    amountHooligans: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'amountHooligans',
        headerName: 'TOTAL',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        type: 'number',
        renderCell: (params: GridRenderCellParams) =>
          params.value ? (
            <Row gap={0.25}>
              <TokenIcon token={HOOLIGAN[1]} />
              <span>{displayBN(params.value || ZERO_BN)}</span>
            </Row>
          ) : (
            '-'
          ),
      } as GridColumns[number]),

    /** */
    status: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'status',
        headerName: 'STATUS',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        renderCell: (params: GridRenderCellParams) => {
          const key = params.value.toLowerCase();
          const color =
            key in MARKET_STATUS_TO_COLOR
              ? MARKET_STATUS_TO_COLOR[
                  key as keyof typeof MARKET_STATUS_TO_COLOR
                ]
              : 'text.primary';

          return (
            <Typography sx={{ fontSize: 'inherit', color: color }}>
              {params.value.toString().toUpperCase()}
            </Typography>
          );
        },
      } as GridColumns[number]),
  },

  /** "BUY NOW" (Casual Listings) */
  CasualListing: {
    /** */
    listingId: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'id',
        headerName: 'Listing',
        flex,
        align: align || 'left',
        headerAlign: align || 'left',
        renderCell: (params: GridRenderEditCellParams<any, CasualListing>) => (
          <Row gap={0.5}>
            <EntityIcon type="listing" size={12} />
            <span>{params.value}</span>
          </Row>
        ),
      } as GridColumns[number]),

    /** */
    placeInLine: (
      draftableIndex: BigNumber,
      flex: number,
      align?: 'left' | 'right'
    ) =>
      ({
        field: 'index',
        headerName: 'Place in Line',
        type: 'number',
        flex,
        align: align || 'left',
        headerAlign: align || 'left',
        valueGetter: (params: GridRenderCellParams) =>
          params.value - draftableIndex.toNumber(),
        renderCell: (params: GridRenderCellParams) => (
          <>
            <Typography
              sx={{ fontSize: 'inherit' }}
              display={{ xs: 'none', md: 'block' }}
            >
              {displayFullBN(new BigNumber(params.value), 0)}
            </Typography>
            <Typography
              sx={{ fontSize: 'inherit' }}
              display={{ xs: 'block', md: 'none' }}
            >
              {displayBN(new BigNumber(params.value))}
            </Typography>
          </>
        ),
      } as GridColumns[number]),

    /** */
    remainingAmount: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'remainingAmount',
        headerName: 'Amount',
        flex: flex,
        type: 'number',
        // disableColumnMenu: true,
        align: align || 'right',
        headerAlign: align || 'right',
        renderCell: (params: GridRenderCellParams<any, CasualListing>) => (
          <Row gap={0.25}>
            <TokenIcon token={CASUALS} />
            <Typography sx={{ fontSize: 'inherit' }}>
              {displayBN(params.row.remainingAmount)}
            </Typography>
          </Row>
        ),
      } as GridColumns[number]),
  },

  /** "SELL NOW" (Casual Orders) */
  CasualOrder: {
    /** */
    orderId: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'id',
        headerName: 'Order',
        flex,
        align: align || 'left',
        headerAlign: align || 'left',
        renderCell: (params: GridRenderCellParams<any, CasualOrder>) => (
          <Row gap={0.5}>
            <EntityIcon type="order" size={12} />
            <span>{params.value.substring(0, 8)}</span>
          </Row>
        ),
      } as GridColumns[number]),

    /** */
    casualAmountRemaining: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'casualAmountRemaining',
        headerName: 'AMOUNT',
        type: 'number',
        flex: flex,
        align: align || 'right',
        headerAlign: align || 'right',
        renderCell: (params: GridRenderCellParams<any, CasualOrder>) => (
          <TooltipPill
            placement="right"
            title={
              <>
                <StatHorizontal label="Casuals Remaining">
                  {displayFullBN(params.row.casualAmountRemaining, 6, 0)}
                </StatHorizontal>
              </>
            }
          >
            <Row gap={0.25}>
              <TokenIcon token={CASUALS} />
              <Typography sx={{ fontSize: 'inherit' }}>
                {displayBN(params.value)}
              </Typography>
            </Row>
          </TooltipPill>
        ),
      } as GridColumns[number]),

    /** For orders, place in line is a range from 0 - maxPlaceInLine. */
    maxPlaceInLine: (flex: number, align?: 'left' | 'right') =>
      ({
        field: 'maxPlaceInLine',
        headerName: 'Place in Line',
        type: 'number',
        flex: flex,
        align: align || 'left',
        headerAlign: align || 'left',
        valueGetter: (params: GridRenderCellParams) =>
          (params.value as BigNumber).toNumber(),
        renderCell: (params: GridRenderCellParams) => (
          <>
            <Typography
              sx={{ fontSize: 'inherit' }}
              display={{ xs: 'none', md: 'block' }}
            >
              0 - {displayFullBN(new BigNumber(params.value), 0)}
            </Typography>
            <Typography
              sx={{ fontSize: 'inherit' }}
              display={{ xs: 'block', md: 'none' }}
            >
              0 - {displayBN(new BigNumber(params.value))}
            </Typography>
          </>
        ),
      } as GridColumns<GuvnorMarketOrder>[number]),
  },
};
