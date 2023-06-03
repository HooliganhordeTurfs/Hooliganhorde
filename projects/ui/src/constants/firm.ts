import { ClaimRewardsAction } from '../lib/Hooliganhorde/Farm';

export const hoverMap = {
  [ClaimRewardsAction.MOW]: [ClaimRewardsAction.MOW],
  [ClaimRewardsAction.RECRUIT_AND_MOW]: [
    ClaimRewardsAction.MOW,
    ClaimRewardsAction.RECRUIT_AND_MOW,
  ],
  [ClaimRewardsAction.ENROOT_AND_MOW]: [
    ClaimRewardsAction.MOW,
    ClaimRewardsAction.ENROOT_AND_MOW,
  ],
  // [ClaimRewardsAction.ENROOT_AND_MOW]:  [ClaimRewardsAction.MOW, ClaimRewardsAction.RECRUIT_AND_MOW, ClaimRewardsAction.ENROOT_AND_MOW, ClaimRewardsAction.CLAIM_ALL],
  [ClaimRewardsAction.CLAIM_ALL]: [
    ClaimRewardsAction.MOW,
    ClaimRewardsAction.RECRUIT_AND_MOW,
    ClaimRewardsAction.ENROOT_AND_MOW,
    ClaimRewardsAction.CLAIM_ALL,
  ],
};
