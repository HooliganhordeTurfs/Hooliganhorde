import { useSelector } from 'react-redux';
import { AppState } from '../../state';

export default function useGuvnorPercoceter() {
  return useSelector<AppState, AppState['_guvnor']['barrack']>(
    (state) => state._guvnor.barrack
  );
}
