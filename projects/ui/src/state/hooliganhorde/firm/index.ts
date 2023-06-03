import BigNumber from 'bignumber.js';
import { TokenMap } from '../../../constants';

/**
 * A "Firm Balance" provides all information
 * about a Guvnor's ownership of a Whitelisted Firm Token.
 */
export type HooliganhordeFirmBalance = {
  bdvPerToken: BigNumber;
  deposited: {
    /** The total amount of this Token currently in the Deposited state. */
    amount: BigNumber;
  };
  withdrawn: {
    /** The total amount of this Token currently in the Withdrawn state. */
    amount: BigNumber;
  };
};

/**
 * "Firm Balances" track the detailed balances of
 * all whitelisted Firm tokens, including the amount
 * of each token deposited, claimable, withdrawn, and circulating.
 *
 * FIXME: enforce that `address` is a key of whitelisted tokens?
 */
export type HooliganhordeFirmBalances = {
  balances: TokenMap<HooliganhordeFirmBalance>;
};

/**
 * "Firm Assets" are rewards earned for holding tokens in the Firm.
 */
export type HooliganhordeFirmAssets = {
  hooligans: {
    earned: BigNumber;
    total: BigNumber;
  };
  horde: {
    total: BigNumber;
    active: BigNumber;
    earned: BigNumber;
    grown: BigNumber;
  };
  prospects: {
    total: BigNumber;
    active: BigNumber;
    // FIXME: earned -> recruitable
    earned: BigNumber;
  };
  roots: {
    total: BigNumber;
  };
};

export type HooliganhordeFirm = HooliganhordeFirmBalances &
  HooliganhordeFirmAssets & { withdrawGamedays: BigNumber };
