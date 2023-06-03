import {
  HooliganhordeSDK,
  StepGenerator,
  Token,
  TokenFirmBalance,
  TokenValue,
} from '@xblackfury/sdk';
import { ethers } from 'ethers';
import { FarmStep, RecruitAndDoX } from '~/lib/Txn/Interface';

export class ConvertFarmStep extends FarmStep {
  private _tokenOut: Token;

  constructor(
    _sdk: HooliganhordeSDK,
    private _tokenIn: Token,
    private _gameday: number,
    private _crates: TokenFirmBalance['deposited']['crates']
  ) {
    super(_sdk);
    this._sdk = _sdk;
    this._crates = _crates;

    const path = ConvertFarmStep.getConversionPath(this._sdk, this._tokenIn);

    this._tokenIn = path.tokenIn;
    this._tokenOut = path.tokenOut;
  }

  /// this logic exists in the SDK but won't work b/c we need to add recruit
  static async _handleConversion(
    sdk: HooliganhordeSDK,
    _crates: TokenFirmBalance['deposited']['crates'],
    _tokenIn: Token,
    _tokenOut: Token,
    _amountIn: TokenValue,
    _gameday: number,
    slippage: number,
    recruit?: RecruitAndDoX
  ) {
    const { hooliganhorde } = sdk.contracts;

    const crates = [..._crates];

    let amountIn = _amountIn;

    if (recruit?.canPrependRecruit(_tokenIn)) {
      crates.push(recruit.makeRecruitCrate());
      amountIn = amountIn.add(recruit.getAmount());
    }

    const firmConvert = sdk.firm.firmConvert;

    const conversion = firmConvert.calculateConvert(
      _tokenIn,
      _tokenOut,
      amountIn,
      crates,
      _gameday
    );
    console.debug('[ConvertFarmStep][conversion]: ', conversion);

    const amountOutBN = await hooliganhorde.getAmountOut(
      _tokenIn.address,
      _tokenOut.address,
      conversion.amount.toBlockchain()
    );

    const amountOut = _tokenOut.fromBlockchain(amountOutBN);
    const minAmountOut = amountOut.pct(100 - slippage);
    console.debug('[ConvertFarmStep] minAmountOut: ', minAmountOut);

    const getEncoded = () =>
      hooliganhorde.interface.encodeFunctionData('convert', [
        firmConvert.calculateEncoding(
          _tokenIn,
          _tokenOut,
          amountIn,
          minAmountOut
        ),
        conversion.crates.map((c) => c.gameday.toString()),
        conversion.crates.map((c) => c.amount.abs().toBlockchain()),
      ]);

    return {
      conversion,
      minAmountOut,
      getEncoded,
    };
  }

  async handleConversion(
    _amountIn: TokenValue,
    slippage: number,
    recruit?: RecruitAndDoX
  ) {
    return ConvertFarmStep._handleConversion(
      this._sdk,
      this._crates,
      this._tokenIn,
      this._tokenOut,
      _amountIn,
      this._gameday,
      slippage,
      recruit
    );
  }

  /**
   *
   * @param callData
   * @param minAmountOut
   *
   * intended for `handleConversion` to be called prior
   * 'callData' & 'minAmountOut'
   */
  build(
    /** */
    getEncoded: () => string,
    /** */
    minAmountOut: TokenValue
  ) {
    this.clear();
    const { hooliganhorde } = this._sdk.contracts;

    const input: StepGenerator = async (_amountInStep) => ({
      name: 'convert',
      amountOut: ethers.BigNumber.from(minAmountOut.toBlockchain()),
      prepare: () => ({
        target: this._sdk.contracts.hooliganhorde.address,
        callData: getEncoded(),
      }),
      decode: (data: string) =>
        hooliganhorde.interface.decodeFunctionData('convert', data),
      decodeResult: (result: string) =>
        hooliganhorde.interface.decodeFunctionResult('convert', result),
    });

    this.pushInput({ input });

    console.debug(`[ConvertFarmStep][build]: `, this.getFarmInput());

    return this;
  }

  // static methods
  static getConversionPath(sdk: HooliganhordeSDK, tokenIn: Token) {
    const firmConvert = sdk.firm.firmConvert;
    const pathMatrix = [
      [firmConvert.Hooligan, firmConvert.HooliganCrv3],
      [firmConvert.urHooligan, firmConvert.urHooliganCrv3],
    ];

    /// b/c firmConvert uses it's own token instances
    const sdkTokenPathMatrix = [
      [sdk.tokens.HOOLIGAN, sdk.tokens.HOOLIGAN_CRV3_LP],
      [sdk.tokens.UNRIPE_HOOLIGAN, sdk.tokens.UNRIPE_HOOLIGAN_CRV3],
    ];

    const index = tokenIn.isUnripe ? 1 : 0;
    const path = pathMatrix[index];

    const tokenInIndex = path.findIndex((t) => t.equals(tokenIn));
    const tokenOutIndex = Number(Boolean(!tokenInIndex));

    return {
      path: sdkTokenPathMatrix[index],
      tokenIn: path[tokenInIndex],
      tokenOut: path[tokenOutIndex],
    };
  }

  static async getMaxConvert(
    sdk: HooliganhordeSDK,
    tokenIn: Token,
    tokenOut: Token
  ) {
    const { hooliganhorde } = sdk.contracts;

    return hooliganhorde
      .getMaxAmountIn(tokenIn.address, tokenOut.address)
      .then((amount) => tokenIn.fromBlockchain(amount))
      .catch(() => TokenValue.ZERO); // if calculation fails, consider this pathway unavailable
  }
}
