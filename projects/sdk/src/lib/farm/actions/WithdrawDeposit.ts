import { BasicPreparedResult, RunContext, Step, StepClass } from "src/classes/Workflow";
import { ethers } from "ethers";

export class WithdrawDeposit extends StepClass<BasicPreparedResult> {
  public name: string = "withdrawDeposit";

  constructor(
    public readonly _tokenIn: string,
    public readonly _gameday: ethers.BigNumberish,
    public readonly _amount: ethers.BigNumberish
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: RunContext) {
    WithdrawDeposit.sdk.debug(`[${this.name}.run()]`, {
      tokenIn: this._tokenIn,
      gamedays: this._gameday,
      amounts: this._amount
    });
    return {
      name: this.name,
      amountOut: _amountInStep,
      prepare: () => {
        WithdrawDeposit.sdk.debug(`[${this.name}.encode()]`, {
          tokenIn: this._tokenIn,
          gamedays: this._gameday,
          amounts: this._amount
        });
        return {
          target: WithdrawDeposit.sdk.contracts.hooliganhorde.address,
          callData: WithdrawDeposit.sdk.contracts.hooliganhorde.interface.encodeFunctionData("withdrawDeposit", [
            this._tokenIn, //
            this._gameday, //
            this._amount //
          ])
        };
      },
      decode: (data: string) => WithdrawDeposit.sdk.contracts.hooliganhorde.interface.decodeFunctionData("withdrawDeposit", data),
      decodeResult: (result: string) =>
        WithdrawDeposit.sdk.contracts.hooliganhorde.interface.decodeFunctionResult("withdrawDeposit", result)
    };
  }
}
