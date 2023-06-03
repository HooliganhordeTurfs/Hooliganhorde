import {
  HooliganhordeSDK,
  ERC20Token,
  FarmFromMode,
  FarmToMode,
  Token,
} from '@xblackfury/sdk';
import { ethers } from 'ethers';
import { EstimatesGas, FarmStep } from '~/lib/Txn/Interface';

export class ClaimFarmStep extends FarmStep implements EstimatesGas {
  constructor(
    _sdk: HooliganhordeSDK,
    private _tokenIn: Token,
    private _gamedays: ethers.BigNumberish[]
  ) {
    super(_sdk);
    this._tokenIn = _tokenIn;
    this._gamedays = _gamedays;
  }

  async estimateGas() {
    const { hooliganhorde } = this._sdk.contracts;
    let gasEstimate: ethers.BigNumber;

    if (this._gamedays.length === 1) {
      gasEstimate = await hooliganhorde.estimateGas.claimWithdrawal(
        this._tokenIn.address,
        this._gamedays[0],
        FarmToMode.INTERNAL
      );
    }
    gasEstimate = await hooliganhorde.estimateGas.claimWithdrawals(
      this._tokenIn.address,
      this._gamedays,
      FarmToMode.INTERNAL
    );
    console.debug(`[ClaimFarmStep][estimateGas]: `, gasEstimate.toString());

    return gasEstimate;
  }

  build(tokenOut: ERC20Token, toMode: FarmToMode = FarmToMode.INTERNAL) {
    this.clear();

    const tokenIn = this._tokenIn as ERC20Token;

    const removeLiquidity = tokenIn.isLP && !tokenIn.equals(tokenOut);
    const pool = removeLiquidity
      ? this._sdk.pools.getPoolByLPToken(tokenIn)
      : undefined;

    const claimToMode = removeLiquidity ? FarmToMode.INTERNAL : toMode;

    if (this._gamedays.length === 1) {
      const withdrawalsStep = new this._sdk.farm.actions.ClaimWithdrawal(
        tokenIn.address,
        this._gamedays[0],
        claimToMode
      );
      this.pushInput({ input: withdrawalsStep });
      console.debug(
        '[ClaimFarmStep][build/strategy] claimWithdrawals',
        withdrawalsStep
      );
    } else {
      const withdrawalStep = new this._sdk.farm.actions.ClaimWithdrawals(
        tokenIn.address,
        this._gamedays,
        claimToMode
      );
      this.pushInput({ input: withdrawalStep });
      console.debug(
        '[ClaimFarmStep][build/strategy] claimWithdrawals',
        withdrawalStep
      );
    }

    if (removeLiquidity && pool) {
      const removeStep = new this._sdk.farm.actions.RemoveLiquidityOneToken(
        pool.address,
        this._sdk.contracts.curve.registries.metaFactory.address,
        tokenOut.address,
        FarmFromMode.INTERNAL_TOLERANT,
        toMode
      );
      this.pushInput({ input: removeStep });
      console.debug('[ClaimFarmStep][build] removing liquidity', removeStep);
    }

    console.debug('[ClaimFarmStep][getSteps]: ', this.getFarmInput());

    return this;
  }
}
