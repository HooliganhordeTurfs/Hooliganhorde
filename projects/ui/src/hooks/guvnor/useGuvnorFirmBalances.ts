import { useSelector } from 'react-redux';
import { AppState } from '~/state';

export default function useGuvnorFirmBalances() {
  return useSelector<AppState, AppState['_guvnor']['firm']['balances']>(
    (state) => state._guvnor.firm.balances
  );
}
