import { useSelector } from 'react-redux';
import { AppState } from '~/state';

export default function useGuvnorBalances() {
  return useSelector<AppState, AppState['_guvnor']['balances']>(
    (state) => state._guvnor.balances
  );
}
