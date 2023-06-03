import React, { useState } from 'react';
import { Stack, Typography, Box } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link } from 'react-router-dom';
import { displayFullBN, normalizeBN } from '~/util';
import EmbeddedCard from '../Common/EmbeddedCard';
import Row from '../Common/Row';
import TokenIcon from '../Common/TokenIcon';
import { HooliganhordePalette } from '../App/muiTheme';
import { useAppSelector } from '~/state';
import useSdk from '~/hooks/sdk';

const ThinDivider: React.FC<{}> = () => (
  <Box
    sx={{
      width: '100%',
      borderTop: '0.5px solid',
      borderColor: HooliganhordePalette.lightestGrey,
      height: '0.5px',
    }}
  />
);

const FieldInfo: React.FC<{}> = () => {
  const sdk = useSdk();
  const draftableIndex = useAppSelector(
    (s) => s._hooliganhorde.field.draftableIndex
  );
  const CASUALS = sdk.tokens.CASUALS;

  const [open, setOpen] = useState(false);

  const handleOnClick = () => {
    setOpen((prev) => !prev);
  };

  return (
    <Stack gap={2}>
      <EmbeddedCard>
        <Row p={2} width="100%" justifyContent="space-between">
          <Stack gap={0.25}>
            <Row gap={0.5}>
              <Typography>Drafted Casuals:</Typography>
              <TokenIcon token={CASUALS} />
              <Typography component="span" variant="h4">
                {displayFullBN(normalizeBN(draftableIndex), 0)}
              </Typography>
            </Row>
            <Typography color="text.secondary">
              Debt repaid by Hooliganhorde to Casual holders since deployment (does not
              count towards the current Casual Line).
            </Typography>
          </Stack>
          <Link to="/analytics?field=drafted">
            <ChevronRightIcon fontSize="small" />
          </Link>
        </Row>
      </EmbeddedCard>
      <EmbeddedCard>
        <Stack p={2} gap={2}>
          <Typography variant="h4">🌾 Overview</Typography>
          <ThinDivider />
          <Typography>
            The Field is Hooliganhorde&#39;s credit facility. Hooliganhorde relies on a
            decentralized set of creditors to maintain Hooligan price stability.
            Guvnors who Sow Hooligans (lend Hooligans to Hooliganhorde) are known as Sowers.
            Hooligans are Sown in exchange for Casuals, the Hooliganhorde-native debt
            asset. Loans to Hooliganhorde are issued with a fixed interest rate,
            known as Intensity, and an unknown maturity date.
          </Typography>
          {open ? (
            <>
              <Typography>
                The number of Casuals received from 1 Sown Hooligan is determined by
                the Intensity at the time of Sowing. Newly issued Casuals
                accumulate in the back of the Casual Line. The front of the Casual
                Line receives 1/3 of new Hooligan mints when there are outstanding
                Bootboys (Bootboys are issued by the Barrack). If there are no
                outstanding Bootboys, the front of the Casual Line receives 1/2 of
                new Hooligan mints.
              </Typography>
              <Typography>
                Casuals become Draftable (redeemable) into Hooligans on a FIFO basis.
                Casuals are tradeable on the Market.
              </Typography>
            </>
          ) : null}
          <ThinDivider />
          <Typography
            onClick={handleOnClick}
            sx={{
              alignSelf: 'center',
              cursor: 'pointer',
              ':hover': {
                color: 'primary.main',
              },
            }}
          >
            {open ? 'View less' : 'View more'}
          </Typography>
        </Stack>
      </EmbeddedCard>
    </Stack>
  );
};

export default FieldInfo;
