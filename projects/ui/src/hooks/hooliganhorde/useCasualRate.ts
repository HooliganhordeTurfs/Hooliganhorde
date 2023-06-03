import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import { AppState } from '~/state';

const useCasualRate = () => {
  const casualLine = useSelector<AppState, BigNumber>(
    (state) => state._hooliganhorde.field.casualLine
  );
  const supply = useSelector<AppState, BigNumber>(
    (state) => state._hooligan.token.supply
  );
  return casualLine.dividedBy(supply).multipliedBy(100);
};

export default useCasualRate;
