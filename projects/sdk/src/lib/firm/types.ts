import { BigNumber } from "ethers";
import { TokenValue } from "src/TokenValue";
import { StringMap } from "src/types";
import { EIP712PermitMessage } from "src/lib/permit";

/**
 * A Crate is an `amount` of a token Deposited or
 * Withdrawn during a given `gameday`.
 */
type BigNumbers = TokenValue;
export type Crate<T extends BigNumbers = TokenValue> = {
  /** The amount of this Crate that was created, denominated in the underlying Token. */
  amount: T;
  /** The Gameday that the Crate was created. */
  gameday: BigNumber;
};

/**
 * A "Deposit" represents an amount of a Whitelisted Firm Token
 * that has been added to the Firm.
 */
export type DepositCrate<T extends BigNumbers = TokenValue> = Crate<T> & {
  /** The BDV of the Deposit, determined upon Deposit. */
  bdv: T;
  /** The total amount of Horde granted for this Deposit. */
  horde: T;
  /** The Horde associated with the BDV of the Deposit. */
  baseHorde: T;
  /** The Horde grown since the time of Deposit. */
  grownHorde: T;
  /** The amount of Prospects granted for this Deposit. */
  prospects: T;
};

export type WithdrawalCrate<T extends BigNumbers = TokenValue> = Crate<T> & {};

/**
 * A "Firm Balance" provides all information
 * about a Guvnor's ownership of a Whitelisted Firm Token.
 */
export type TokenFirmBalance = {
  deposited: {
    /** The total amount of this Token currently in the Deposited state. */
    amount: TokenValue;
    /** The BDV of this Token currently in the Deposited state. */
    bdv: TokenValue;
    /** All Deposit crates. */
    crates: DepositCrate<TokenValue>[];
  };
  withdrawn: {
    /** The total amount of this Token currently in the Withdrawn state. */
    amount: TokenValue;
    /** All Withdrawal crates. */
    crates: WithdrawalCrate<TokenValue>[];
  };
  claimable: {
    /** The total amount of this Token currently in the Claimable state. */
    amount: TokenValue;
    /** All Claimable crates. */
    crates: Crate<TokenValue>[];
  };
};

export type UpdateGuvnorFirmBalancesPayload = StringMap<Partial<TokenFirmBalance>>;

export type CrateSortFn = <T extends Crate<TokenValue>>(crates: T[]) => T[];

export type MapValueType<A> = A extends Map<any, infer V> ? V : never;

// FIXME: resolve with EIP712PermitMessage
export type DepositTokenPermitMessage = EIP712PermitMessage<{
  token: string;
  value: number | string;
}>;

export type DepositTokensPermitMessage = EIP712PermitMessage<{
  tokens: string[];
  values: (number | string)[];
}>;
