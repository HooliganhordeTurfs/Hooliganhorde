import { Link, Button, Typography } from '@mui/material';
import React from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DatasetLinkedOutlinedIcon from '@mui/icons-material/DatasetLinkedOutlined';
import { Link as RouterLink } from 'react-router-dom';

import { HooliganhordePalette } from '~/components/App/muiTheme';
import Row from '~/components/Common/Row';
import { GovSpace } from '~/lib/Hooliganhorde/Governance';
import {
  GOV_SLUGS,
  displayFullBN,
  getGovSpaceLabel,
  getGovSpaceWithTab,
  trimAddress,
} from '~/util';
import { GuvnorDelegation } from '~/state/guvnor/delegations';
import useAccount from '~/hooks/ledger/useAccount';
import useGuvnorVotingPower from '~/hooks/guvnor/useGuvnorVotingPower';
import useSdk from '~/hooks/sdk';

export type DelegationBannerProps = {
  tab: number;
  guvnorDelegations: GuvnorDelegation;
  votingPower: ReturnType<typeof useGuvnorVotingPower>['votingPower'];
};

const DelegationBanner: React.FC<DelegationBannerProps> = ({
  tab,
  guvnorDelegations,
  votingPower,
}) => {
  const sdk = useSdk();
  const space = getGovSpaceWithTab(tab);
  const account = useAccount();

  const horde = sdk.tokens.HORDE;

  const delegate = guvnorDelegations.delegates[space];

  const isNFT = space === GovSpace.HooliganNFT;

  if (!account) return null;

  return (
    <Button
      variant="outlined"
      component={RouterLink}
      to={`/governance/delegate/${GOV_SLUGS[tab]}`}
      sx={{
        p: 0,
        height: '100%',
        borderColor: HooliganhordePalette.blue,
        color: 'text.primary',
        background: HooliganhordePalette.lightestBlue,
        ':hover': {
          background: HooliganhordePalette.lightestGreen,
          borderColor: 'primary.main',
        },
      }}
    >
      <Row justifyContent="space-between" width="100%" p={2}>
        <Row gap={1}>
          <DatasetLinkedOutlinedIcon
            sx={{ color: 'inherit', fontSize: 'inherit' }}
          />
          {delegate ? (
            <Typography>
              Your {displayFullBN(votingPower.guvnor, 0)}&nbsp;
              {isNFT ? 'HOOLIGANFT' : horde.name} is delegated to&nbsp;
              <Link
                component="a"
                href={`https://snapshot.org/#/profile/${delegate.address}`}
                target="_blank"
                rel="noreferrer"
                color="inherit"
                variant="h4"
              >
                {trimAddress(delegate.address)}
              </Link>
              &nbsp;for {getGovSpaceLabel(space)} proposals
            </Typography>
          ) : (
            <Typography>
              Delegate your {isNFT ? 'HooligaNFT' : 'Horde'} votes to another Guvnor
              on&nbsp;
              <Typography component="span" variant="h4">
                {space.toString()}
              </Typography>
            </Typography>
          )}
        </Row>
        <ChevronRightIcon
          sx={{ color: 'inherit', height: '24px', width: '24px' }}
        />
      </Row>
    </Button>
  );
};
export default DelegationBanner;
