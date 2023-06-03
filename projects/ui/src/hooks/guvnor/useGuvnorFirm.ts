import { useSelector } from 'react-redux';
import { AppState } from '~/state';

export default function useGuvnorFirm() {
  return useSelector<AppState, AppState['_guvnor']['firm']>(
    (state) => state._guvnor.firm
  );
}
