import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress, Stack, Typography } from '@mui/material';
import useCasualListing from '~/hooks/hooliganhorde/useCasualListing';
import FillListingForm from '~/components/Market/CasualsV2/Actions/Buy/FillListingForm';
import { bigNumberResult, displayBN, displayFullBN } from '~/util';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import StatHorizontal from '~/components/Common/StatHorizontal';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';
import GuvnorChip from '~/components/Common/GuvnorChip';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';

const FillListing: React.FC<{}> = () => {
  const { listingID } = useParams<{ listingID: string }>();
  const { data: casualListing, loading, error } = useCasualListing(listingID);
  const hooliganhorde = useHooliganhordeContract();

  /// Verify that this listing is still live via the contract.
  const [listingValid, setListingValid] = useState<null | boolean>(null);
  useEffect(() => {
    if (listingID) {
      (async () => {
        try {
          const _listing = await hooliganhorde
            .casualListing(listingID.toString())
            .then(bigNumberResult);
          console.debug('[pages/listing] listing = ', _listing);
          setListingValid(_listing?.gt(0));
        } catch (e) {
          console.error(e);
          setListingValid(false);
        }
      })();
    }
  }, [hooliganhorde, listingID]);

  /// Loading isn't complete until listingValid is set
  if (loading || listingValid === null) {
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
  if (!casualListing || !listingValid) {
    return (
      <Stack height={200} alignItems="center" justifyContent="center">
        <Typography>Listing not found.</Typography>
      </Stack>
    );
  }

  return (
    <Stack gap={2}>
      {/* Listing Details */}
      <Stack px={0.5} gap={0.75}>
        {/* add margin right of -0.5 to offset padding from guvnor chip */}
        <StatHorizontal label="Seller" maxHeight={20} sx={{ mr: -0.5 }}>
          <GuvnorChip account={casualListing.account} />
        </StatHorizontal>
        <StatHorizontal label="Place in Line">
          {displayBN(casualListing.placeInLine)}
        </StatHorizontal>
        <StatHorizontal label="Casuals Available">
          <Row gap={0.25}>
            <TokenIcon token={CASUALS} /> {displayBN(casualListing.remainingAmount)}
          </Row>
        </StatHorizontal>
        <StatHorizontal label="Price per Casual">
          <Row gap={0.25}>
            <TokenIcon token={HOOLIGAN[1]} />{' '}
            {displayFullBN(casualListing.pricePerCasual, 4, 2)}
          </Row>
        </StatHorizontal>
        <StatHorizontal label="Hooligans to Fill">
          <Row gap={0.25}>
            <TokenIcon token={HOOLIGAN[1]} />{' '}
            {displayBN(
              casualListing.remainingAmount.times(casualListing.pricePerCasual)
            )}
          </Row>
        </StatHorizontal>
      </Stack>
      {/* Form */}
      <FillListingForm casualListing={casualListing} />
    </Stack>
  );
};

export default FillListing;
