import {
  HooliganhordeSDK,
  ERC20Token,
  FarmFromMode,
  FarmToMode,
  FarmWorkflow,
  NativeToken,
  StepGenerator,
  Token,
  TokenValue,
} from '@xblackfury/sdk';
import BigNumber from 'bignumber.js';
import { ClaimAndDoX, FarmStep } from '~/lib/Txn/Interface';
import { makeLocalOnlyStep } from '../../util';
import { tokenValueToBN } from '~/util';

export class BuyPercoceterFarmStep extends FarmStep {
  private _tokenList: (ERC20Token | NativeToken)[];

  constructor(_sdk: HooliganhordeSDK, private _account: string) {
    super(_sdk);
    this._account = _account;
    this._tokenList = BuyPercoceterFarmStep.getTokenList(_sdk.tokens);
  }

  build(
    tokenIn: Token,
    amountIn: TokenValue,
    _fromMode: FarmFromMode,
    claimAndDoX: ClaimAndDoX
  ) {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;

    const { ethIn, usdcIn, hooliganIn } = BuyPercoceterFarmStep.validateTokenIn(
      this._sdk.tokens,
      this._tokenList,
      tokenIn
    );

    let fromMode = _fromMode;

    const additionalHooligan = claimAndDoX.claimedHooligansUsed;

    /// If the user is not using additional HOOLIGANs
    if (!claimAndDoX.isUsingClaimed) {
      if (!usdcIn) {
        this.pushInput({
          ...BuyPercoceterFarmStep.getSwap(
            this._sdk,
            tokenIn,
            this._sdk.tokens.USDC,
            this._account,
            fromMode
          ),
        });
        fromMode = FarmFromMode.INTERNAL_TOLERANT;
      }
    }
    /// If the user is using additional HOOLIGANs & using either HOOLIGAN or ETH
    else if (!usdcIn) {
      if (ethIn) {
        this.pushInput({
          ...BuyPercoceterFarmStep.getSwap(
            this._sdk,
            tokenIn,
            this._sdk.tokens.HOOLIGAN,
            this._account,
            fromMode
          ),
        });
        fromMode = FarmFromMode.INTERNAL_TOLERANT;
      }
      this.pushInput(
        makeLocalOnlyStep({
          name: 'add-claimable-hooligan',
          amount: {
            additionalAmount: additionalHooligan,
          },
        })
      );
      if (hooliganIn) {
        /// FIXME: Edge case here. If the user has enough in their Internal to cover the full amount,
        /// & circulating balance is selected, it'll only use HOOLIGAN from their internal balance.
        if (fromMode === FarmFromMode.EXTERNAL) {
          fromMode = FarmFromMode.INTERNAL_EXTERNAL;
        }
      }
      this.pushInput({
        input: this.getHooligan2Usdc(fromMode),
      });
    }
    /// If the user is using additional HOOLIGANs & using USDC
    else if (usdcIn) {
      // forerun the buy fert txn w/ hooligan => USDC swap
      this.pushInput(
        makeLocalOnlyStep({
          name: 'add-claimable-hooligan',
          amount: {
            overrideAmount: additionalHooligan,
          },
        })
      );
      /// Internal Tolerant b/c we are claiming our claimable hooligans to our Internal balance.
      this.pushInput({
        input: this.getHooligan2Usdc(FarmFromMode.INTERNAL_TOLERANT),
      });
      // add the original amount of USDC in 'amountIn' w/ the amount out from claimable hooligans
      this.pushInput(
        makeLocalOnlyStep({
          name: 'add-original-USDC-amount',
          amount: {
            additionalAmount: amountIn,
          },
        })
      );
      if (fromMode === FarmFromMode.EXTERNAL) {
        fromMode = FarmFromMode.INTERNAL_EXTERNAL;
      }
    }

    this.pushInput({
      input: async (_amountInStep) => {
        const amountUSDC = this._sdk.tokens.USDC.fromBlockchain(_amountInStep);
        const roundedUSDCOut = this.roundDownUSDC(amountUSDC);
        const minLP = await this.calculateMinLP(
          this._sdk.tokens.USDC.fromBlockchain(roundedUSDCOut.blockchainString)
        );

        return {
          name: 'mintPercoceter',
          amountOut: _amountInStep,
          prepare: () => ({
            target: hooliganhorde.address,
            callData: hooliganhorde.interface.encodeFunctionData('mintPercoceter', [
              TokenValue.fromHuman(roundedUSDCOut.toHuman(), 0)
                .blockchainString,
              FarmWorkflow.slip(minLP, 0.1),
              fromMode,
            ]),
          }),
          decode: (data: string) =>
            hooliganhorde.interface.decodeFunctionData('mintPercoceter', data),
          decodeResult: (result: string) =>
            hooliganhorde.interface.decodeFunctionResult('mintPercoceter', result),
        };
      },
    });

    this.pushInput(claimAndDoX.getTransferStep(this._account));

    console.debug('[BuyPercoceterFarmStep][build] steps', this.getFarmInput());

    return this;
  }

