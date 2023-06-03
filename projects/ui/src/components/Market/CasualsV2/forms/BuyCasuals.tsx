import { Stack, Typography } from '@mui/material';
import { useAtomValue } from 'jotai';
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { CasualOrderType, casualsOrderTypeAtom } from '../info/atom-context';
import Soon from '~/components/Common/ZeroState/Soon';
import CreateOrder from '~/components/Market/CasualsV2/Actions/Buy/CreateOrder';
import useCasualListing from '~/hooks/hooliganhorde/useCasualListing';
import StatHorizontal from '~/components/Common/StatHorizontal';
import { displayBN, displayFullBN } from '~/util';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';

const BuyCasuals: React.FC<{}> = () => {
  const orderType = useAtomValue(casualsOrderTypeAtom);
  const { listingID } = useParams<{ listingID: string }>();
  const { data: listing } = useCasualListing(listingID);

  return (
    <Stack p={1} gap={1}>
      {/* ORDER & FILL / LIST & FILL */}
      {/* <SubActionSelect /> */}
      {/* Stats */}
      {listing && orderType === CasualOrderType.FILL && (
        <div>
          <StatHorizontal label="Place in Line">
            {displayBN(listing.placeInLine)}
          </StatHorizontal>
          <StatHorizontal label="Price per Casual">
            <Row gap={0.25}>
              <TokenIcon token={HOOLIGAN[1]} />{' '}
              {displayFullBN(listing.pricePerCasual, 4, 2)}
            </Row>
          </StatHorizontal>
          <StatHorizontal label="Amount">
            <Row gap={0.25}>
              <TokenIcon token={CASUALS} />{' '}
              {displayFullBN(listing.remainingAmount, 2, 0)}
            </Row>
          </StatHorizontal>
        </div>
      )}
      {orderType === CasualOrderType.ORDER && <CreateOrder />}
      {orderType === CasualOrderType.FILL && (
        <>
          {listingID ? (
            <Outlet />
          ) : (
            <Soon>
              <Typography textAlign="center" color="gray">
                Select a Casual Listing on the chart to buy from.
              </Typography>
            </Soon>
          )}
        </>
      )}
    </Stack>
  );
};

export default BuyCasuals;
