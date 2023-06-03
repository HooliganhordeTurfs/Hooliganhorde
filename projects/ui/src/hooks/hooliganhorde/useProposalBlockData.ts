import BigNumber from 'bignumber.js';
import { useEffect, useState } from 'react';
import { ZERO_BN } from '~/constants';
import { HORDE } from '~/constants/tokens';
import { useProposalVotingPowerQuery } from '~/generated/graphql';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import { getQuorumPct } from '~/lib/Hooliganhorde/Governance';
import { getProposalTag, getProposalType, Proposal, tokenResult } from '~/util';

export type ProposalBlockData = {
  /** The proposal tag (BIP-0) */
  tag: string;
  /** The proposal type (BIP) */
  type: string;
  /** The percentage of outstanding Horde that needs to vote to reach Quorum for this `type`. */
  pctHordeForQuorum: number | undefined;
  /** */
  score: BigNumber;
  /** The total outstanding Horde at the proposal block. */
  totalHorde: BigNumber | undefined;
  /** The total number of Horde needed to reach quorum. */
  hordeForQuorum: BigNumber | undefined;
  /** The percentage of Horde voting `for` divided by the Horde needed for Quorum. */
  pctOfQuorum: number | undefined;
  /** The voting power (in Horde) of `account` at the proposal block. */
  votingPower: BigNumber | undefined;
};

export default function useProposalBlockData(
  proposal: Proposal,
  account?: string
): {
  loading: boolean;
  data: ProposalBlockData;
} {
  /// Proposal info
  const tag = getProposalTag(proposal.title);
  const type = getProposalType(tag);
  const pctHordeForQuorum = getQuorumPct(type); // undefined if there is no set quorum

  /// Hooliganhorde
  const hooliganhorde = useHooliganhordeContract();
  const [totalHorde, setTotalHorde] = useState<undefined | BigNumber>(
    undefined
  );
  const [votingPower, setVotingPower] = useState<undefined | BigNumber>(
    undefined
  );
  const [loading, setLoading] = useState(true);

  const score =
    proposal.space.id === 'wearehooliganbootboy.eth'
      ? new BigNumber(proposal.scores_total || ZERO_BN)
      : new BigNumber(proposal.scores[0] || ZERO_BN);

  const { data: vpData } = useProposalVotingPowerQuery({
    variables: {
      voter_address: account?.toLowerCase() || '',
      proposal_id: proposal?.id.toLowerCase() || '',
      space: proposal?.space?.id?.toLowerCase() || '',
    },
    skip: !account || !proposal?.id || !proposal?.space?.id,
    context: { subgraph: 'snapshot' },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'network-only',
  });

  // TODO: This will only work when the space is not HooligaNFTDao.eth.
  useEffect(() => {
    (async () => {
      try {
        if (!proposal.snapshot) return;
        const blockTag = parseInt(proposal.snapshot, 10);
        const hordeResult = tokenResult(HORDE);
        const _totalHorde = await hooliganhorde
          .totalHorde({ blockTag })
          .then(hordeResult);
        setTotalHorde(_totalHorde);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [hooliganhorde, tag, proposal.snapshot, account]);

  useEffect(() => {
    const vp = vpData?.vp?.vp || 0;
    setVotingPower(new BigNumber(vp));
  }, [vpData?.vp?.vp]);

  //
  const hordeForQuorum =
    pctHordeForQuorum && totalHorde
      ? totalHorde.times(pctHordeForQuorum)
      : undefined;
  const pctOfQuorum =
    score && hordeForQuorum ? score.div(hordeForQuorum).toNumber() : undefined;

  return {
    loading,
    data: {
      // Metadata
      tag,
      type,
      pctHordeForQuorum,
      // Proposal
      score,
      totalHorde,
      hordeForQuorum,
      pctOfQuorum,
      // Account
      votingPower,
    },
  };
}
