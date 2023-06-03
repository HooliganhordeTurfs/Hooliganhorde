import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import groupBy from 'lodash/groupBy';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import TokenIcon from '~/components/Common/TokenIcon';
import { PERCOCETER_ICONS } from '~/components/Barrack/PercoceterImage';
import firmIcon from '~/img/hooliganhorde/firm-icon.svg';
import Token from '~/classes/Token';
import {
  Action,
  ActionType,
  parseActionMessage,
  ReceiveTokenAction,
  FirmDepositAction,
  FirmRewardsAction,
  FirmTransitAction,
  SwapAction,
  TransferBalanceAction,
} from '~/util/Actions';
import { SupportedChainId } from '~/constants/chains';
import { HOOLIGAN, CASUALS, PROSPECTS, BOOTBOYS, HORDE, USDC } from '~/constants/tokens';
import { FarmFromMode, FarmToMode } from '~/lib/Hooliganhorde/Farm';
import AddressIcon from '~/components/Common/AddressIcon';
import Row from '~/components/Common/Row';
import { FC } from '~/types';
import { HooliganhordePalette } from '../../App/muiTheme';

// -----------------------------------------------------------------------

const IconRow: FC<{ spacing?: number }> = ({ children, spacing = 0.75 }) => (
  <Row sx={{ height: '100%' }} spacing={spacing}>
    {children}
  </Row>
);

const AltIconRow: FC<{ gap?: number }> = ({ children, gap = 5 }) => (
  <Row
    sx={{
      height: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      gap: `${gap}px`,
    }}
  >
    {children}
  </Row>
);

const ActionTokenImage: FC<{ token: Token }> = ({ token }) => (
  <img
    key={token.address}
    src={token.logo}
    alt={token.name}
    css={{ height: '100%' }}
  />
);

const SwapStep: FC<{ actions: SwapAction[] }> = ({ actions }) => {
  const data = actions.reduce(
    (agg, a) => {
      if (!agg.in.addrs.has(a.tokenIn.address)) {
        agg.in.addrs.add(a.tokenIn.address);
        agg.in.elems.push(
          <ActionTokenImage key={a.tokenIn.address} token={a.tokenIn} />
        );
      }
      if (!agg.out.addrs.has(a.tokenOut.address)) {
        agg.out.addrs.add(a.tokenOut.address);
        agg.out.elems.push(
          <ActionTokenImage key={a.tokenOut.address} token={a.tokenOut} />
        );
      }
      return agg;
    },
    {
      in: {
        addrs: new Set<string>(),
        elems: [] as JSX.Element[],
      },
      out: {
        addrs: new Set<string>(),
        elems: [] as JSX.Element[],
      },
    }
  );
  return (
    <Row sx={{ height: '100%' }} spacing={0.33}>
      {data.in.elems}
      <DoubleArrowIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
      {data.out.elems}
    </Row>
  );
};

