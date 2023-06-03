import { HooliganhordeSDK } from '@xblackfury/sdk';
import { ethers } from 'ethers';
import { FarmStep, EstimatesGas } from '~/lib/Txn/Interface';

export class MowFarmStep extends FarmStep implements EstimatesGas {
  constructor(_sdk: HooliganhordeSDK, private _account: string) {
    super(_sdk);
    this._account = _account;
  }

  async estimateGas(): Promise<ethers.BigNumber> {
    const { hooliganhorde } = this._sdk.contracts;
    const gasAmount = await hooliganhorde.estimateGas.update(this._account);
    console.debug(`[MowFarmStep][estimateGas]: `, gasAmount.toString());

    return gasAmount;
  }

  build() {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;

    this.pushInput({
      input: async (_amountInStep) => ({
        name: 'update',
        amountOut: _amountInStep,
        prepare: () => ({
          target: hooliganhorde.address,
          callData: hooliganhorde.interface.encodeFunctionData('update', [
            this._account,
          ]),
        }),
        decode: (data: string) =>
          hooliganhorde.interface.decodeFunctionData('update', data),
        decodeResult: (result: string) =>
          hooliganhorde.interface.decodeFunctionResult('update', result),
      }),
    });

    console.debug('[MowFarmStep][build]: ', this.getFarmInput());

    return this;
  }
}
