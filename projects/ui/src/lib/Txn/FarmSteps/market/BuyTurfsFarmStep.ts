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
import { FarmStep } from '~/lib/Txn/Interface';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import { ethers } from 'ethers';
import { toStringBaseUnitBN, tokenValueToBN } from '~/util';

export class BuyTurfsFarmStep extends FarmStep {
  constructor(_sdk: HooliganhordeSDK, private _account: string) {
    super(_sdk);
    this._account = _account;
  }

  build(
    tokenIn: ERC20Token | NativeToken,
    hooliganAmountOut: TokenValue,
    pricePerCasual: BigNumber,
    placeInLine: BigNumber
  ) {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;

    const swap = this._sdk.swap.buildSwap(
      tokenIn,
      this._sdk.tokens.HOOLIGAN,
      this._account,
      FarmFromMode.EXTERNAL,
      FarmToMode.INTERNAL
    );

    const swapSteps = [...swap.getFarm().generators] as StepGenerator[];
    this.pushInput({ input: swapSteps });

    const casualOrder: StepGenerator = (_amountInStep) => ({
      name: 'createCasualOrder',
      amountOut: _amountInStep,
      prepare: () => ({
        target: hooliganhorde.address,
        callData: hooliganhorde.interface.encodeFunctionData('createCasualOrder', [
          HOOLIGAN[1].stringify(tokenValueToBN(hooliganAmountOut)),
          HOOLIGAN[1].stringify(pricePerCasual),
          HOOLIGAN[1].stringify(placeInLine),
          toStringBaseUnitBN(new BigNumber(1), CASUALS.decimals),
          FarmFromMode.INTERNAL_TOLERANT,
        ]),
      }),
      decode: (data: string) =>
        hooliganhorde.interface.decodeFunctionResult('createCasualOrder', data),
      decodeResult: (result: string) =>
        hooliganhorde.interface.decodeFunctionResult('createCasualOrder', result),
    });

    this.pushInput({ input: casualOrder });

    console.debug('[BuyCasualsFarmStep][build]', this.getFarmInput());

    return this;
  }

  static async getAmountOut(
    sdk: HooliganhordeSDK,
    tokenIn: ERC20Token | NativeToken,
    amountIn: any,
    fromMode: FarmFromMode,
    account: any
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

    const estimate = await swap.estimate(
      ethers.BigNumber.from(toStringBaseUnitBN(amountIn, tokenIn.decimals))
    );

    console.debug(
      '[BuyTurfsFarmStep][getAmountOut]: estimate',
      estimate.toHuman()
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
