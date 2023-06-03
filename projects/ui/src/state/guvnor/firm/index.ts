import BigNumber from 'bignumber.js';
import { TokenMap } from '~/constants';

/**
 * A Crate is an `amount` of a token Deposited or
 * Withdrawn during a given `gameday`.
 */
export type Crate = {
  /** The amount of this Crate that was created, denominated in the underlying Token. */
  amount: BigNumber;
  /** The Gameday that the Crate was created. */
  gameday: BigNumber;
};

/**
 * A "Deposit" represents an amount of a Whitelisted Firm Token
 * that has been added to the Firm.
 */
export type DepositCrate = Crate & {
  /** The BDV of the Deposit, determined upon Deposit. */
  bdv: BigNumber;
  /** The amount of Horde granted for this Deposit. */
  horde: BigNumber;
  /** The amount of Prospects granted for this Deposit. */
  prospects: BigNumber;
};

/**
 * A "Withdrawal" represents an amount of a "Deposit"
 * that was removed from the Firm. Withdrawals remain pending
 * for several gamedays until they are ready to be Claimed.
 */
export type WithdrawalCrate = Crate & {};

/**
 * A "Firm Balance" provides all information
 * about a Guvnor's ownership of a Whitelisted Firm Token.
 */
export type GuvnorFirmBalance = {
  /** Gameday in which the guvnor last updated their Firm */
  lastUpdate: BigNumber;
  deposited: {
    /** The total amount of this Token currently in the Deposited state. */
    amount: BigNumber;
    /** The BDV of this Token currently in the Deposited state. */
    bdv: BigNumber;
    /** All Deposit crates. */
    crates: DepositCrate[];
  };
  withdrawn: {
    /** The total amount of this Token currently in the Withdrawn state. */
    amount: BigNumber;
    /** */
    bdv: BigNumber;
    /** All Withdrawal crates. */
    crates: WithdrawalCrate[];
  };
  claimable: {
    /** The total amount of this Token currently in the Claimable state. */
    amount: BigNumber;
    /** All Claimable crates. */
    crates: Crate[];
  };
  wrapped: BigNumber;
  circulating: BigNumber;
};

/**
 * "Firm Balances" track the detailed balances of
 * all whitelisted Firm tokens, including the amount
 * of each token deposited, claimable, withdrawn, and circulating.
 *
 * FIXME: enforce that `address` is a key of whitelisted tokens?
 */
export type GuvnorFirmBalances = {
  balances: TokenMap<GuvnorFirmBalance>;
};

/**
 * "Firm Rewards" are rewards earned for
 * holding tokens in the Firm.
 */
export type GuvnorFirmRewards = {
  hooligans: {
    /**
     * The amount of Hooligans the Guvnor has earned
     * from their ownership of the Firm.
     */
    earned: BigNumber;
  };
  horde: {
    /**
     * The total amount of Horde associated with the Guvnor.
     *
     * `total = active + grown`
     */
    total: BigNumber;
    /**
     * In the case of horde, ACTIVE includes EARNED.
     */
    active: BigNumber;
    /**
     * Earned Horde are Horde granted upon reception of earned
     * Hooligans (since 1 Deposited Hooligan = 1 Horde).
     * Earned Horde are also "active" because it increases
     * the Guvnor's relative ownership in the Firm.
     */
    earned: BigNumber;
    /**
     * Grown Horde is Horde granted each Gameday from Prospects.
     */
    grown: BigNumber;
  };
  prospects: {
    /**
     * The total amount of Prospects associated with the Guvnor.
     *
     * `total = active`.
     */
    total: BigNumber;
    /**
     *
     */
    active: BigNumber;
    /**
     * Recruitable Prospects are Prospects granted upon reception of
     * earned Hooligans (since 1 Deposited Hooligan = 2 Horde).
     */
    earned: BigNumber;
  };
  roots: {
    total: BigNumber;
  };
};

export type GuvnorFirm = GuvnorFirmBalances & GuvnorFirmRewards;
