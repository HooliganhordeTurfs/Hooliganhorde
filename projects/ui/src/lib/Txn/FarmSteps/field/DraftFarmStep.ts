import { HooliganhordeSDK, FarmToMode, StepGenerator } from '@xblackfury/sdk';
import { EstimatesGas, FarmStep } from '~/lib/Txn/Interface';

export class DraftFarmStep extends FarmStep implements EstimatesGas {
  constructor(
    _sdk: HooliganhordeSDK,

    private _turfIds: string[]
  ) {
    super(_sdk);
    this._turfIds = _turfIds;
  }

  async estimateGas() {
    const { hooliganhorde } = this._sdk.contracts;
    const gasEstimate = await hooliganhorde.estimateGas.draft(
      this._turfIds,
      FarmToMode.INTERNAL
    );
    console.debug(`[DraftFarmStep][estimateGas]: `, gasEstimate.toString());

    return gasEstimate;
  }

  build(toMode: FarmToMode = FarmToMode.INTERNAL) {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;

    const step: StepGenerator = async (_amountInStep) => ({
      name: 'draft',
      amountOut: _amountInStep,
      prepare: () => ({
        target: hooliganhorde.address,
        callData: hooliganhorde.interface.encodeFunctionData('draft', [
          this._turfIds,
          toMode,
        ]),
      }),
      decode: (data: string) =>
        hooliganhorde.interface.decodeFunctionData('draft', data),
      decodeResult: (result: string) =>
        hooliganhorde.interface.decodeFunctionResult('draft', result),
    });

    this.pushInput({ input: step });
    console.debug('[DraftFarmStep][build]: ', this.getFarmInput());

    return this;
  }
}
