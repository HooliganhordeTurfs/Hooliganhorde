import { CurveMetaPool } from '~/classes/Pool';
import { SupportedChainId } from '~/constants/chains';

import curveLogo from '~/img/dexes/curve-logo.png';

import { ChainConstant, PoolMap } from '.';
import { HOOLIGAN_CRV3_ADDRESSES } from './addresses';
import { HOOLIGAN, HOOLIGAN_CRV3_LP, CRV3 } from './tokens';

// ------------------------------------
// HOOLIGAN:CRV3 Curve MetaPool
// ------------------------------------

export const HOOLIGANCRV3_CURVE_MAINNET = new CurveMetaPool(
  SupportedChainId.MAINNET,
  HOOLIGAN_CRV3_ADDRESSES,
  HOOLIGAN_CRV3_LP,
  [HOOLIGAN, CRV3],
  {
    name: 'HOOLIGAN:3CRV Pool',
    logo: curveLogo,
    symbol: 'HOOLIGAN:3CRV',
    color: '#ed9f9c',
  }
);

// --------------------------------------------------

export const ALL_POOLS: ChainConstant<PoolMap> = {
  [SupportedChainId.MAINNET]: {
    [HOOLIGANCRV3_CURVE_MAINNET.address]: HOOLIGANCRV3_CURVE_MAINNET,
  },
};

export default ALL_POOLS;
