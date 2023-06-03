import { Button, Stack, Typography } from '@mui/material';
import React from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link as RouterLink } from 'react-router-dom';
import { GovSpace } from '~/lib/Hooliganhorde/Governance';

import { HooliganhordePalette, IconSize } from '../../App/muiTheme';
import { HORDE } from '~/constants/tokens';
import { GOV_SLUGS, displayFullBN, getGovSpaceWithTab } from '~/util';
import Row from '../../Common/Row';
import TokenIcon from '../../Common/TokenIcon';
import useAccount from '~/hooks/ledger/useAccount';
import hooliganNFTIconDark from '~/img/tokens/hooliganft-dark-logo.svg';
import useGuvnorVotingPower from '~/hooks/guvnor/useGuvnorVotingPower';

const VotingPowerBanner: React.FC<{
  tab: number;
  votingPower: ReturnType<typeof useGuvnorVotingPower>['votingPower'];
}> = ({ tab, votingPower }) => {
  const account = useAccount();
  const space = getGovSpaceWithTab(tab);

  const isNFT = space === GovSpace.HooliganNFT;

  if (!account) return null;

  return (
    <Button
      variant="outlined"
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
      to={`/governance/vp/${GOV_SLUGS[tab]}`}
      component={RouterLink}
    >
      <Row justifyContent="space-between" width="100%" p={2}>
        <Stack gap={1}>
          <Typography variant="h4" textAlign="left">
            {space.toString()}
          </Typography>
          <Typography color="text.secondary">
            Your total number of votes includes your own&nbsp;
            {isNFT ? 'HooligaNFTs' : 'Horde'} and {isNFT ? 'HooligaNFTs' : 'Horde'}
            &nbsp;delegated to you by others.
          </Typography>
          {space === GovSpace.HooliganNFT ? (
            <Row gap={0.3}>
              <img
                src={hooliganNFTIconDark}
                alt="hooliganft"
                css={{
                  height: IconSize.small,
                  width: IconSize.small,
                  marginBottom: '2px',
                }}
              />
              <Typography variant="bodyLarge">
                {votingPower.total.gt(0)
                  ? displayFullBN(votingPower.total, 0)
                  : '0'}
                &nbsp;HOOLIGANFT
              </Typography>
            </Row>
          ) : (
            <Row gap={0.3}>
              <TokenIcon token={HORDE} css={{ height: IconSize.small }} />
              <Typography variant="bodyLarge">
                {votingPower.total.gt(0)
                  ? displayFullBN(votingPower.total, 0)
                  : '0'}
                &nbsp;HORDE
              </Typography>
            </Row>
          )}
        </Stack>
        <ChevronRightIcon
          sx={{ color: 'inherit', height: '24px', width: '24px' }}
        />
      </Row>
    </Button>
  );
};

export default VotingPowerBanner;
