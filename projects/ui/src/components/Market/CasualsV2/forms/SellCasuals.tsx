import { Stack, Typography } from '@mui/material';
import { useAtomValue } from 'jotai';
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { CasualOrderType, casualsOrderTypeAtom } from '../info/atom-context';
import CreateListingV2 from '~/components/Market/CasualsV2/Actions/Sell/CreateListing';
import Soon from '~/components/Common/ZeroState/Soon';
import StatHorizontal from '~/components/Common/StatHorizontal';
import { displayBN, displayFullBN } from '~/util';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import useCasualOrder from '~/hooks/hooliganhorde/useCasualOrder';

const SellCasuals: React.FC<{}> = () => {
  const orderType = useAtomValue(casualsOrderTypeAtom);
  const { orderID } = useParams<{ orderID: string }>();
  const { data: order } = useCasualOrder(orderID);

  return (
    <Stack>
      <Stack p={1} gap={1}>
        {/* buy or sell toggle */}
        {/* <SubActionSelect /> */}
        {order && orderType === CasualOrderType.FILL && (
          <>
            <StatHorizontal
              label="Place in Line"
              labelTooltip="Any Casual in this range is eligible to sell to this Order."
            >
              0 - {displayBN(order.maxPlaceInLine)}
            </StatHorizontal>
            <StatHorizontal label="Price per Casual">
              <Row gap={0.25}>
                <TokenIcon token={HOOLIGAN[1]} />{' '}
                {displayFullBN(order.pricePerCasual, 4, 2)}
              </Row>
            </StatHorizontal>
            <StatHorizontal label="Amount">
              <Row gap={0.25}>
                <TokenIcon token={CASUALS} />{' '}
                {displayFullBN(order.casualAmountRemaining, 2, 0)}
              </Row>
            </StatHorizontal>
          </>
        )}
        {/* create buy order */}
        {/* {orderType === CasualOrderType.ORDER && <CreateBuyOrder />} */}
        {orderType === CasualOrderType.LIST && <CreateListingV2 />}
        {/* fill sell order */}
        {/* {orderType === CasualOrderType.FILL && <FillBuyListing />} */}
        {orderType === CasualOrderType.FILL && (
          <>
            {orderID ? (
              <Outlet />
            ) : (
              <Soon>
                <Typography textAlign="center" color="gray">
                  Select a casual order on the chart to sell to.
                </Typography>
              </Soon>
            )}
          </>
        )}
      </Stack>
      {/* <Divider /> */}
      {/* submit buy order */}
      {/* <Stack p={0.8}> */}
      {/*  <SubmitMarketAction /> */}
      {/* </Stack> */}
    </Stack>
  );
};

export default SellCasuals;
