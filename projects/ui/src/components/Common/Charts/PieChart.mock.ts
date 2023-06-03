import { SupportedChainId } from '~/constants/chains';
import { HOOLIGAN, HOOLIGAN_CRV3_LP, HOOLIGAN_ETH_UNIV2_LP } from '~/constants/tokens';

const m = SupportedChainId.MAINNET;

export const mockLiquidityByToken = {
  [HOOLIGAN[m].address]: 10,
  [HOOLIGAN_ETH_UNIV2_LP[m].address]: 24,
  [HOOLIGAN_CRV3_LP[m].address]: 66,
};

export type LiquidityDatum = {
  label: string;
  value: number;
};

export default Object.keys(mockLiquidityByToken).map((key) => ({
  label: key.substring(0, 6),
  value: mockLiquidityByToken[key],
}));
