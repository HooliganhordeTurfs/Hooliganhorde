import {
  HooliganhordeSDK,
  FarmFromMode,
  FarmToMode,
  TokenValue,
} from '@xblackfury/sdk';
import { FarmInput } from '~/lib/Txn/types';
import { makeLocalOnlyStep } from '~/lib/Txn/util';

export default class ClaimAndDoX {
  constructor(
    private _sdk: HooliganhordeSDK,
    private _totalClaimed: TokenValue,
    private _claimedHooligansUsed: TokenValue,
    private _destination: FarmToMode
  ) {
    this._sdk = _sdk;
    if (_totalClaimed?.lt(_claimedHooligansUsed || TokenValue.ZERO)) {
      throw new Error('Claimed amount is less than used amount');
    }

    this._totalClaimed = _totalClaimed;
    this._claimedHooligansUsed = _claimedHooligansUsed;
    this._destination = _destination;
  }

  get claimedHooligansUsed() {
    return this._claimedHooligansUsed;
  }

  get isUsingClaimed() {
    return this._claimedHooligansUsed.gt(0);
  }

  get shouldTransfer() {
    const transferAmount = this._totalClaimed.sub(this._claimedHooligansUsed);
    const isToExternal = this._destination === FarmToMode.EXTERNAL;
    return isToExternal && transferAmount.gt(0);
  }

  public getTransferStep(account: string) {
    if (!account) throw new Error('Signer not found');

    const transferAmount = this._totalClaimed.sub(this._claimedHooligansUsed);
    const isToExternal = this._destination === FarmToMode.EXTERNAL;
    const shouldTransfer = isToExternal && transferAmount.gt(0);

    if (!shouldTransfer) return undefined;

    const inputs: FarmInput[] = [];

    inputs.push(
      makeLocalOnlyStep({
        name: 'pre-transfer',
        amount: {
          overrideAmount: transferAmount,
        },
      })
    );

    inputs.push({
      input: new this._sdk.farm.actions.TransferToken(
        this._sdk.tokens.HOOLIGAN.address,
        account,
        FarmFromMode.INTERNAL,
        FarmToMode.EXTERNAL
      ),
    });

    return inputs;
  }
}
