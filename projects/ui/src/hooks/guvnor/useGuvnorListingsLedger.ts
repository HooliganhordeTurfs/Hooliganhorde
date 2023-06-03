import { useSelector } from 'react-redux';
import { AppState } from '~/state';

const useGuvnorListingsLedger = () =>
  useSelector<AppState, AppState['_guvnor']['market']['listings']>(
    (state) => state._guvnor.market.listings
  );

export default useGuvnorListingsLedger;
