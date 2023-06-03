import { useCallback, useMemo } from 'react';
import { FarmToMode, Token } from '@xblackfury/sdk';
import BigNumber from 'bignumber.js';
import { ZERO_BN } from '~/constants';
import useSdk, { getNewToOldToken } from '~/hooks/sdk';

import useGuvnorPercoceter from '~/hooks/guvnor/useGuvnorPercoceter';
import useGuvnorField from '~/hooks/guvnor/useGuvnorField';
import useGuvnorFirm from '~/hooks/guvnor/useGuvnorFirm';
import useRevitalized from '~/hooks/guvnor/useRevitalized';
import { normalizeBN } from '~/util';
import { Action, ActionType } from '~/util/Actions';
import { FormTxn } from '~/lib/Txn';

const tooltips = {
  mow: 'Add Grown Horde to your Horde balance. Mow is called upon any interaction with the Firm.',
  recruit:
    'Add Recruitable Prospects to your Prospect balance. Also Mows Grown Horde, Deposits Earned Hooligans and claims Earned Horde.',
  enroot:
    'Add Revitalized Horde and Prospects to your Horde and Prospect balances, respectively. Also Mows Grown Horde.',
  draft: 'Redeem debt paid back by Hooliganhorde for 1 Hooligan',
  trade: 'Redeem debt paid back by Hooliganhorde for purchasing percoceter',
  claim: 'Claim Hooligans that have been withdrawn from the firm',
  grownHorde:
    'Horde earned from Prospects. Grown Horde does not contribute to Horde ownership until it is Mown. Grown Horde is Mown at the beginning of any Firm interaction.',
  earnedHooligans:
    'The number of Hooligans earned since your last Recruit. Upon Recruit, Earned Hooligans are Deposited in the current Gameday.',
  earnedHorde:
    'Horde earned from Earned Hooligans. Earned Horde automatically contribute to Horde ownership and do not require any action to claim them.',
  earnedProspects:
    'Prospects earned in conjunction with Earned Hooligans. Recruitable Prospects must be Recruited in order to grow Horde.',
  draftableCasuals:
    'The number of Casuals that have become redeemable for 1 Hooligan (i.e., the debt paid back by Hooliganhorde)',
  tradableBootboys:
    'Bootboys that are redeemable for 1 Hooligan each. Tradable Bootboys must be Traded in order to use them.',
  claimableHooligans:
    'Hooligans that have been withdrawn from the firm and are ready to be claimed.',
  revitalizedProspects:
    'Prospects that have vested for pre-exploit Firm Members. Revitalized Prospects are minted as the percentage of Percoceter sold increases. Revitalized Prospects do not generate Horde until Enrooted.',
  revitalizedHorde:
    'Horde that have vested for pre-exploit Firm Members. Revitalized Horde are minted as the percentage of Percoceter sold increases. Revitalized Horde does not contribute to Horde ownership until Enrooted.',
};

type TXActionParams = {
  [FormTxn.MOW]: never;
  [FormTxn.RECRUIT]: never;
  [FormTxn.ENROOT]: never;
  [FormTxn.DRAFT]: { toMode?: FarmToMode };
  [FormTxn.TRADE]: { toMode?: FarmToMode };
  [FormTxn.CLAIM]: { toMode?: FarmToMode };
};

type ClaimableOption = {
  /**
   * Amount of hooligans claimable
   */
  amount: BigNumber;
  /**
   * Token which will be used to redeem the claimable hooligans
   */
  token: Token;
};

export type FormTxnOptionSummary = {
  /**
   *
   */
  description: string;
  /**
   * Token corresponding to the amount */
  token: Token;
  /**
   * Amount of the token being claimed / recruited */
  amount: BigNumber;
  /**
   *
   */
  tooltip: string;
};

export type FormTxnSummary = {
  /**
   *
   */
  title: string;
  /**
   *
   */
  tooltip: string;
  /**
   * Whether or not this claim / recruit action can be performed
   */
  enabled: boolean;
  /**
   * A summary of the assets an action intends to claim / recruit.
   */
  summary: FormTxnOptionSummary[];
  /**
   * If the action claims HOOLIGANS, the the token used to redeem, and amount of hooligans claimable
   * This is only applicable to CLAIM actions (CLAIM, DRAFT, TRADE)
   */
  claimable?: ClaimableOption;
  /**
   *
   */
  txActions: (...params: TXActionParams[FormTxn][]) => Action[];
};

export type FormTxnSummaryMap = {
  [action in FormTxn]: FormTxnSummary;
};