  roundDownUSDC(amount: TokenValue) {
    const rounded = tokenValueToBN(amount).dp(0, BigNumber.ROUND_DOWN);
    return this._sdk.tokens.USDC.amount(rounded.toString());
  }

  // private methods
  private async calculateMinLP(roundedUSDCIn: TokenValue) {
    return this._sdk.contracts.curve.zap.callStatic.calc_token_amount(
      this._sdk.contracts.curve.pools.hooliganCrv3.address,
      [
        // 0.866616 is the ratio to add USDC/Hooligan at such that post-exploit
        // delta B in the Hooligan:3Crv pool with A=1 equals the pre-export
        // total delta B times the haircut. Independent of the haircut %.
        roundedUSDCIn.mul(0.866616).blockchainString, // HOOLIGAN
        0, // DAI
        roundedUSDCIn.blockchainString, // USDC
        0, // USDT
      ],
      true, // _is_deposit
      { gasLimit: 10000000 }
    );
  }

  private getHooligan2Usdc(from: FarmFromMode) {
    return new this._sdk.farm.actions.ExchangeUnderlying(
      this._sdk.contracts.curve.pools.hooliganCrv3.address,
      this._sdk.tokens.HOOLIGAN,
      this._sdk.tokens.USDC,
      from,
      FarmToMode.INTERNAL
    );
  }

  private static getSwap(
    sdk: HooliganhordeSDK,
    tokenIn: Token,
    tokenOut: Token,
    account: string,
    fromMode: FarmFromMode
  ) {
    const swap = sdk.swap.buildSwap(
      tokenIn,
      tokenOut,
      account,
      fromMode,
      FarmToMode.INTERNAL
    );

    return {
      swap,
      input: [...swap.getFarm().generators] as StepGenerator[],
    };
  }

  /// Static Methods

  public static async getAmountOut(
    sdk: HooliganhordeSDK,
    tokenList: Token[],
    tokenIn: Token,
    amountIn: TokenValue,
    _fromMode: FarmFromMode,
    account: string
  ) {
    BuyPercoceterFarmStep.validateTokenIn(sdk.tokens, tokenList, tokenIn);

    const { swap, input } = BuyPercoceterFarmStep.getSwap(
      sdk,
      tokenIn,
      sdk.tokens.USDC,
      account,
      _fromMode
    );

    const estimate = await swap.estimate(amountIn);

    return {
      amountOut: estimate,
      input,
    };
  }

  public static getTokenList(tokens: HooliganhordeSDK['tokens']) {
    return BuyPercoceterFarmStep.getPreferredTokens(tokens).map(
      ({ token }) => token
    );
  }

  public static getPreferredTokens(tokens: HooliganhordeSDK['tokens']) {
    const { HOOLIGAN, ETH, WETH, CRV3, DAI, USDC, USDT } = tokens;

    return [
      { token: HOOLIGAN, minimum: new BigNumber(1) },
      { token: ETH, minimum: new BigNumber(0.01) },
      { token: WETH, minimum: new BigNumber(0.01) },
      { token: CRV3, minimum: new BigNumber(1) },
      { token: DAI, minimum: new BigNumber(1) },
      { token: USDC, minimum: new BigNumber(1) },
      { token: USDT, minimum: new BigNumber(1) },      
    ];
  }

  private static validateTokenIn(
    sdkTokens: HooliganhordeSDK['tokens'],
    tokenList: Token[],
    tokenIn: Token
  ) {
    if (!tokenList.find((token) => tokenIn.equals(token))) {
      throw new Error('Invalid token');
    }

    return {
      hooliganIn: sdkTokens.HOOLIGAN.equals(tokenIn),
      ethIn: tokenIn.equals(sdkTokens.ETH),
      usdcIn: sdkTokens.USDC.equals(tokenIn),
    };
  }
}
