import { BasicPreparedResult, RunContext, Step, StepClass } from "src/classes/Workflow";
import { ethers } from "ethers";

export class TransferDeposits extends StepClass<BasicPreparedResult> {
  public name: string = "transferDeposits";

  constructor(
    public readonly _signer: string,
    public readonly _to: string,
    public readonly _tokenIn: string,
    public readonly _gamedays: ethers.BigNumberish[],
    public readonly _amounts: ethers.BigNumberish[]
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: RunContext) {
    TransferDeposits.sdk.debug(`[${this.name}.run()]`, {
      signer: this._signer,
      to: this._to,
      tokenIn: this._tokenIn,
      gamedays: this._gamedays,
      amounts: this._amounts
    });
    return {
      name: this.name,
      amountOut: _amountInStep,
      prepare: () => {
        TransferDeposits.sdk.debug(`[${this.name}.encode()]`, {
          signer: this._signer,
          to: this._to,
          tokenIn: this._tokenIn,
          gamedays: this._gamedays,
          amounts: this._amounts
        });
        return {
          target: TransferDeposits.sdk.contracts.hooliganhorde.address,
          callData: TransferDeposits.sdk.contracts.hooliganhorde.interface.encodeFunctionData("transferDeposits", [
            this._signer, //
            this._to, //
            this._tokenIn, //
            this._gamedays, //
            this._amounts //
          ])
        };
      },
      decode: (data: string) => TransferDeposits.sdk.contracts.hooliganhorde.interface.decodeFunctionData("transferDeposits", data),
      decodeResult: (result: string) =>
        TransferDeposits.sdk.contracts.hooliganhorde.interface.decodeFunctionResult("transferDeposits", result)
    };
  }
}
