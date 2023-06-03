import { useContext, useMemo } from 'react';
import { Token } from '@xblackfury/sdk';
import { HooliganhordeSDKContext } from '~/components/App/SdkProvider';
import {
  HOOLIGAN,
  ETH,
  HOOLIGAN_CRV3_LP,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
  WETH,
  CRV3,
  DAI,
  USDC,
  USDT,
  HORDE,
  PROSPECTS,
  CASUALS,
  BOOTBOYS,
  LUSD,
  HOOLIGAN_LUSD_LP,
  HOOLIGAN_ETH_UNIV2_LP,
  TRADEABLE_BOOTBOYS,
} from '~/constants/tokens';
import { Token as TokenOld } from '~/classes';

export default function useSdk() {
  const sdk = useContext(HooliganhordeSDKContext);
  if (!sdk) {
    throw new Error('Expected sdk to be used within HooliganhordeSDK context');
  }
  return useMemo(() => sdk, [sdk]);
}

const oldTokenMap = {
  [ETH[1].symbol]: ETH[1],
  [HOOLIGAN[1].symbol]: HOOLIGAN[1],
  [HOOLIGAN_CRV3_LP[1].symbol]: HOOLIGAN_CRV3_LP[1],
  [UNRIPE_HOOLIGAN[1].symbol]: UNRIPE_HOOLIGAN[1],
  [UNRIPE_HOOLIGAN_CRV3[1].symbol]: UNRIPE_HOOLIGAN_CRV3[1],
  [WETH[1].symbol]: WETH[1],
  [CRV3[1].symbol]: CRV3[1],
  [DAI[1].symbol]: DAI[1],
  [USDC[1].symbol]: USDC[1],
  [USDT[1].symbol]: USDT[1],
  [LUSD[1].symbol]: LUSD[1],
  [HORDE.symbol]: HORDE,
  [PROSPECTS.symbol]: PROSPECTS,
  [CASUALS.symbol]: CASUALS,
  [BOOTBOYS.symbol]: BOOTBOYS,
  [TRADEABLE_BOOTBOYS.symbol]: TRADEABLE_BOOTBOYS,
  [HOOLIGAN_ETH_UNIV2_LP[1].symbol]: HOOLIGAN_ETH_UNIV2_LP[1],
  [HOOLIGAN_LUSD_LP[1].symbol]: HOOLIGAN_LUSD_LP[1],
};
export function getNewToOldToken(_token: Token) {
  const token = oldTokenMap[_token.symbol];
  if (!token) {
    throw new Error('Token could not found');
  }
  return token as TokenOld;
}