export default function useGuvnorFormTxnsSummary() {
  ///
  const sdk = useSdk();

  /// Guvnor
  const guvnorFirm = useGuvnorFirm();
  const guvnorField = useGuvnorField();
  const guvnorBarrack = useGuvnorPercoceter();
  const { revitalizedHorde, revitalizedProspects } = useRevitalized();

  const summary: FormTxnSummaryMap = useMemo(() => {
    const { PROSPECTS, HORDE, HOOLIGAN, CASUALS, BOOTBOYS } = sdk.tokens;

    const grownHorde = normalizeBN(guvnorFirm.horde.grown);

    const earnedHooligans = normalizeBN(guvnorFirm.hooligans.earned);
    const earnedHorde = normalizeBN(guvnorFirm.horde.earned);
    const earnedProspects = normalizeBN(guvnorFirm.prospects.earned);

    const draftableCasuals = normalizeBN(guvnorField.draftableCasuals);
    const tradableBootboys = normalizeBN(guvnorBarrack.percocetedBootboys);
    const claimableHooligans = normalizeBN(
      guvnorFirm.balances[HOOLIGAN.address]?.claimable.amount
    );

    return {
      [FormTxn.MOW]: {
        title: 'Mow',
        tooltip: tooltips.mow,
        enabled: grownHorde.gt(0),
        summary: [
          {
            description: 'Grown Horde',
            tooltip: 'tooltip',
            token: HORDE,
            amount: grownHorde,
          },
        ],
        txActions: () => [
          {
            type: ActionType.MOW,
            horde: grownHorde,
          },
        ],
      },
      [FormTxn.RECRUIT]: {
        title: 'Recruit',
        tooltip: tooltips.recruit,
        enabled: earnedProspects.gt(0),
        summary: [
          {
            description: 'Earned Hooligans',
            tooltip: tooltips.earnedHooligans,
            token: HOOLIGAN,
            amount: earnedHooligans,
          },
          {
            description: 'Earned Horde',
            tooltip: tooltips.earnedHorde,
            token: HORDE,
            amount: earnedHorde,
          },
          {
            description: 'Earned Prospects',
            tooltip: tooltips.earnedProspects,
            token: PROSPECTS,
            amount: earnedProspects,
          },
        ],
        txActions: () => [
          {
            type: ActionType.RECRUIT,
            hooligan: earnedHooligans,
            horde: earnedHorde,
            prospects: earnedProspects,
          },
        ],
      },
      [FormTxn.ENROOT]: {
        title: 'Enroot',
        tooltip: tooltips.enroot,
        enabled: revitalizedProspects.gt(0) && revitalizedHorde.gt(0),
        summary: [
          {
            description: 'Revitalized Prospects',
            tooltip: tooltips.revitalizedProspects,
            token: PROSPECTS,
            amount: revitalizedProspects,
          },
          {
            description: 'Revitalized Horde',
            tooltip: tooltips.revitalizedHorde,
            token: HORDE,
            amount: revitalizedHorde,
          },
        ],
        txActions: () => [
          {
            type: ActionType.ENROOT,
            prospects: revitalizedProspects,
            horde: revitalizedHorde,
          },
        ],
      },
      [FormTxn.DRAFT]: {
        title: 'Draft',
        tooltip: tooltips.draft,
        enabled: draftableCasuals.gt(0),
        claimable: {
          token: CASUALS,
          amount: draftableCasuals,
        },
        summary: [
          {
            description: 'Draftable Casuals',
            tooltip: tooltips.draftableCasuals,
            token: CASUALS,
            amount: draftableCasuals,
          },
        ],
        txActions: () => [
          {
            type: ActionType.DRAFT,
            amount: draftableCasuals,
          },
        ],
      },
      [FormTxn.TRADE]: {
        title: 'Trade',
        tooltip: tooltips.trade,
        enabled: tradableBootboys.gt(0),
        claimable: {
          token: BOOTBOYS,
          amount: tradableBootboys,
        },
        summary: [
          {
            description: 'Tradable Bootboys',
            tooltip: tooltips.tradableBootboys,
            token: BOOTBOYS,
            amount: tradableBootboys,
          },
        ],
        txActions: () => [
          {
            type: ActionType.TRADE,
            amount: tradableBootboys,
          },
        ],
      },
      [FormTxn.CLAIM]: {
        title: 'Claim',
        tooltip: tooltips.claim,
        enabled: claimableHooligans.gt(0),
        claimable: {
          token: HOOLIGAN,
          amount: claimableHooligans,
        },
        summary: [
          {
            description: 'Claimable Hooligans',
            tooltip: tooltips.claimableHooligans,
            token: HOOLIGAN,
            amount: claimableHooligans,
          },
        ],
        txActions: () => [
          {
            type: ActionType.CLAIM_WITHDRAWAL,
            amount: claimableHooligans,
            token: getNewToOldToken(HOOLIGAN),
          },
        ],
      },
    };
  }, [
    guvnorBarrack.percocetedBootboys,
    guvnorField.draftableCasuals,
    guvnorFirm.balances,
    guvnorFirm.hooligans.earned,
    guvnorFirm.prospects.earned,
    guvnorFirm.horde.earned,
    guvnorFirm.horde.grown,
    revitalizedProspects,
    revitalizedHorde,
    sdk.tokens,
  ]);

  /**
   * Returns the total amount of hooligans claimable from a list of claimable actions
   */
  const getClaimable = useCallback(
    (_options?: FormTxn[]) => {
      const amount = _options?.reduce((prev, curr) => {
        const option = summary[curr] as FormTxnSummary;
        prev = prev.plus(normalizeBN(option?.claimable?.amount));
        return prev;
      }, ZERO_BN);

      const tokenValue = sdk.tokens.HOOLIGAN.fromHuman(amount?.toString() || '0');

      return {
        bn: amount || ZERO_BN,
        tokenValue,
      };
    },
    [summary, sdk.tokens.HOOLIGAN]
  );

  const canClaimHooligans = useMemo(() => {
    const { bn } = getClaimable([
      FormTxn.CLAIM,
      FormTxn.TRADE,
      FormTxn.DRAFT,
    ]);
    return bn.gt(0);
  }, [getClaimable]);

  const canRecruit = useMemo(() => {
    const earnedProspects = normalizeBN(guvnorFirm.prospects.earned);
    return earnedProspects;
  }, [guvnorFirm.prospects.earned]);

  return { summary, getClaimable, canClaimHooligans, canRecruit };
}
