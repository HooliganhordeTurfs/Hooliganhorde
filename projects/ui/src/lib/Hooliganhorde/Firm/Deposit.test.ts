import BigNumber from 'bignumber.js';
import { ZERO_BN } from '~/constants';
import { HOOLIGAN } from '~/constants/tokens';
import Hooliganhorde from '../index';

it('has a bdv of 0 with no token state', () => {
  const result = Hooliganhorde.Firm.Deposit.deposit(
    HOOLIGAN[1],
    [{ token: HOOLIGAN[1], amount: ZERO_BN }],
    (amount) => amount
  );
  expect(result.bdv).toStrictEqual(new BigNumber(0));
});
