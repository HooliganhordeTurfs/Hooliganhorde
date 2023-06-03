import React from 'react';
import { Box, Divider, Link, Stack, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import Token from '~/classes/Token';
import { displayBN, toTokenUnitsBN } from '~/util';
import { HOOLIGAN, CASUALS, FIRM_WHITELIST } from '~/constants/tokens';
import { SupportedChainId } from '~/constants/chains';
import { Event } from '~/lib/Hooliganhorde/EventProcessor';
import TokenIcon from '../Common/TokenIcon';
import useTokenMap from '../../hooks/chain/useTokenMap';
import Row from '~/components/Common/Row';
import { FC } from '~/types';

export interface EventItemProps {
  event: Event;
  account: string;
}

/**
 * Token Display with respect to the User.
 * - "in"  = I receive something.
 * - "out" = I spend something.
 */
const TokenDisplay: FC<{
  color?: 'green' | 'red';
  input?: [BigNumber, Token];
}> = (props) => (
  <div>
    {props.input ? (
      <Row gap={0.3}>
        <Typography variant="body1" color={props.color}>
          {props.color === 'red' ? '-' : '+'}
        </Typography>
        <TokenIcon token={props.input[1]} />
        <Typography variant="body1" color={props.color}>
          {`${displayBN(props.input[0])}`}
        </Typography>
      </Row>
    ) : null}
  </div>
);

const EventItem: FC<EventItemProps> = ({ event, account }) => {
  // const [expanded, setExpanded] = useState(false);
  let eventTitle = `${event.event}`;
  let amountIn;
  let amountOut;

  const firmTokens = useTokenMap(FIRM_WHITELIST);

  const processTokenEvent = (
    e: Event,
    title: string,
    showInput?: boolean,
    showOutput?: boolean
  ) => {
    const tokenAddr = e.args?.token.toString().toLowerCase();
    if (firmTokens[tokenAddr]) {
      const token = firmTokens[tokenAddr];
      const amount = toTokenUnitsBN(
        new BigNumber(event.args?.amount.toString()),
        token.decimals
      );
      eventTitle = `${title} ${token.symbol}`;
      if (showInput) {
        amountIn = <TokenDisplay color="green" input={[amount, token]} />;
      }
      if (showOutput) {
        amountOut = <TokenDisplay color="red" input={[amount, token]} />;
      }
    }
  };

  switch (event.event) {
    case 'AddDeposit': {
      processTokenEvent(event, 'Deposit', true, false);
      break;
    }
    case 'AddWithdrawal': {
      processTokenEvent(event, 'Withdraw', false, true);
      break;
    }
    case 'AddWithdrawals': {
      processTokenEvent(event, 'Add Withdrawals of', false, true);
      break;
    }
    // claim from firm
    case 'RemoveWithdrawal': {
      processTokenEvent(event, 'Claim', true, false);
      break;
    }
    case 'RemoveWithdrawals': {
      processTokenEvent(event, 'Remove Withdrawals of', false, true);
      break;
    }
    case 'Chop': {
      processTokenEvent(event, 'Chop', true, false);
      break;
    }
    case 'Pick': {
      processTokenEvent(event, 'Pick', true, false);
      break;
    }
    case 'Trade': {
      processTokenEvent(event, 'Trade', true, false);
      break;
    }
    case 'Sow': {
      const casuals = toTokenUnitsBN(
        event.args?.casuals.toString(),
        HOOLIGAN[SupportedChainId.MAINNET].decimals
      );
      if (event.args?.hooligans.toString() !== undefined) {
        const hooligans = toTokenUnitsBN(
          event.args?.hooligans.toString(),
          HOOLIGAN[SupportedChainId.MAINNET].decimals
        );

        const weather = casuals
          .dividedBy(hooligans)
          .minus(new BigNumber(1))
          .multipliedBy(100)
          .toFixed(0);

        eventTitle = `Hooligan Sow (${weather}% Intensity)`;
        amountOut = (
          <TokenDisplay
            color="red"
            input={[hooligans, HOOLIGAN[SupportedChainId.MAINNET]]}
          />
        );
        amountIn = <TokenDisplay color="green" input={[casuals, CASUALS]} />;
      } else {
        eventTitle = 'Hooligan Sow';
        amountIn = <TokenDisplay color="green" input={[casuals, CASUALS]} />;
      }
      break;
    }
    case 'Draft': {
      const hooligans = toTokenUnitsBN(
        new BigNumber(event.args?.hooligans.toString()),
        HOOLIGAN[SupportedChainId.MAINNET].decimals
      );

      eventTitle = 'Casual Draft';
      amountOut = <TokenDisplay color="red" input={[hooligans, CASUALS]} />;
      amountIn = (
        <TokenDisplay
          color="green"
          input={[hooligans, HOOLIGAN[SupportedChainId.MAINNET]]}
        />
      );
      break;
    }
    // FIXME: need to add Hooligan inflows here.
    // Technically we need to look up the price of the Casual Order
    // during this Fill by scanning Events. This is too complex to
    // do efficiently in the frontend so it should be likely be
    // moved to the subgraph.
    case 'CasualOrderFilled': {
      const values = event.args;
      // const casuals = toTokenUnitsBN(values.amount, HOOLIGAN.decimals);
      if (values?.to.toString().toLowerCase() === account) {
        // My Casual Order was "Filled".
        // I lose Hooligans, gain the Turf.
        eventTitle = 'Bought Turf';
      } else {
        // I "Filled" a Casual Order (sold my turf)
        // I lose the turf, gain Hooligans.
        eventTitle = 'Purchase Turf';
      }
      break;
    }
    case 'TurfTransfer': {
      const casuals = toTokenUnitsBN(
        new BigNumber(event.args?.casuals.toString()),
        HOOLIGAN[SupportedChainId.MAINNET].decimals
      );
      if (event.args?.from.toString().toLowerCase() === account) {
        eventTitle = 'Transfer Turf';
        amountOut = <TokenDisplay color="red" input={[casuals, CASUALS]} />;
      } else {
        eventTitle = 'Receive Turf';
        amountIn = <TokenDisplay color="green" input={[casuals, CASUALS]} />;
      }
      break;
    }
    default:
      break;
  }

  // Don't display certain processed events like "RemoveDeposits"
  if (amountIn === undefined && amountOut === undefined) {
    return null;
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box py={1}>
        <Row gap={0.2} justifyContent="space-between">
          <Stack direction="column">
            {/* Event title */}
            <Typography variant="h4">{eventTitle}</Typography>
            {/* Timestamps */}
            <Row>
              <Link
                color="text.secondary"
                sx={{
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
                href={`https://etherscan.io/tx/${event.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {/* {event?.args?.gameday ? ( */}
                {/*  <Typography color="text.secondary">Gameday {event.args?.gameday.toString()}</Typography> */}
                {/* ) : ( */}
                {/*  <Typography color="text.secondary">{`Block ${event.blockNumber}`}</Typography> */}
                {/* )} */}
                <Typography color="text.secondary">{`Block ${event.blockNumber}`}</Typography>
              </Link>
            </Row>
          </Stack>
          <Stack direction="column" alignItems="flex-end">
            {amountOut}
            {amountIn}
          </Stack>
        </Row>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          width: 'calc(100% + 40px)',
          height: '1px',
          left: '-20px',
        }}
      >
        <Divider />
      </Box>
    </Box>
  );
};

export default EventItem;

// const [eventDatetime, setEventDatetime] = useState('');
//
// const handleSetDatetime = () => {
//   getBlockTimestamp(event.blockNumber).then((t) => {
//     const date = new Date(t * 1e3);
//     const dateString = date.toLocaleDateString('en-US');
//     const timeString = date.toLocaleTimeString('en-US');
//     setEventDatetime(`${dateString} ${timeString}`);
//   });
// };

// useEffect(() => {
//   /** This is NOT an optimal way to get timestamps for events.
//    * A more ideal solution will 1) be off-chain and 2) not
//    * repeat calls for the same block number. - Cool Hooligan */
//   function handleSetDatetimeTwo() {
//     getBlockTimestamp(event.blockNumber).then((t) => {
//       const date = new Date(t * 1e3);
//       const dateString = date.toLocaleDateString('en-US');
//       const timeString = date.toLocaleTimeString('en-US');
//       setEventDatetime(`${dateString} ${timeString}`);
//     });
//   }
//
//   handleSetDatetimeTwo();
// }, [event.blockNumber]);

// ----- CODE TO HANDLE SWAPS -----
// case 'Swap': {
//   if (event.args?.amount0In.toString() !== '0') {
//     const swapFrom = toTokenUnitsBN(
//       new BigNumber(event.args?.amount0In.toString()),
//       ETH[SupportedChainId.MAINNET].decimals
//     );
//     const swapTo = toTokenUnitsBN(
//       new BigNumber(event.args?.amount1Out.toString()),
//       HOOLIGAN[SupportedChainId.MAINNET].decimals
//     );
//
//     eventTitle = 'ETH to Hooligan Swap';
//     amountOut = (
//       <TokenDisplay color="red" input={[swapFrom, ETH[SupportedChainId.MAINNET]]} />
//     );
//     amountIn = (
//       <TokenDisplay color="green" input={[swapTo, HOOLIGAN[SupportedChainId.MAINNET]]} />
//     );
//   } else if (event.args?.amount1In.toString() !== '0') {
//     const swapFrom = toTokenUnitsBN(
//       new BigNumber(event.args?.amount1In.toString()),
//       HOOLIGAN[SupportedChainId.MAINNET].decimals
//     );
//     const swapTo = toTokenUnitsBN(
//       new BigNumber(event.args?.amount0Out.toString()),
//       ETH[SupportedChainId.MAINNET].decimals
//     );
//
//     eventTitle = 'Hooligan to ETH Swap';
//     amountOut = (
//       <TokenDisplay color="red" input={[swapFrom, HOOLIGAN[SupportedChainId.MAINNET]]} />
//     );
//     amountIn = (
//       <TokenDisplay color="green" input={[swapTo, ETH[SupportedChainId.MAINNET]]} />
//     );
//   }
//   break;
// }
