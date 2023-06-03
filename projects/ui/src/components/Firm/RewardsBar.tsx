import React from 'react';
import { Box, Stack } from '@mui/material';
import BigNumber from 'bignumber.js';
import hooliganIcon from '~/img/tokens/hooligan-logo-circled.svg';
import hordeIcon from '~/img/hooliganhorde/horde-icon-winter.svg';
import prospectIcon from '~/img/hooliganhorde/prospect-icon-winter.svg';
import { NEW_BN } from '~/constants';
import { GuvnorFirmRewards } from '~/state/guvnor/firm';
import RewardItem from './RewardItem';
import { ClaimRewardsAction } from '../../lib/Hooliganhorde/Farm';
import { hoverMap } from '../../constants/firm';
import Row from '~/components/Common/Row';

import { FC } from '~/types';

export type RewardsBarProps = {
  hooligans: GuvnorFirmRewards['hooligans'];
  horde: GuvnorFirmRewards['horde'];
  prospects: GuvnorFirmRewards['prospects'];
  /// TEMP
  revitalizedHorde?: BigNumber;
  revitalizedProspects?: BigNumber;
  /**
   * Either the selected or hovered action.
   * If present, grey out the non-included
   * rewards.
   */
  action?: ClaimRewardsAction | undefined;
  /**
   * Revitalized rewards are hidden if a wallet
   * does not have deposited unripe assets.
   */
  hideRevitalized?: boolean;
};

const RewardsBar: FC<RewardsBarProps & { compact?: boolean }> = ({
  hooligans,
  horde,
  prospects,
  revitalizedHorde = NEW_BN,
  revitalizedProspects = NEW_BN,
  action,
  hideRevitalized,
  compact = false,
}) => {
  const GAP_LG = compact ? 2 : 3.5;
  const GAP_MD = compact ? 1 : 2;
  const GAP_XS = compact ? 0.5 : 1;

  const selectedActionIncludes = (c: ClaimRewardsAction) =>
    action && hoverMap[action].includes(c);

  return (
    <Stack
      direction={{ lg: 'row', xs: 'column' }}
      columnGap={{ xs: GAP_XS, md: GAP_MD, lg: GAP_LG }}
      rowGap={1.5}
    >
      {/* Earned */}
      <Row gap={{ xs: GAP_XS, md: GAP_MD, lg: GAP_LG }}>
        <RewardItem
          title="Earned Hooligans"
          tooltip="The number of Hooligans earned since your last Recruit. Upon Recruit, Earned Hooligans are Deposited in the current Gameday."
          amount={hooligans.earned}
          icon={hooliganIcon}
          compact={compact}
          isClaimable={
            action &&
            (action === ClaimRewardsAction.RECRUIT_AND_MOW ||
              action === ClaimRewardsAction.CLAIM_ALL)
          }
        />
        <RewardItem
          title="Earned Horde"
          tooltip="Horde earned from Earned Hooligans. Earned Horde automatically contribute to Horde ownership and do not require any action to claim them."
          amount={horde.earned}
          icon={hordeIcon}
          compact={compact}
          isClaimable={
            action &&
            (action === ClaimRewardsAction.RECRUIT_AND_MOW ||
              action === ClaimRewardsAction.CLAIM_ALL)
          }
        />
      </Row>
      <Box
        display={{ xs: 'block', lg: compact ? 'none' : 'block' }}
        sx={{ borderLeft: '0.5px solid', borderColor: 'divider' }}
      />
      {/* Grown */}
      <Row gap={{ xs: GAP_XS, md: GAP_MD, lg: GAP_LG }}>
        <RewardItem
          title="Recruitable Prospects"
          tooltip="Prospects earned in conjunction with Earned Hooligans. Recruitable Prospects must be Recruited in order to grow Horde."
          amount={prospects.earned}
          icon={prospectIcon}
          compact={compact}
          isClaimable={selectedActionIncludes(ClaimRewardsAction.RECRUIT_AND_MOW)}
        />
        <RewardItem
          title="Grown Horde"
          tooltip="Horde earned from Prospects. Grown Horde does not contribute to Horde ownership until it is Mown. Grown Horde is Mown at the beginning of any Firm interaction."
          amount={horde.grown}
          icon={hordeIcon}
          compact={compact}
          isClaimable={selectedActionIncludes(ClaimRewardsAction.MOW)}
        />
      </Row>
      <Box
        display={{ xs: 'block', lg: compact ? 'none' : 'block' }}
        sx={{ borderLeft: '0.5px solid', borderColor: 'divider' }}
      />
      {/* Revitalized */}
      <Row gap={{ xs: GAP_XS, md: GAP_MD, lg: GAP_LG }}>
        <RewardItem
          title="Revitalized Horde"
          tooltip="Horde that have vested for pre-exploit Firm Members. Revitalized Horde are minted as the percentage of Percoceter sold increases. Revitalized Horde does not contribute to Horde ownership until Enrooted."
          amount={revitalizedHorde}
          icon={hordeIcon}
          compact={compact}
          isClaimable={
            hideRevitalized
              ? false
              : selectedActionIncludes(ClaimRewardsAction.ENROOT_AND_MOW)
          }
        />
        <RewardItem
          title="Revitalized Prospects"
          tooltip="Prospects that have vested for pre-exploit Firm Members. Revitalized Prospects are minted as the percentage of Percoceter sold increases. Revitalized Prospects do not generate Horde until Enrooted."
          amount={revitalizedProspects}
          icon={prospectIcon}
          compact={compact}
          isClaimable={
            hideRevitalized
              ? false
              : selectedActionIncludes(ClaimRewardsAction.ENROOT_AND_MOW)
          }
        />
      </Row>
    </Stack>
  );
};

export default RewardsBar;
