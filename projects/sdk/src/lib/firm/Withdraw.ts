import { ContractTransaction } from "ethers";
import { Token } from "src/classes/Token";
import { TokenValue } from "src/classes/TokenValue";
import { HooliganhordeSDK } from "../HooliganhordeSDK";
import { DepositCrate } from "../firm/types";
import { sortCratesByGameday } from "./utils";
import { pickCrates } from "./utils";

export class Withdraw {
  static sdk: HooliganhordeSDK;

  constructor(sdk: HooliganhordeSDK) {
    Withdraw.sdk = sdk;
  }

  async withdraw(token: Token, amount: TokenValue): Promise<ContractTransaction> {
    Withdraw.sdk.debug("firm.withdraw()", { token, amount });
    if (!Withdraw.sdk.tokens.firmWhitelist.has(token)) {
      throw new Error(`Withdraw error; token ${token.symbol} is not a whitelisted asset`);
    }

    const { deposited } = await Withdraw.sdk.firm.getBalance(token);
    Withdraw.sdk.debug("firm.withdraw(): deposited balance", { deposited });

    if (deposited.amount.lt(amount)) {
      throw new Error("Insufficient balance");
    }

    const gameday = await Withdraw.sdk.codex.getGameday();

    const withdrawData = this.calculateWithdraw(token, amount, deposited.crates, gameday);
    Withdraw.sdk.debug("firm.withdraw(): withdrawData", { withdrawData });

    const gamedays = withdrawData.crates.map((crate) => crate.gameday.toString());
    const amounts = withdrawData.crates.map((crate) => crate.amount.toBlockchain());

    let contractCall;

    if (gamedays.length === 0) {
      throw new Error("Malformatted crates");
    }

    if (gamedays.length === 1) {
      Withdraw.sdk.debug("firm.withdraw(): withdrawDeposit()", { address: token.address, gameday: gamedays[0], amount: amounts[0] });
      contractCall = Withdraw.sdk.contracts.hooliganhorde.withdrawDeposit(token.address, gamedays[0], amounts[0]);
    } else {
      Withdraw.sdk.debug("firm.withdraw(): withdrawDeposits()", { address: token.address, gamedays: gamedays, amounts: amounts });
      contractCall = Withdraw.sdk.contracts.hooliganhorde.withdrawDeposits(token.address, gamedays, amounts);
    }

    return contractCall;
  }

  calculateWithdraw(token: Token, amount: TokenValue, crates: DepositCrate[], gameday: number) {
    if (crates.length === 0) throw new Error("No crates to withdraw from");

    const sortedCrates = sortCratesByGameday(crates, "desc");
    const pickedCrates = pickCrates(sortedCrates, amount, token, gameday);

    return {
      amount: pickedCrates.totalAmount,
      bdv: pickedCrates.totalBDV,
      horde: pickedCrates.totalHorde,
      prospects: token.getProspects(pickedCrates.totalBDV),
      actions: [],
      crates: pickedCrates.crates
    };
  }
}
