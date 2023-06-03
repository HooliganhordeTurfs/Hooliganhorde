import {
  HooliganhordeSDK,
  ERC20Token,
  FarmFromMode,
  FarmToMode,
  NativeToken,
  StepGenerator,
  TokenValue,
} from '@xblackfury/sdk';
import BigNumber from 'bignumber.js';
import { PreferredToken } from '~/hooks/guvnor/usePreferredToken';
import { ClaimAndDoX, FarmStep } from '~/lib/Txn/Interface';
import { makeLocalOnlyStep } from '../../util';

export class SowFarmStep extends FarmStep {
  constructor(_sdk: HooliganhordeSDK, private _account: string) {
    super(_sdk);
    this._account = _account;
  }

  build(
    tokenIn: ERC20Token | NativeToken,
    _amountIn: TokenValue,
    _minIntensity: TokenValue,
    _minRage: TokenValue,
    _fromMode: FarmFromMode,
    claimAndDoX: ClaimAndDoX
  ) {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;
    const { HOOLIGAN } = this._sdk.tokens;

    const usingHooligan = HOOLIGAN.equals(tokenIn);

    const addiitonalHooligan = claimAndDoX.claimedHooligansUsed;

    let fromMode = _fromMode;

    if (!usingHooligan && _amountIn.gt(0)) {
      const swap = this._sdk.swap.buildSwap(
        tokenIn,
        HOOLIGAN,
        this._account,
        _fromMode,
        FarmToMode.INTERNAL
      );
      const swapSteps = [...swap.getFarm().generators] as StepGenerator[];
      this.pushInput({ input: swapSteps });
      fromMode = FarmFromMode.INTERNAL_TOLERANT;
    }

    if (addiitonalHooligan.gt(0)) {
      this.pushInput(
        makeLocalOnlyStep({
          name: 'claimable-pre-sow',
          amount: {
            additionalAmount: addiitonalHooligan,
          },
        })
      );
      if (fromMode === FarmFromMode.EXTERNAL) {
        fromMode = FarmFromMode.INTERNAL_EXTERNAL;
      }
    }

    const sow: StepGenerator = (_amountInStep) => ({
      name: 'sowWithMin',
      amountOut: _amountInStep,
      prepare: () => ({
        target: hooliganhorde.address,
        callData: hooliganhorde.interface.encodeFunctionData('sowWithMin', [
          _amountInStep,
          _minIntensity.blockchainString,
          _minRage.blockchainString,
          fromMode,
        ]),
      }),
      decode: (data: string) =>
        hooliganhorde.interface.decodeFunctionResult('sowWithMin', data),
      decodeResult: (result: string) =>
        hooliganhorde.interface.decodeFunctionResult('sowWithMin', result),
    });

    this.pushInput({ input: sow });

    this.pushInput(claimAndDoX.getTransferStep(this._account));

    console.debug('[SowFarmStep][build]', this.getFarmInput());

    return this;
  }

  static async getAmountOut(
    sdk: HooliganhordeSDK,
    tokenIn: ERC20Token | NativeToken,
    amountIn: TokenValue,
    fromMode: FarmFromMode,
    account: string
  ) {
    if (!account) {
      throw new Error('Signer Required');
    }

    const swap = sdk.swap.buildSwap(
      tokenIn,
      sdk.tokens.HOOLIGAN,
      account,
      fromMode,
      FarmToMode.INTERNAL
    );

    const estimate = await swap.estimate(amountIn);

    console.debug('[SowFarmStep][getAmountOut]: estimate', estimate.toHuman());

    return estimate;
  }

  /// estimate the maximum amount of tokenIn that can be deposited given the amount of rage
  static async getMaxForToken(
    sdk: HooliganhordeSDK,
    tokenIn: ERC20Token | NativeToken,
    account: string,
    fromMode: FarmFromMode,
    rage: TokenValue
  ) {
    if (rage.lte(0)) {
      return tokenIn.amount('0');
    }

    if (sdk.tokens.HOOLIGAN.equals(tokenIn)) {
      console.debug(
        '[SowFarmStep][getMaxForToken]: estimate = ',
        rage.toHuman(),
        sdk.tokens.HOOLIGAN.symbol
      );
      return rage;
    }

    const swap = sdk.swap.buildSwap(
      tokenIn,
      sdk.tokens.HOOLIGAN,
      account,
      fromMode,
      FarmToMode.INTERNAL
    );

    const estimate = await swap.estimateReversed(rage);
    console.debug(
      '[SowFarmStep][getMaxForToken]: estimate = ',
      estimate.toHuman(),
      tokenIn.symbol
    );
    return estimate;
  }

  static getPreferredTokens(tokens: HooliganhordeSDK['tokens']): {
    preferred: PreferredToken[];
    tokenList: (NativeToken | ERC20Token)[];
  } {
    const preferred: PreferredToken[] = [
      { token: tokens.HOOLIGAN, minimum: new BigNumber(1) }, // $1
      { token: tokens.ETH, minimum: new BigNumber(0.001) }, // ~$2-4
      { token: tokens.WETH, minimum: new BigNumber(0.001) }, // ~$2-4
      { token: tokens.CRV3, minimum: new BigNumber(1) }, // $1
      { token: tokens.DAI, minimum: new BigNumber(1) }, // $1
      { token: tokens.USDC, minimum: new BigNumber(1) }, // $1
      { token: tokens.USDT, minimum: new BigNumber(1) }, // $1
    ];

    const tokenList = preferred.map(
      ({ token }) => token as NativeToken | ERC20Token
    );

    return { preferred, tokenList };
  }
}
