import { useSelector } from 'react-redux';
import { AppState } from '~/state';

const useDraftableIndex = () =>
  useSelector<AppState, AppState['_hooliganhorde']['field']['draftableIndex']>(
    (state) => state._hooliganhorde.field.draftableIndex
  );

export default useDraftableIndex;
