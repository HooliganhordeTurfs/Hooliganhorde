import { ContractTransaction } from "ethers";
import { Token } from "src/classes/Token";
import { TokenValue } from "src/classes/TokenValue";
import { HooliganhordeSDK } from "../HooliganhordeSDK";
import { ConvertEncoder } from "./ConvertEncoder";
import { DepositCrate } from "./types";
import { pickCrates, sortCratesByBDVRatio, sortCratesByGameday } from "./utils";

export type ConvertDetails = {
  amount: TokenValue;
  bdv: TokenValue;
  horde: TokenValue;
  prospects: TokenValue;
  actions: [];
  crates: DepositCrate<TokenValue>[];
};

export class Convert {
  static sdk: HooliganhordeSDK;
  Hooligan: Token;
  HooliganCrv3: Token;
  urHooligan: Token;
  urHooliganCrv3: Token;
  paths: Map<Token, Token>;

  constructor(sdk: HooliganhordeSDK) {
    Convert.sdk = sdk;
    this.Hooligan = Convert.sdk.tokens.HOOLIGAN;
    this.HooliganCrv3 = Convert.sdk.tokens.HOOLIGAN_CRV3_LP;
    this.urHooligan = Convert.sdk.tokens.UNRIPE_HOOLIGAN;
    this.urHooliganCrv3 = Convert.sdk.tokens.UNRIPE_HOOLIGAN_CRV3;

    this.paths = new Map<Token, Token>();
    this.paths.set(this.Hooligan, this.HooliganCrv3);
    this.paths.set(this.HooliganCrv3, this.Hooligan);
    this.paths.set(this.urHooligan, this.urHooliganCrv3);
    this.paths.set(this.urHooliganCrv3, this.urHooligan);
  }

  async convert(fromToken: Token, toToken: Token, fromAmount: TokenValue, slippage: number = 0.1): Promise<ContractTransaction> {
    Convert.sdk.debug("firm.convert()", { fromToken, toToken, fromAmount });

    // Get convert estimate and details
    const { minAmountOut, conversion } = await this.convertEstimate(fromToken, toToken, fromAmount, slippage);

    // encoding
    const encoding = this.calculateEncoding(fromToken, toToken, fromAmount, minAmountOut);

    // format parameters
    const crates = conversion.crates.map((crate) => crate.gameday.toString());
    const amounts = conversion.crates.map((crate) => crate.amount.toBlockchain());

    // execute
    return Convert.sdk.contracts.hooliganhorde.convert(encoding, crates, amounts);
  }

  async convertEstimate(
    fromToken: Token,
    toToken: Token,
    fromAmount: TokenValue,
    slippage: number = 0.1
  ): Promise<{ minAmountOut: TokenValue; conversion: ConvertDetails }> {
    Convert.sdk.debug("firm.convertEstimate()", { fromToken, toToken, fromAmount });
    await this.validateTokens(fromToken, toToken);

    const { deposited } = await Convert.sdk.firm.getBalance(fromToken);
    Convert.sdk.debug("firm.convertEstimate(): deposited balance", { deposited });

    if (deposited.amount.lt(fromAmount)) {
      throw new Error("Insufficient balance");
    }

    const currentGameday = await Convert.sdk.codex.getGameday();

    const conversion = this.calculateConvert(fromToken, toToken, fromAmount, deposited.crates, currentGameday);

    const amountOutBN = await Convert.sdk.contracts.hooliganhorde.getAmountOut(
      fromToken.address,
      toToken.address,
      conversion.amount.toBigNumber()
    );
    const amountOut = toToken.fromBlockchain(amountOutBN);
    const minAmountOut = amountOut.pct(100 - slippage);

    return { minAmountOut, conversion };
  }

  calculateConvert(
    fromToken: Token,
    toToken: Token,
    fromAmount: TokenValue,
    crates: DepositCrate[],
    currentGameday: number
  ): ConvertDetails {
    if (crates.length === 0) throw new Error("No crates to withdraw from");
    const sortedCrates = toToken.isLP
      ? /// HOOLIGAN -> LP: oldest crates are best. Grown horde is equivalent
        /// on both sides of the convert, but having more prospects in older crates
        /// allows you to accrue horde faster after convert.
        /// Note that during this convert, BDV is approx. equal after the convert.
        sortCratesByGameday<DepositCrate>(crates, "asc")
      : /// LP -> HOOLIGAN: use the crates with the lowest [BDV/Amount] ratio first.
        /// Since LP deposits can have varying BDV, the best option for the Guvnor
        /// is to increase the BDV of their existing lowest-BDV crates.
        sortCratesByBDVRatio<DepositCrate>(crates, "asc");

    const pickedCrates = pickCrates(sortedCrates, fromAmount, fromToken, currentGameday);

    return {
      amount: pickedCrates.totalAmount,
      bdv: pickedCrates.totalBDV,
      horde: pickedCrates.totalHorde,
      prospects: fromToken.getProspects(pickedCrates.totalBDV),
      actions: [],
      crates: pickedCrates.crates
    };
  }

  calculateEncoding(fromToken: Token, toToken: Token, amountIn: TokenValue, minAmountOut: TokenValue) {
    let encoding;

    if (fromToken === this.urHooligan && toToken === this.urHooliganCrv3) {
      encoding = ConvertEncoder.unripeHooligansToLP(
        amountIn.toBlockchain(), // amountHooligans
        minAmountOut.toBlockchain() // minLP
      );
    } else if (fromToken === this.urHooliganCrv3 && toToken === this.urHooligan) {
      encoding = ConvertEncoder.unripeLPToHooligans(
        amountIn.toBlockchain(), // amountLP
        minAmountOut.toBlockchain() // minHooligans
      );
    } else if (fromToken === this.Hooligan && toToken === this.HooliganCrv3) {
      encoding = ConvertEncoder.hooligansToCurveLP(
        amountIn.toBlockchain(), // amountHooligans
        minAmountOut.toBlockchain(), // minLP
        toToken.address // output token address = pool address
      );
    } else if (fromToken === this.HooliganCrv3 && toToken === this.Hooligan) {
      encoding = ConvertEncoder.curveLPToHooligans(
        amountIn.toBlockchain(), // amountLP
        minAmountOut.toBlockchain(), // minHooligans
        fromToken.address // output token address = pool address
      );
    } else {
      throw new Error("Unknown conversion pathway");
    }

    return encoding;
  }

  async validateTokens(fromToken: Token, toToken: Token) {
    if (!Convert.sdk.tokens.isWhitelisted(fromToken)) {
      throw new Error("fromToken is not whitelisted");
    }

    if (!Convert.sdk.tokens.isWhitelisted(toToken)) {
      throw new Error("toToken is not whitelisted");
    }

    if (fromToken.equals(toToken)) {
      throw new Error("Cannot convert between the same token");
    }

    if (!this.paths.get(fromToken)?.equals(toToken)) {
      throw new Error("Cannot convert between these tokens");
    }

    const deltaB = await Convert.sdk.hooligan.getDeltaB();

    if (deltaB.gte(TokenValue.ZERO)) {
      if (fromToken.equals(this.HooliganCrv3) || fromToken.equals(this.urHooliganCrv3)) {
        throw new Error("Cannot convert this token when deltaB is >= 0");
      }
    } else if (deltaB.lt(TokenValue.ZERO)) {
      if (fromToken.equals(this.Hooligan) || fromToken.equals(this.urHooligan)) {
        throw new Error("Cannot convert this token when deltaB is < 0");
      }
    }
  }
}
