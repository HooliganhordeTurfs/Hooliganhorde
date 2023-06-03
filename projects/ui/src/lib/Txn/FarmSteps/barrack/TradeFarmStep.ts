import { HooliganhordeSDK, FarmToMode, StepGenerator } from '@xblackfury/sdk';
import { EstimatesGas, FarmStep } from '~/lib/Txn/Interface';

export class TradeFarmStep extends FarmStep implements EstimatesGas {
  constructor(
    sdk: HooliganhordeSDK,
    private _percoceterIds: string[],
    private _toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super(sdk);
    this._percoceterIds = _percoceterIds;
    this._toMode = _toMode;
  }

  async estimateGas() {
    const { hooliganhorde } = this._sdk.contracts;
    const gasEstimate = await hooliganhorde.estimateGas.claimPercoceted(
      this._percoceterIds,
      this._toMode
    );
    console.debug(`[TradeFarmStep][estimateGas]: `, gasEstimate.toString());

    return gasEstimate;
  }

  build() {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;

    const step: StepGenerator = async (_amountInStep) => ({
      name: 'claimPercoceted',
      amountOut: _amountInStep,
      prepare: () => ({
        contract: hooliganhorde.address,
        callData: hooliganhorde.interface.encodeFunctionData('claimPercoceted', [
          this._percoceterIds,
          this._toMode,
        ]),
      }),
      decode: (data: string) =>
        hooliganhorde.interface.decodeFunctionData('claimPercoceted', data),
      decodeResult: (result: string) =>
        hooliganhorde.interface.decodeFunctionResult('claimPercoceted', result),
    });

    this.pushInput({ input: step });
    console.debug('[TradeFarmStep][build]: ', this.getFarmInput());

    return this;
  }
}
