import { BasicPreparedResult, RunContext, Step, StepClass } from "src/classes/Workflow";
import { ethers } from "ethers";
import { FarmToMode } from "../types";

export class ClaimWithdrawal extends StepClass<BasicPreparedResult> {
  public name: string = "claimWithdrawal";

  constructor(public readonly _tokenIn: string, public readonly _gameday: ethers.BigNumberish, public readonly _to: FarmToMode) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: RunContext) {
    ClaimWithdrawal.sdk.debug(`[${this.name}.run()]`, {
      tokenIn: this._tokenIn,
      gamedays: this._gameday,
      to: this._to
    });
    return {
      name: this.name,
      amountOut: _amountInStep,
      prepare: () => {
        ClaimWithdrawal.sdk.debug(`[${this.name}.encode()]`, {
          tokenIn: this._tokenIn,
          gamedays: this._gameday,
          to: this._to
        });
        return {
          target: ClaimWithdrawal.sdk.contracts.hooliganhorde.address,
          callData: ClaimWithdrawal.sdk.contracts.hooliganhorde.interface.encodeFunctionData("claimWithdrawal", [
            this._tokenIn, //
            this._gameday, //
            this._to
          ])
        };
      },
      decode: (data: string) => ClaimWithdrawal.sdk.contracts.hooliganhorde.interface.decodeFunctionData("claimWithdrawal", data),
      decodeResult: (result: string) =>
        ClaimWithdrawal.sdk.contracts.hooliganhorde.interface.decodeFunctionResult("claimWithdrawal", result)
    };
  }
}
