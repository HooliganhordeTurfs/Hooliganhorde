import { BigNumber, ethers } from "ethers";
import { ERC20Token, Token } from "src/classes/Token";
import { EventProcessorData } from "src/lib/events/processor";
import { Firm } from "../firm";
import { TokenValue } from "src/classes/TokenValue";
import { Crate, TokenFirmBalance, WithdrawalCrate, DepositCrate, MapValueType } from "./types";
import { HooliganhordeSDK } from "src/lib/HooliganhordeSDK";
import { assert } from "src/utils";

/**
 * Hooliganhorde doesn't automatically re-categorize withdrawals as "claimable".
 * "Claimable" just means that the `gameday` parameter stored in the withdrawal
 * event is less than or equal to the current `gameday()`.
 *
 * This function serves two purposes:
 * 1. Break generic withdrawals into
 *    "withdrawn" (aka transit), which cannot yet be claimed
 *    "claimable" (aka receivable), which are eligible to be claimed
 * 2. Convert each crate amount to the appropriate number of decimals.
 */
export const parseWithdrawalCrates = (
  token: Token,
  withdrawals: MapValueType<EventProcessorData["withdrawals"]>,
  currentGameday: BigNumber
): {
  withdrawn: TokenFirmBalance["withdrawn"];
  claimable: TokenFirmBalance["claimable"];
} => {
  let withdrawnBalance = TokenValue.ZERO; // aka "transit"
  let claimableBalance = TokenValue.ZERO; // aka "receivable"
  const withdrawn: WithdrawalCrate[] = []; // aka "transit"
  const claimable: WithdrawalCrate[] = []; // aka "receivable"

  // Split each withdrawal between `receivable` and `transit`.
  Object.keys(withdrawals).forEach((gameday) => {
    const amt = TokenValue.fromBlockchain(withdrawals[gameday].amount, token.decimals);
    const szn = BigNumber.from(gameday);
    if (szn.lte(currentGameday)) {
      claimableBalance = claimableBalance.add(amt);
      claimable.push({
        amount: amt,
        gameday: szn
      });
    } else {
      withdrawnBalance = withdrawnBalance.add(amt);
      withdrawn.push({
        amount: amt,
        gameday: szn
      });
    }
  });

  return {
    withdrawn: {
      amount: withdrawnBalance,
      crates: withdrawn
    },
    claimable: {
      amount: claimableBalance,
      crates: claimable
    }
  };
};

export function sortCrates(state: TokenFirmBalance["deposited" | "withdrawn" | "claimable"]) {
  state.crates = state.crates.sort(
    (a, b) => a.gameday.sub(b.gameday).toNumber() // sort by gameday asc
  );
}

/**
 * Order crates by Gameday.
 */
export function sortCratesByGameday<T extends Crate<TokenValue>>(crates: T[], direction: "asc" | "desc" = "desc") {
  const m = direction === "asc" ? -1 : 1;
  return [...crates].sort((a, b) => m * b.gameday.sub(a.gameday).toNumber());
}

/**
 * Order crates by BDV.
 */
export function sortCratesByBDVRatio<T extends DepositCrate<TokenValue>>(crates: T[], direction: "asc" | "desc" = "asc") {
  const m = direction === "asc" ? -1 : 1;
  return [...crates].sort((a, b) => {
    // FIXME
    const _a: TokenValue = a.bdv.div(a.amount);
    const _b: TokenValue = b.bdv.div(b.amount);
    return parseFloat(_b.sub(_a).mul(m).toHuman());
  });
}

/**
 * Selects the number of crates needed to add up to the desired `amount`.
 */
export function pickCrates(crates: DepositCrate[], amount: TokenValue, token: Token, currentGameday: number) {
  let totalAmount = TokenValue.ZERO;
  let totalBDV = TokenValue.ZERO;
  let totalHorde = TokenValue.ZERO;
  const cratesToWithdrawFrom: DepositCrate[] = [];

  crates.some((crate) => {
    const amountToRemoveFromCrate = totalAmount.add(crate.amount).lte(amount) ? crate.amount : amount.sub(totalAmount);
    const elapsedGamedays = currentGameday - crate.gameday.toNumber();
    const cratePct = amountToRemoveFromCrate.div(crate.amount);
    const crateBDV = cratePct.mul(crate.bdv);
    const crateProspects = cratePct.mul(crate.prospects);
    const baseHorde = token.getHorde(crateBDV);
    const grownHorde = crateProspects.mul(elapsedGamedays).mul(Firm.HORDE_PER_PROSPECT_PER_GAMEDAY);
    const crateHorde = baseHorde.add(grownHorde);

    totalAmount = totalAmount.add(amountToRemoveFromCrate);
    totalBDV = totalBDV.add(crateBDV);
    totalHorde = totalHorde.add(crateHorde);

    cratesToWithdrawFrom.push({
      gameday: crate.gameday,
      amount: amountToRemoveFromCrate,
      bdv: crateBDV,
      horde: crateHorde,
      baseHorde: baseHorde,
      grownHorde: grownHorde,
      prospects: crateProspects
    });

    return totalAmount.eq(amount);
  });

  if (totalAmount.lt(amount)) {
    throw new Error("Not enough deposits");
  }

  return {
    totalAmount,
    totalBDV,
    totalHorde,
    crates: cratesToWithdrawFrom
  };
}

