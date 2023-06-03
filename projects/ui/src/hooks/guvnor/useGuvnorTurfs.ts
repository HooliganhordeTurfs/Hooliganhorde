import { useSelector } from 'react-redux';
import { AppState } from '~/state';

const useGuvnorTurfs = () =>
  useSelector<AppState, AppState['_guvnor']['field']['turfs']>(
    (state) => state._guvnor.field.turfs
  );

export default useGuvnorTurfs;