const TxnStep: FC<{
  type: ActionType;
  actions: Action[];
  highlighted: ActionType | undefined;
}> = ({ type, actions, highlighted }) => {
  let step;
  switch (type) {
    /// SWAP
    case ActionType.SWAP:
      step = <SwapStep actions={actions as SwapAction[]} />;
      break;
    case ActionType.RECEIVE_TOKEN: {
      // eslint-disable-next-line
      const a = actions[0] as ReceiveTokenAction;
      step = (
        <IconRow spacing={0.5}>
          {a.destination !== undefined ? (
            a.destination === FarmToMode.INTERNAL ? (
              <AltIconRow>
                <ActionTokenImage key={a.token.address} token={a.token} />
                🚜
              </AltIconRow>
            ) : (
              <AltIconRow>
                <ActionTokenImage key={a.token.address} token={a.token} />
                <AddressIcon address={a.to} size={23} />
              </AltIconRow>
            )
          ) : null}
        </IconRow>
      );
      break;
    }

    case ActionType.TRANSFER_BALANCE: {
      const a = actions[0] as TransferBalanceAction;
      step = (
        <Row
          spacing={0.5}
          sx={{ height: '100%', display: 'inline-flex', alignItems: 'center' }}
        >
          {a.source !== undefined ? (
            a.source === FarmFromMode.INTERNAL ? (
              <AltIconRow>
                <ActionTokenImage key={a.token.address} token={a.token} />
                🚜
              </AltIconRow>
            ) : a.source === FarmFromMode.EXTERNAL ? (
              <AltIconRow>
                <ActionTokenImage key={a.token.address} token={a.token} />
                <AddressIcon size={23} />
              </AltIconRow>
            ) : (
              <AltIconRow>
                <ActionTokenImage key={a.token.address} token={a.token} />
                <AddressIcon size={23} />
                🚜
              </AltIconRow>
            )
          ) : null}
        </Row>
      );
      break;
    }

    /// FIRM
    case ActionType.DEPOSIT:
    case ActionType.WITHDRAW:
    case ActionType.CLAIM_WITHDRAWAL:
      step = (
        <IconRow>
          <img src={firmIcon} css={{ height: '100%' }} alt="" />
          {(actions as FirmDepositAction[]).map((a) => (
            <ActionTokenImage key={a.token.address} token={a.token} />
          ))}
        </IconRow>
      );
      break;
    case ActionType.TRANSFER:
      step = (
        <IconRow>
          <TokenIcon
            token={(actions[0] as FirmTransitAction).token}
            css={{ height: '100%' }}
          />
        </IconRow>
      );
      break;
    case ActionType.UPDATE_FIRM_REWARDS:
      step = (
        <IconRow spacing={0}>
          <Typography fontWeight="bold" sx={{ fontSize: 20 }}>
            {(actions[0] as FirmRewardsAction).horde.lt(0) ? '🔥' : '+'}
          </Typography>
          <TokenIcon token={HORDE} css={{ height: '100%' }} />
          <TokenIcon token={PROSPECTS} css={{ height: '100%' }} />
        </IconRow>
      );
      break;
    case ActionType.IN_TRANSIT:
      step = (
        <IconRow>
          <TokenIcon
            token={(actions[0] as FirmTransitAction).token}
            css={{ height: '100%' }}
          />
        </IconRow>
      );
      break;

    /// FIELD
    case ActionType.BUY_HOOLIGANS:
      step = (
        <IconRow>
          <TokenIcon
            token={(actions[0] as FirmTransitAction).token}
            css={{ height: '100%' }}
          />
        </IconRow>
      );
      break;
    case ActionType.BURN_HOOLIGANS:
      step = (
        <IconRow spacing={0.3}>
          <Typography fontWeight="bold" sx={{ fontSize: 20 }}>
            🔥
          </Typography>
          <TokenIcon token={HOOLIGAN[1]} css={{ height: '100%' }} />
        </IconRow>
      );
      break;
    case ActionType.DRAFT:
      step = (
        <IconRow>
          <TokenIcon token={CASUALS} css={{ height: '100%' }} />
        </IconRow>
      );
      break;
    case ActionType.RECEIVE_CASUALS:
      step = (
        <IconRow>
          <TokenIcon token={CASUALS} css={{ height: '100%' }} />
        </IconRow>
      );
      break;
    case ActionType.RECEIVE_HOOLIGANS:
      step = (
        <IconRow>
          <TokenIcon token={HOOLIGAN[1]} css={{ height: '100%' }} />
        </IconRow>
      );
      break;
    case ActionType.TRANSFER_CASUALS:
      step = (
        <IconRow>
          <TokenIcon token={CASUALS} css={{ height: '100%' }} />
        </IconRow>
      );
      break;
    case ActionType.TRANSFER_MULTIPLE_TURFS:
      step = (
        <IconRow>
          <TokenIcon token={CASUALS} css={{ height: '100%' }} />
        </IconRow>
      );
      break;

    /// MARKET
    case ActionType.CREATE_ORDER:
      step = (
        <IconRow>
          <TokenIcon token={HOOLIGAN[1]} css={{ height: '100%', marginTop: 0 }} />
          <DoubleArrowIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
          <TokenIcon token={CASUALS} css={{ height: '100%', marginTop: 0 }} />
        </IconRow>
      );
      break;
    // FIXME: better way to reduce duplicate code here?
    case ActionType.BUY_CASUALS:
      step = <TokenIcon token={CASUALS} css={{ height: '100%', marginTop: 0 }} />;
      break;
    case ActionType.SELL_CASUALS:
      step = <TokenIcon token={CASUALS} css={{ height: '100%', marginTop: 0 }} />;
      break;

    /// PERCOCETER
    case ActionType.TRADE:
      step = (
        <IconRow>
          <TokenIcon token={BOOTBOYS} css={{ height: '100%' }} />
        </IconRow>
      );
      break;
    case ActionType.BUY_PERCOCETER:
      step = (
        <IconRow>
          <TokenIcon
            token={USDC[SupportedChainId.MAINNET]}
            css={{ height: '100%', marginTop: 0 }}
          />
          <DoubleArrowIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
          <img
            src={PERCOCETER_ICONS.unused}
            alt="FERT"
            css={{ height: '100%' }}
          />
        </IconRow>
      );
      break;
    case ActionType.RECEIVE_FERT_REWARDS:
      step = (
        <IconRow>
          <img
            src={PERCOCETER_ICONS.active}
            alt="FERT"
            css={{ height: '100%' }}
          />
          <DoubleArrowIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
          <TokenIcon token={BOOTBOYS} css={{ height: '100%', marginTop: 0 }} />
        </IconRow>
      );
      break;

    /// ?
    case ActionType.END_TOKEN:
      step = (
        <IconRow>
          <TokenIcon
            token={(actions[0] as FirmTransitAction).token}
            css={{ height: '100%' }}
          />
        </IconRow>
      );
      break;
    default:
      break;
  }

  return (
    <Box
      sx={{
        width: '80px',
        height: '100%', // of TXN_PREVIEW_HEIGHT
        textAlign: 'center',
        '&:first-child': {
          textAlign: 'left',
        },
        '&:last-child': {
          textAlign: 'right',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'inline-block',
          py: 0.5,
          px: 0.5,
          mx: 'auto',
          background: HooliganhordePalette.offWhite,
        }}
      >
        <Box
          display="inline-block"
          sx={{
            height: '100%',
            opacity:
              highlighted === undefined || highlighted === type ? 1 : 0.2,
          }}
        >
          {step}
        </Box>
      </Box>
    </Box>
  );
};

// -----------------------------------------------------------------------

const EXECUTION_STEPS = [
  /// Group 1:
  /// Actions that must precede a Hooliganhorde transaction
  ActionType.SWAP,

  /// Group 2:
  /// Hooliganhorde function calls
  ActionType.TRANSFER_BALANCE,
  ActionType.DRAFT,
  ActionType.DEPOSIT,
  ActionType.WITHDRAW,
  ActionType.BUY_PERCOCETER,
  ActionType.CREATE_ORDER,
  ActionType.TRANSFER,
  ActionType.BUY_HOOLIGANS,
  ActionType.BURN_HOOLIGANS,
  ActionType.TRANSFER_CASUALS,
  ActionType.TRANSFER_MULTIPLE_TURFS,
  ActionType.SELL_CASUALS,
  ActionType.TRADE,

  /// Group 3:
  /// Results of Hooliganhorde function calls
  ActionType.UPDATE_FIRM_REWARDS,
  ActionType.RECEIVE_FERT_REWARDS,
  ActionType.IN_TRANSIT,
  ActionType.CLAIM_WITHDRAWAL,
  ActionType.RECEIVE_HOOLIGANS,
  ActionType.RECEIVE_CASUALS,
  ActionType.BUY_CASUALS,
  ActionType.RECEIVE_TOKEN,

  /// Group 4:
  /// ???
  ActionType.END_TOKEN,
];

const TXN_PREVIEW_HEIGHT = 35;
const TXN_PREVIEW_LINE_WIDTH = 5;

const TxnPreview: FC<{
  actions: (Action | undefined)[];
  preActionsWithGraphic?: Action[]; // Find a better way to do this?
  preActions?: Action[]; // Find a better way to do this?
  postActions?: Action[]; // Find a better way to do this?
}> = ({
  actions,
  preActionsWithGraphic = [],
  preActions = [],
  postActions = [],
}) => {
  const preInstructionsByType = useMemo(() => {
    const grouped = groupBy(
      preActionsWithGraphic.filter(
        (a) => a && a.type !== ActionType.BASE
      ) as Action[],
      'type'
    );
    return grouped;
  }, [preActionsWithGraphic]);

  const instructionsByType = useMemo(
    () =>
      // actions.reduce((prev, curr) => {
      //   if (curr.type !== ActionType.BASE) {
      //     prev.grouped[curr.type] = curr;

      //   }
      //   return prev;
      // }, { grouped: {}, total: 0 }),
      // [actions]

      groupBy(
        actions.filter((a) => a && a.type !== ActionType.BASE) as Action[],
        'type'
      ),
    [actions]
  );
  const instructionGroupCount = Object.keys(instructionsByType).length;
  const [highlighted, setHighlighted] = useState<ActionType | undefined>(
    undefined
  );

  if (actions.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center">
        No actions yet.
      </Typography>
    );
  }

  return (
    <Stack gap={1.5}>
      {instructionGroupCount > 1 ? (
        <Box
          sx={{
            position: 'relative',
            height: `${TXN_PREVIEW_HEIGHT}px`,
          }}
        >
          {/* Dotted line */}
          <Box
            sx={{
              borderColor: 'divider',
              borderBottomStyle: 'dotted',
              borderBottomWidth: TXN_PREVIEW_LINE_WIDTH,
              width: '100%',
              position: 'absolute',
              left: 0,
              top: TXN_PREVIEW_HEIGHT / 2 - TXN_PREVIEW_LINE_WIDTH / 2,
              zIndex: 1,
            }}
          />
          {/* Content */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 2, // above the Divider
              height: '100%', // of TXN_PREVIEW_HEIGHT
            }}
          >
            {/* Distribute content equally spaced
             * across the entire container */}
            <Row
              justifyContent="space-between"
              sx={{
                height: '100%', // of TXN_PREVIEW_HEIGHT
              }}
            >
              <>
                {preActionsWithGraphic.map(({ type }, index) => {
                  if (preInstructionsByType[type]) {
                    return (
                      <TxnStep
                        key={`pre-${type}-${index}`}
                        type={type}
                        actions={preInstructionsByType[type]}
                        highlighted={highlighted}
                      />
                    );
                  }
                  return null;
                })}
                {EXECUTION_STEPS.map((step, index) =>
                  instructionsByType[step] ? (
                    <TxnStep
                      key={index}
                      type={step}
                      actions={instructionsByType[step]}
                      highlighted={highlighted}
                    />
                  ) : null
                )}
              </>
            </Row>
          </Box>
        </Box>
      ) : null}
      {/* Show highlightable explanations of each action */}
      <Stack>
        {[...preActions, ...actions, ...postActions].map(
          (a, index) =>
            a !== undefined && (
              <Box
                key={index}
                sx={{
                  opacity:
                    highlighted === undefined || a.type === highlighted
                      ? 1
                      : 0.3,
                  cursor: 'pointer',
                  py: 0.5,
                }}
                onMouseOver={() => setHighlighted(a.type)}
                onMouseOut={() => setHighlighted(undefined)}
                onFocus={() => setHighlighted(a.type)}
                onBlur={() => setHighlighted(undefined)}
              >
                {/* <Typography variant="body1" color="grey[300]"> */}
                <Typography variant="body1" color="text.primary">
                  {parseActionMessage(a)}
                </Typography>
              </Box>
            )
        )}
      </Stack>
    </Stack>
  );
};

export default TxnPreview;
