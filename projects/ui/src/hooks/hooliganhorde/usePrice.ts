import { useSelector } from 'react-redux';
import { AppState } from '~/state';

const usePrice = () =>
  useSelector<AppState, AppState['_hooligan']['token']['price']>(
    (state) => state._hooligan.token.price
  );

export default usePrice;
