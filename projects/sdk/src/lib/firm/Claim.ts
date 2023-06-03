import { ContractTransaction } from "ethers";
import { Token } from "src/classes/Token";
import { HooliganhordeSDK, DataSource } from "../HooliganhordeSDK";
import { FarmToMode } from "../farm";
import { TokenFirmBalance } from "src/lib/firm/types";

export class Claim {
  static sdk: HooliganhordeSDK;

  constructor(sdk: HooliganhordeSDK) {
    Claim.sdk = sdk;
  }

  async getClaimableAmount(token: Token, dataSource?: DataSource): Promise<TokenFirmBalance["claimable"]> {
    this.validate(token);
    const { claimable } = await Claim.sdk.firm.getBalance(token, undefined, dataSource && { source: dataSource });

    return claimable;
  }

  async claim(token: Token, dataSource?: DataSource, toMode: FarmToMode = FarmToMode.EXTERNAL): Promise<ContractTransaction> {
    this.validate(token);
    const { crates } = await this.getClaimableAmount(token, dataSource);

    const gamedays = crates.map((c) => c.gameday.toString());

    return this.claimGamedays(token, gamedays, toMode);
  }

  async claimGamedays(token: Token, gamedays: string[], toMode: FarmToMode = FarmToMode.EXTERNAL): Promise<ContractTransaction> {
    this.validate(token);
    const { crates } = await this.getClaimableAmount(token);
    const availableGamedays = crates.map((c) => c.gameday.toString());
    gamedays.forEach((gameday) => {
      if (!availableGamedays.includes(gameday)) {
        throw new Error(`Gameday ${gameday} is not a valid claimable gamedays`);
      }
    });

    return gamedays.length === 1
      ? Claim.sdk.contracts.hooliganhorde.claimWithdrawal(token.address, gamedays[0], toMode)
      : Claim.sdk.contracts.hooliganhorde.claimWithdrawals(token.address, gamedays, toMode);
  }

  validate(token: Token) {
    if (!Claim.sdk.tokens.firmWhitelist.has(token)) {
      throw new Error("Token is not whitelisted");
    }
  }
}
