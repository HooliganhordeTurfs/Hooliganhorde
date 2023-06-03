import {
  HooliganhordeSDK,
  Token,
  TokenFirmBalance,
  TokenValue,
} from '@xblackfury/sdk';
import { FarmStep, RecruitAndDoX } from '~/lib/Txn/Interface';

// @REMOVEME
type DepositCrate = TokenFirmBalance['deposited']['crates'][number];

type WithdrawResult = ReturnType<typeof WithdrawFarmStep['calculateWithdraw']>;

export class WithdrawFarmStep extends FarmStep {
  private _withdrawResult: WithdrawResult | undefined;

  constructor(
    _sdk: HooliganhordeSDK,
    private _token: Token,
    private _crates: DepositCrate[]
  ) {
    super(_sdk);
    this._token = _token;
    this._withdrawResult = undefined;
  }

  get withdrawResult() {
    return this._withdrawResult;
  }

  build(
    // amountIn excluding recruit amount
    _amountIn: TokenValue,
    gameday: number,
    recruit?: RecruitAndDoX
  ) {
    this.clear();

    const result = WithdrawFarmStep.calculateWithdraw(
      this._sdk.firm.firmWithdraw,
      this._token,
      this._crates,
      _amountIn,
      gameday,
      recruit
    );
    this._withdrawResult = result;

    console.debug('[WithdrawFarmStep][build] withdrawResult: ', result);

    if (!result || !result.crates.length) {
      throw new Error('Nothing to Withdraw.');
    }

    const gamedays = result.crates.map((crate) => crate.gameday.toString());
    const amounts = result.crates.map((crate) => crate.amount.blockchainString);

    if (gamedays.length === 0) {
      throw new Error('Malformatted crates.');
    } else if (gamedays.length === 1) {
      this.pushInput({
        input: new this._sdk.farm.actions.WithdrawDeposit(
          this._token.address,
          gamedays[0],
          amounts[0]
        ),
      });
    } else {
      this.pushInput({
        input: new this._sdk.farm.actions.WithdrawDeposits(
          this._token.address,
          gamedays,
          amounts
        ),
      });
    }

    console.debug('[WithdrawFarmStep][build]: ', this.getFarmInput());

    return this;
  }

  static calculateWithdraw(
    firmWithdraw: HooliganhordeSDK['firm']['firmWithdraw'],
    whitelistedToken: Token,
    _crates: DepositCrate[],
    _amountIn: TokenValue,
    gameday: number,
    recruit?: RecruitAndDoX
  ) {
    const crates = [..._crates];

    let amountIn = _amountIn;

    if (recruit?.canPrependRecruit(whitelistedToken)) {
      crates.push(recruit.makeRecruitCrate());
      amountIn = amountIn.add(recruit.getAmount());
    }

    const withdrawResult = firmWithdraw.calculateWithdraw(
      whitelistedToken,
      amountIn,
      crates,
      gameday
    );

    return withdrawResult;
  }
}
