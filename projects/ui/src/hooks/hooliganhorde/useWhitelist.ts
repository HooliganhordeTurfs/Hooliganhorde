import { ERC20Token } from '~/classes/Token';
import { FIRM_WHITELIST } from '~/constants/tokens';
import useTokenMap from '../chain/useTokenMap';

export default function useWhitelist() {
  return useTokenMap<ERC20Token>(FIRM_WHITELIST);
}
