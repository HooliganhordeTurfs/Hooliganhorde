import { useSelector } from 'react-redux';
import { AppState } from '~/state';

const useGuvnorOrdersLedger = () =>
  useSelector<AppState, AppState['_guvnor']['market']['orders']>(
    (state) => state._guvnor.market.orders
  );

export default useGuvnorOrdersLedger;
