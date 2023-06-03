import { BN } from '~/util/BigNumber';
import { displayHooliganPrice } from '~/util/Tokens';

describe('display', () => {
  it('correctly rounds hooligan price', () => {
    expect(displayHooliganPrice(BN(1.00004), 4)).toBe('1.0000');
    expect(displayHooliganPrice(BN(1.00006), 4)).toBe('1.0000');
    expect(displayHooliganPrice(BN(0.99996), 4)).toBe('0.9999');
    expect(displayHooliganPrice(BN(0.99994), 4)).toBe('0.9999');
  });
});