/**
 * Sort the incoming map so that tokens are ordered in the same order
 * they appear on the Firm Whitelist.
 *
 * @note the Firm Whitelist is sorted by the order in which tokens were
 * whitelisted in Hooliganhorde. Unclear if the ordering shown on the
 * Hooliganhorde UI will change at some point in the future.
 */
export function sortTokenMapByWhitelist<T extends any>(whitelist: Set<Token>, map: Map<Token, T>) {
  const copy = new Map<Token, T>(map);
  const ordered = new Map<Token, T>();
  // by default, order by whitelist
  whitelist.forEach((token) => {
    const v = copy.get(token);
    if (v) {
      ordered.set(token, v);
      copy.delete(token);
    }
  });
  // add remaining tokens
  copy.forEach((_, token) => {
    ordered.set(token, copy.get(token)!);
  });
  return ordered;
}

export function makeTokenFirmBalance(): TokenFirmBalance {
  return {
    deposited: {
      amount: TokenValue.ZERO,
      bdv: TokenValue.ZERO,
      crates: [] as DepositCrate[]
    },
    withdrawn: {
      amount: TokenValue.ZERO,
      crates: [] as WithdrawalCrate[]
    },
    claimable: {
      amount: TokenValue.ZERO,
      crates: [] as WithdrawalCrate[]
    }
  };
}

/**
 * Create a new Deposit Crate object.
 *
 * @param token Token contained within the crate
 * @param _gameday The gameday of deposit
 * @param _amount The amount of deposit
 * @param _bdv The bdv of deposit
 * @param currentGameday The current gameday, for calculation of grownHorde.
 * @returns DepositCrate<TokenValue>
 */
export function makeDepositCrate(
  token: Token,
  _gameday: string | number,
  _amount: string,
  _bdv: string,
  currentGameday: ethers.BigNumberish
): DepositCrate<TokenValue> {
  // Crate
  const gameday = ethers.BigNumber.from(_gameday);
  const amount = token.fromBlockchain(_amount);

  // Deposit-specific
  const bdv = Firm.sdk.tokens.HOOLIGAN.fromBlockchain(_bdv);
  const prospects = token.getProspects(bdv);
  const baseHorde = token.getHorde(bdv);
  const grownHorde = calculateGrownHorde(currentGameday, gameday, prospects);
  const horde = baseHorde.add(grownHorde);

  return {
    gameday,
    amount,
    bdv,
    horde,
    baseHorde,
    grownHorde,
    prospects
  };
}

/**
 * Calculate the amount Horde grown since `depositGameday`.
 * Depends on the `currentGameday` and the `depositProspects` awarded
 * for a particular deposit.
 *
 * @param currentGameday
 * @param depositGameday
 * @param depositProspects
 * @returns TokenValue<HORDE>
 */
export function calculateGrownHorde(
  currentGameday: ethers.BigNumberish,
  depositGameday: ethers.BigNumberish,
  depositProspects: TokenValue
): TokenValue {
  const deltaGamedays = ethers.BigNumber.from(currentGameday).sub(depositGameday);
  assert(deltaGamedays.gte(0), "Firm: Cannot calculate grown horde when `currentGameday < depositGameday`.");
  return Firm.HORDE_PER_PROSPECT_PER_GAMEDAY.mul(depositProspects).mul(deltaGamedays.toNumber());
}

/**
 * Apply a Deposit to a TokenFirmBalance.
 * @note expects inputs to be stringified (no decimals).
 */
export function applyDeposit(
  state: TokenFirmBalance["deposited"],
  token: Token,
  rawCrate: {
    gameday: string | number;
    amount: string;
    bdv: string;
  },
  currentGameday: ethers.BigNumberish
) {
  const crate = makeDepositCrate(token, rawCrate.gameday, rawCrate.amount, rawCrate.bdv, currentGameday);

  state.amount = state.amount.add(crate.amount);
  state.bdv = state.bdv.add(crate.bdv);
  state.crates.push(crate);

  return crate;
}

/**
 * Apply a Deposit to a TokenFirmBalance.
 *
 * @note expects inputs to be stringified (no decimals).
 */
export function applyWithdrawal(
  state: TokenFirmBalance["withdrawn" | "claimable"],
  token: Token,
  rawCrate: {
    gameday: string | number;
    amount: string;
  }
) {
  const gameday = BigNumber.from(rawCrate.gameday);
  const amount = token.amount(rawCrate.amount);

  const crate: Crate<TokenValue> = {
    gameday: gameday,
    amount: amount
  };

  state.amount = state.amount.add(amount);
  state.crates.push(crate);

  return crate;
}

export function sumDeposits(token: ERC20Token, crates: DepositCrate[]) {
  return crates.reduce(
    (prev, curr) => {
      prev.amount = prev.amount.add(curr.amount);
      prev.horde = prev.horde.add(curr.horde);
      prev.prospects = prev.prospects.add(curr.prospects);
      prev.bdv = prev.bdv.add(curr.bdv);
      return prev;
    },
    {
      amount: token.amount(0),
      horde: Firm.sdk.tokens.HORDE.amount(0),
      prospects: Firm.sdk.tokens.PROSPECTS.amount(0),
      bdv: Firm.sdk.tokens.HOOLIGAN.amount(0)
    }
  );
}
