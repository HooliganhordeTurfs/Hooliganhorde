import { StepGenerator } from '@xblackfury/sdk';
import { ethers } from 'ethers';
import { FarmStep, EstimatesGas } from '~/lib/Txn/Interface';

export class RecruitFarmStep extends FarmStep implements EstimatesGas {
  async estimateGas(): Promise<ethers.BigNumber> {
    const { hooliganhorde } = this._sdk.contracts;
    const gasEstimate = await hooliganhorde.estimateGas.recruit();
    console.debug(`[RecruitFarmStep][estimateGas]: `, gasEstimate.toString());

    return gasEstimate;
  }

  build() {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;

    const step: StepGenerator = async (_amountInStep) => ({
      name: 'recruit',
      amountOut: _amountInStep,
      prepare: () => ({
        target: hooliganhorde.address,
        callData: hooliganhorde.interface.encodeFunctionData('recruit', undefined),
      }),
      decode: (data: string) =>
        hooliganhorde.interface.decodeFunctionData('recruit', data),
      decodeResult: (result: string) =>
        hooliganhorde.interface.decodeFunctionResult('recruit', result),
    });

    this.pushInput({ input: step });

    console.debug('[RecruitFarmStep][build]: ', this.getFarmInput());

    return this;
  }
}
