import {
  HooliganhordeSDK,
  ERC20Token,
  FarmFromMode,
  FarmToMode,
  StepGenerator,
  Token,
  TokenValue,
} from '@xblackfury/sdk';
import { ClaimAndDoX, FarmStep } from '~/lib/Txn/Interface';
import { makeLocalOnlyStep } from '~/lib/Txn/util';

/**
 * Deposit scenarios:
 *
 * FIRM:HOOLIGAN
 * : ETH => WETH => USDT => HOOLIGAN (+ cHOOLIGAN) ==> FIRM:HOOLIGAN
 * : HOOLIGAN (+ cHOOLIGAN) => FIRM:HOOLIGAN
 *
 * FIRM:HOOLIGAN_CRV3_LP
 * : HOOLIGAN + cHOOLIGAN => HOOLIGAN_CRV3_LP => FIRM:HOOLIGAN_CRV3_LP
 *
 * : ETH => WETH => USDT => CRV3 => HOOLIGAN_CRV3_LP
 * : WETH => USDT => CRV3 => HOOLIGAN_CRV3_LP
 * : CRV3_Underlying => CRV3 => HOOLIGAN_CRV3_LP
 * : CRV3 => HOOLIGAN_CRV3_LP
 * : HOOLIGAN_CRV3_LP => HOOLIGAN_CRV3_LP
 *
 * FIRM:UR_HOOLIGAN
 *  : HOOLIGAN => UR_HOOLIGAN
 *
 * FIRM:UR_HOOLIGAN_CRV3_LP
 * : UR_HOOLIGAN_CRV3_LP => UR_HOOLIGAN_CRV3_LP
 */

export class DepositFarmStep extends FarmStep {
  constructor(_sdk: HooliganhordeSDK, private _target: ERC20Token) {
    super(_sdk);
    this._target = _target;
  }

  build(
    tokenIn: Token,
    amountIn: TokenValue,
    fromMode: FarmFromMode,
    account: string,
    claimAndDoX: ClaimAndDoX
  ) {
    this.clear();
    /**
     * TODO: Find a better way to do this... maybe use a graph?
     */
    const { HOOLIGAN } = this._sdk.tokens;

    if (claimAndDoX.claimedHooligansUsed.lte(0) && amountIn.lte(0)) {
      throw new Error('No amount');
    }

    // If we're not using claimed Hooligans or if we are depositing unripe assets,
    // we can just deposit as normal
    if (claimAndDoX.claimedHooligansUsed.lte(0) || tokenIn.isUnripe) {
      if (this._target.isUnripe && !tokenIn.equals(this._target)) {
        throw new Error('Depositing with non-unripe assets is not supported');
      }
      const deposit = this._sdk.firm.buildDeposit(this._target, account);
      deposit.setInputToken(tokenIn, fromMode);
      this.pushInput({
        input: [...deposit.workflow.generators] as StepGenerator[],
      });

      console.debug('[DepositStrategy][build]: ', this.getFarmInput());
      return this;
    }

    const claimedHooligansUsed = claimAndDoX.claimedHooligansUsed;
    const isTargetHooligan = HOOLIGAN.equals(this._target);
    const isInputHooligan = HOOLIGAN.equals(tokenIn);

    // If we are depositing into FIRM:HOOLIGAN
    if (isTargetHooligan) {
      let _from: FarmFromMode = fromMode;
      // If tokenIn !== HOOLIGAN, we need to swap tokenIn => HOOLIGAN
      if (!isInputHooligan) {
        const swap = this._sdk.swap.buildSwap(
          tokenIn,
          this._target,
          account,
          _from,
          FarmToMode.INTERNAL
        );
        this.pushInput({
          input: [...swap.getFarm().generators] as StepGenerator[],
        });
        _from = FarmFromMode.INTERNAL_TOLERANT;
      } else if (_from === FarmFromMode.EXTERNAL) {
        _from = FarmFromMode.INTERNAL_EXTERNAL;
      }
      // fore-run the deposit of claimed hooligans w/ the claimed Hooligans used
      // If the input is HOOLIGAN, we add claimableHooligansUsed, otherwise we override
      this.pushInput(
        makeLocalOnlyStep({
          name: 'deposit-claimed-hooligans',
          amount: {
            additionalAmount: !isInputHooligan ? claimedHooligansUsed : undefined,
            overrideAmount: isInputHooligan
              ? claimedHooligansUsed.add(amountIn)
              : undefined,
          },
        })
      );

      /// Deposit HOOLIGAN into FIRM:HOOLIGAN
      /// at this point, we have either swapped tokenIn => HOOLIGAN or tokenIn === HOOLIGAN
      const deposit = this._sdk.firm.buildDeposit(this._target, account);
      deposit.setInputToken(HOOLIGAN, _from);
      this.pushInput({
        input: [...deposit.workflow.generators] as StepGenerator[],
      });
    }
    // If the target is NOT HOOLIGAN & the input token is HOOLIGAN,
    // we deposit HOOLIGAN + cHOOLIGAN as a single deposit for the target
    else if (isInputHooligan) {
      const deposit = this._sdk.firm.buildDeposit(this._target, account);
      deposit.setInputToken(tokenIn, FarmFromMode.INTERNAL_EXTERNAL);

      this.pushInput(
        makeLocalOnlyStep({
          name: 'pre-deposit-hooligan-and-claimed-hooligans',
          amount: {
            overrideAmount: claimedHooligansUsed.add(amountIn),
          },
        })
      );
      this.pushInput({
        input: [...deposit.workflow.generators] as StepGenerator[],
      });
    }
    // If the target is not HOOLIGAN, instead of swapping claimed HOOLIGAN for CRV3, we opt for 2 deposits
    else {
      const deposit = this._sdk.firm.buildDeposit(this._target, account);
      const depositClaimed = this._sdk.firm.buildDeposit(this._target, account);

      deposit.setInputToken(tokenIn, fromMode);
      /// we claim all hooligans to 'INTERNAL' first
      depositClaimed.setInputToken(HOOLIGAN, FarmFromMode.INTERNAL_TOLERANT);
      this.pushInput({
        input: [...deposit.workflow.generators] as StepGenerator[],
      });

      // fore-run the deposit of claimed hooligans w/ the claimed Hooligans used
      this.pushInput(
        makeLocalOnlyStep({
          name: 'deposit-claimed-hooligans',
          amount: {
            overrideAmount: claimedHooligansUsed,
          },
        })
      );
      this.pushInput({
        input: [...depositClaimed.workflow.generators] as StepGenerator[],
      });
    }

    // add transfer step if needed
    this.pushInput(claimAndDoX.getTransferStep(account));

    console.debug('[DepositStrategy][build]: ', this.getFarmInput());
    return this;
  }

  // Static methods
  public static async getAmountOut(
    sdk: HooliganhordeSDK,
    _account: string | undefined,
    tokenIn: Token,
    amountIn: TokenValue,
    target: Token,
    fromMode: FarmFromMode
  ) {
    const account = _account || (await sdk.getAccount());

    if (!account) {
      throw new Error('Signer required');
    }

    const deposit = sdk.firm.buildDeposit(target, account);
    deposit.setInputToken(tokenIn, fromMode);

    const estimate = deposit.estimate(amountIn);

    if (!estimate) {
      throw new Error(
        `Depositing ${target.symbol} to the Firm via ${tokenIn.symbol} is currently unsupported.`
      );
    }
    console.debug('[DepositFarmStep][getAmoutOut] estimate = ', estimate);

    return estimate;
  }
}
