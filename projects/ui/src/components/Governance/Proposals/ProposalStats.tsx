import React from 'react';
import { Link, Stack, Tooltip, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { getDateMessage, Proposal } from '~/util/Governance';
import { displayFullBN } from '~/util';
import Dot from '~/components/Common/Dot';
import { ZERO_BN } from '~/constants';
import Row from '~/components/Common/Row';
import StatHorizontal from '~/components/Common/StatHorizontal';

import { FC } from '~/types';
import useProposalBlockData from '~/hooks/hooliganhorde/useProposalBlockData';

const ProposalStats: FC<{
  proposal: Proposal;
  quorum?: ReturnType<typeof useProposalBlockData>;
  totalHorde?: BigNumber;
  differenceInTime?: number;
  showLink?: boolean;
}> = ({ proposal, totalHorde, quorum, differenceInTime, showLink = false }) => (
  <Stack
    alignItems={{ xs: 'start', md: 'center' }}
    justifyContent="space-between"
    width="100%"
    direction={{ xs: 'column', md: 'row' }}
    gap={{ xs: 0.5, md: 0 }}
  >
    <Row gap={2}>
      <Row gap={0.5}>
        <Dot color={proposal.state === 'active' ? 'primary.main' : 'gray'} />
        <Typography variant="body1">
          {proposal.state === 'active' ? (
            'Active'
          ) : proposal.state === 'closed' ? (
            quorum?.data.hordeForQuorum && quorum?.data.score ? (
              quorum?.data.score.gt(quorum.data.hordeForQuorum) ? (
                'Closed'
              ) : (
                'Closed'
              )
            ) : (
              // ? 'Passed'
              // : 'Rejected'
              'Closed'
            )
          ) : (
            <Typography sx={{ textTransform: 'capitalize' }}>
              {proposal.state}
            </Typography>
          )}
        </Typography>
      </Row>
      <Tooltip title={new Date(proposal.end * 1000).toLocaleString()}>
        <Typography variant="body1">{getDateMessage(proposal.end)}</Typography>
      </Tooltip>
      {showLink && (
        <Link
          href={`https://snapshot.org/#/${proposal.space.id}/proposal/${proposal.id}`}
          target="_blank"
          rel="noreferrer"
          underline="hover"
        >
          View on Snapshot
        </Link>
      )}
    </Row>
    {/* if there is time remaining... */}
    {differenceInTime && differenceInTime > 0 && totalHorde && (
      <Row gap={0.5}>
        <Tooltip
          title={
            <Stack gap={0.5}>
              <StatHorizontal label="Horde voted For">
                {displayFullBN(
                  new BigNumber(proposal.scores[0]) || ZERO_BN,
                  2,
                  2
                )}
              </StatHorizontal>
              {quorum?.data.hordeForQuorum && (
                <StatHorizontal label="Horde for Quorum">
                  ~{displayFullBN(quorum?.data.hordeForQuorum, 2, 2)}
                </StatHorizontal>
              )}
              <StatHorizontal label="Eligible Horde">
                ~{displayFullBN(totalHorde, 2, 2)}
              </StatHorizontal>
              <StatHorizontal label="Snapshot Block">
                {proposal.snapshot}
              </StatHorizontal>
            </Stack>
          }
        >
          <Typography textAlign={{ xs: 'center', md: 'left' }} variant="body1">
            {((quorum?.data.pctOfQuorum || 0) * 100).toFixed(0)}% of Horde voted
            For
          </Typography>
        </Tooltip>
      </Row>
    )}
  </Stack>
);

export default ProposalStats;
