import { useSelector } from 'react-redux';
import { AppState } from '~/state';

export default function useFirm() {
  return useSelector<AppState, AppState['_hooliganhorde']['firm']>(
    (state) => state._hooliganhorde.firm
  );
}
