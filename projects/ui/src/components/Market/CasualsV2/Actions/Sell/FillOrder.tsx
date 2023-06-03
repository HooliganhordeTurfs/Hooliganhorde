import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { bigNumberResult, displayBN, displayFullBN } from '~/util';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useCasualOrder from '~/hooks/hooliganhorde/useCasualOrder';
import FillOrderForm from '~/components/Market/CasualsV2/Actions/Sell/FillOrderForm';
import StatHorizontal from '~/components/Common/StatHorizontal';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';
import GuvnorChip from '~/components/Common/GuvnorChip';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';

const FillOrder: React.FC<{}> = () => {
  const { orderID } = useParams<{ orderID?: string }>();
  const { data: casualOrder, source, loading, error } = useCasualOrder(orderID);
  const hooliganhorde = useHooliganhordeContract();

  /// Verify that this order is still live via the contract.
  const [orderValid, setOrderValid] = useState<null | boolean>(null);
  useEffect(() => {
    if (orderID) {
      (async () => {
        try {
          const _order = await hooliganhorde
            .casualOrderById(orderID.toString())
            .then(bigNumberResult);
          console.debug('[pages/order] order = ', _order);
          setOrderValid(_order?.gt(0));
        } catch (e) {
          console.error(e);
          setOrderValid(false);
        }
      })();
    }
  }, [hooliganhorde, orderID]);

  /// Loading isn't complete until orderValid is set
  if (loading || orderValid === null) {
    return (
      <Stack height={200} alignItems="center" justifyContent="center">
        <CircularProgress color="primary" />
      </Stack>
    );
  }
  if (error) {
    return (
      <Stack height={200} alignItems="center" justifyContent="center">
        <Typography>{error.message.toString()}</Typography>
      </Stack>
    );
  }
  if (!casualOrder || !orderValid) {
    return (
      <Stack height={200} alignItems="center" justifyContent="center">
        <Typography>Order not found.</Typography>
      </Stack>
    );
  }

  return (
    <Stack gap={2}>
      {/* Listing Details */}
      <Box px={0.5}>
        <Stack gap={0.75}>
          {/* add mr of -0.5 to offset padding of guvnor chip */}
          <StatHorizontal label="Buyer" maxHeight={20} sx={{ mr: -0.5 }}>
            <GuvnorChip account={casualOrder.account} />
          </StatHorizontal>
          <StatHorizontal label="Place in Line">
            0 - {displayBN(casualOrder.maxPlaceInLine)}
          </StatHorizontal>
          <StatHorizontal label="Casuals Requested">
            <Row gap={0.25}>
              <TokenIcon token={CASUALS} />{' '}
              {displayBN(casualOrder.casualAmountRemaining)}
            </Row>
          </StatHorizontal>
          <StatHorizontal label="Price per Casual">
            <Row gap={0.25}>
              <TokenIcon token={HOOLIGAN[1]} />{' '}
              {displayFullBN(casualOrder.pricePerCasual)}
            </Row>
          </StatHorizontal>
          <StatHorizontal label="Hooligans Remaining">
            <Row gap={0.25}>
              <TokenIcon token={HOOLIGAN[1]} />{' '}
              {displayBN(
                casualOrder.casualAmountRemaining.times(casualOrder.pricePerCasual)
              )}
            </Row>
          </StatHorizontal>
        </Stack>
      </Box>
      <FillOrderForm casualOrder={casualOrder} />
    </Stack>
  );
};

export default FillOrder;
