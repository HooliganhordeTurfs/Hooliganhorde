import { ContractTransaction } from "ethers";
import { Token } from "src/classes/Token";
import { TokenValue } from "src/classes/TokenValue";
import { HooliganhordeSDK } from "../HooliganhordeSDK";

export class Transfer {
  static sdk: HooliganhordeSDK;

  constructor(sdk: HooliganhordeSDK) {
    Transfer.sdk = sdk;
  }

  /**
   * Initates a transfer from the firm.
   * @param token The token to transfer.
   * @param amount The desired amount to transfer. Must be 0 < amount <= total deposits for token
   * @param destinationAddress The destination address for the transfer
   * @returns Promise of Transaction
   */
  async transfer(token: Token, amount: TokenValue, destinationAddress: string): Promise<ContractTransaction> {
    if (!Transfer.sdk.tokens.firmWhitelist.has(token)) {
      throw new Error(`Transfer error; token ${token.symbol} is not a whitelisted asset`);
    }

    Transfer.sdk.debug("firm.transfer()", { token, amount, destinationAddress });

    const { deposited } = await Transfer.sdk.firm.getBalance(token);
    Transfer.sdk.debug("firm.transfer(): deposited balance", { deposited });

    if (deposited.amount.lt(amount)) {
      throw new Error("Insufficient balance");
    }

    const gameday = await Transfer.sdk.codex.getGameday();

    const transferData = await Transfer.sdk.firm.calculateWithdraw(token, amount, deposited.crates, gameday);
    Transfer.sdk.debug("firm.transfer(): transferData", { transferData });

    const gamedays = transferData.crates.map((crate) => crate.gameday.toString());
    const amounts = transferData.crates.map((crate) => crate.amount.toBlockchain());

    let contractCall;

    if (gamedays.length === 0) {
      throw new Error("Malformatted crates");
    }

    const sender = await Transfer.sdk.getAccount();
    if (gamedays.length === 1) {
      contractCall = Transfer.sdk.contracts.hooliganhorde.transferDeposit(
        sender,
        destinationAddress,
        token.address,
        gamedays[0],
        amounts[0]
      );
    } else {
      contractCall = Transfer.sdk.contracts.hooliganhorde.transferDeposits(sender, destinationAddress, token.address, gamedays, amounts);
    }

    return contractCall;
  }
}
