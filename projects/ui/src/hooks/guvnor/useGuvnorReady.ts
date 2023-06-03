import isEmpty from 'lodash/isEmpty';
import useGuvnorBalances from './useGuvnorBalances';

/**
 * Ensure we've loaded a Guvnor's balances.
 */
export default function useGuvnorReady() {
  const balances = useGuvnorBalances();
  return !isEmpty(balances);
}
