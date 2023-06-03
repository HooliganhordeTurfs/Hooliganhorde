import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { GovSpace } from '~/lib/Hooliganhorde/Governance';
import useGuvnorFirm from '~/hooks/guvnor/useGuvnorFirm';
import { ZERO_BN } from '~/constants';
import { useAppSelector } from '~/state';
import useGuvnorHooligaNFTs from '~/hooks/guvnor/useGuvnorHooligaNFTs';

/**
 * Returns the voting power of the guvnor and their delegators.
 * The voting power returned here is not the voting power for a specific proposal.
 *
 * To obtain the voting power for a specific proposal, use `useProposalVotingPowerQuery`.
 */
export default function useGuvnorVotingPower(space: GovSpace) {
  const guvnorDelegators = useAppSelector(
    (state) => state._guvnor.delegations.delegators
  );
  const guvnorFirm = useGuvnorFirm();
  const guvnorHooligaNFTsResult = useGuvnorHooligaNFTs();

  const _delegators = guvnorDelegators.votingPower;

  const isHooligaNFT = space === GovSpace.HooliganNFT;

  const delegators = useMemo(() => {
    const delegation = _delegators[space] || {};
    return Object.entries(delegation).map(([_address, _amount]) => ({
      address: _address,
      amount: _amount,
    }));
  }, [_delegators, space]);

  const guvnorVotingPower = useMemo(() => {
    if (isHooligaNFT) {
      const nfts = Object.values(guvnorHooligaNFTsResult.data)[0];
      if (!nfts) return ZERO_BN;
      const barrackRaise = nfts.barrackRaise;
      const winter = nfts.winter;
      const genesis = nfts.genesis;

      return new BigNumber(
        barrackRaise.ids.length + winter.ids.length + genesis.ids.length
      );
    }
    return guvnorFirm.horde.active;
  }, [guvnorHooligaNFTsResult.data, guvnorFirm.horde.active, isHooligaNFT]);

  const delegatorsVotingPower = useMemo(
    () =>
      delegators.reduce<BigNumber>(
        (acc, curr) => acc.plus(curr.amount),
        ZERO_BN
      ),
    [delegators]
  );

  return {
    delegators,
    votingPower: {
      guvnor: guvnorVotingPower,
      delegated: delegatorsVotingPower,
      total: guvnorVotingPower.plus(delegatorsVotingPower),
    },
  };
}
