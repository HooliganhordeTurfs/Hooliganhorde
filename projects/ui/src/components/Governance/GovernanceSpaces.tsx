import React, { useCallback } from 'react';
import { Box, Link } from '@mui/material';
import { useProposalsQuery } from '~/generated/graphql';
import useTabs from '~/hooks/display/useTabs';
import { GovSpace, SNAPSHOT_SPACES } from '~/lib/Hooliganhorde/Governance';
import {
  GOV_SLUGS,
  GOV_SLUGS_TAB_MAP,
  Proposal,
  getGovSpaceLabel,
  getGovSpaceWithTab,
} from '~/util/Governance';
import { Module, ModuleTabs, ModuleContent } from '../Common/Module';
import { StyledTab, ChipLabel } from '~/components/Common/Tabs';
import ProposalList from './Proposals/ProposalList';
import { useAppSelector } from '~/state';
import useGuvnorVotingPower from '~/hooks/guvnor/useGuvnorVotingPower';

const GovernanceSpaces: React.FC<{}> = () => {
  const [tab, handleChange] = useTabs(GOV_SLUGS, 'type');
  const guvnorDelegations = useAppSelector((s) => s._guvnor.delegations);
  const votingPower = useGuvnorVotingPower(getGovSpaceWithTab(tab));

  // Query Proposals
  const { loading, data } = useProposalsQuery({
    variables: { space_in: SNAPSHOT_SPACES },
    fetchPolicy: 'cache-and-network',
    context: { subgraph: 'snapshot' },
  });

  /// Helpers
  const filterBySpace = useCallback(
    (t: number) => {
      if (!loading && data?.proposals) {
        return data.proposals.filter(
          (p) => p !== null && p?.space?.id === SNAPSHOT_SPACES[t]
        ) as Proposal[];
      }
      return [];
    },
    [data, loading]
  );

  const hasActive = (proposals: Proposal[]) => {
    // true if any proposals are active
    if (proposals) {
      return proposals.filter((p) => p?.state === 'active').length > 0;
    }
    return false;
  };

  const numActive = (proposals: Proposal[]) => {
    // number of active proposals
    if (proposals) {
      return proposals.filter((p) => p?.state === 'active').length;
    }
    return 0;
  };

  // Filter proposals & check if there are any active ones
  const filterProposals = useCallback(
    (t: number) => {
      // All proposals for a given space
      const allProposals = filterBySpace(t);
      // Number of active proposals in this space
      const activeProposals: number = numActive(allProposals);
      // True if there are any active proposals
      const hasActiveProposals = hasActive(allProposals);

      return { allProposals, activeProposals, hasActiveProposals } as const;
    },
    [filterBySpace]
  );

  const getSnapshotLink = () => {
    const space =
      GOV_SLUGS_TAB_MAP[tab as keyof typeof GOV_SLUGS_TAB_MAP].toString();
    return `https://snapshot.org/#/${space}`;
  };

  const daoProposals = filterProposals(0);
  const hooliganhordeFarmsProposals = filterProposals(1);
  const hooliganBootboyProposals = filterProposals(2);
  const beaNFTDaoProposals = filterProposals(3);

  return (
    <Module>
      <ModuleTabs value={tab} onChange={handleChange} sx={{ minHeight: 0 }}>
        <StyledTab
          label={
            <ChipLabel name={getGovSpaceLabel(GovSpace.HooliganhordeDAO)}>
              {daoProposals.activeProposals || null}
            </ChipLabel>
          }
        />
        <StyledTab
          label={
            <ChipLabel name={getGovSpaceLabel(GovSpace.HooliganhordeFarms)}>
              {hooliganhordeFarmsProposals.activeProposals || null}
            </ChipLabel>
          }
        />
        <StyledTab
          label={
            <ChipLabel name={getGovSpaceLabel(GovSpace.HooliganBootboy)}>
              {hooliganBootboyProposals.activeProposals || null}
            </ChipLabel>
          }
        />
        <StyledTab
          label={
            <ChipLabel name={getGovSpaceLabel(GovSpace.HooliganNFT)}>
              {beaNFTDaoProposals.activeProposals || null}
            </ChipLabel>
          }
        />
      </ModuleTabs>
      <Box
        sx={({ breakpoints: bp }) => ({
          position: 'absolute',
          top: '15px',
          right: '20px',
          [bp.down('md')]: {
            display: 'none',
          },
        })}
      >
        <Link
          component="a"
          variant="subtitle1"
          href={getSnapshotLink()}
          target="_blank"
          rel="noreferrer"
        >
          View on Snapshot
        </Link>
      </Box>
      <ModuleContent>
        {tab === 0 && (
          <ProposalList
            tab={0}
            votingPower={votingPower.votingPower}
            guvnorDelegations={guvnorDelegations}
            proposals={daoProposals.allProposals}
          />
        )}
        {tab === 1 && (
          <ProposalList
            tab={1}
            votingPower={votingPower.votingPower}
            guvnorDelegations={guvnorDelegations}
            proposals={hooliganhordeFarmsProposals.allProposals}
          />
        )}
        {tab === 2 && (
          <ProposalList
            tab={2}
            votingPower={votingPower.votingPower}
            guvnorDelegations={guvnorDelegations}
            proposals={hooliganBootboyProposals.allProposals}
          />
        )}
        {tab === 3 && (
          <ProposalList
            tab={3}
            votingPower={votingPower.votingPower}
            guvnorDelegations={guvnorDelegations}
            proposals={beaNFTDaoProposals.allProposals}
          />
        )}
      </ModuleContent>
    </Module>
  );
};

export default GovernanceSpaces;
