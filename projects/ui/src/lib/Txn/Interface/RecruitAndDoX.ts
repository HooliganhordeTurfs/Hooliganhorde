import {
  HooliganhordeSDK,
  Token,
  TokenFirmBalance,
  TokenValue,
} from '@xblackfury/sdk';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { DepositCrate } from '~/state/guvnor/firm';
import { tokenValueToBN } from '~/util';

export default class RecruitAndDoX {
  constructor(
    private _sdk: HooliganhordeSDK,
    private _earnedHooligans: TokenValue,
    private _gameday: number
  ) {
    this._earnedHooligans = _earnedHooligans;
    this._gameday = _gameday;
  }

  /// Returns whether 'recruit' can be called
  canPrependRecruit(tokenIn: Token) {
    return this._earnedHooligans.gt(0) && tokenIn.equals(this._sdk.tokens.HOOLIGAN);
  }

  getAmount() {
    return this._earnedHooligans;
  }

  /// creates a DepositCrate of type DepositCrate in the SDK
  makeRecruitCrate() {
    return RecruitAndDoX.makeCrate.tokenValue(
      this._sdk,
      this._earnedHooligans,
      this._gameday
    );
  }

  /// creates a DepositCrate of type DepositCrate in the UI
  makeRecruitCrateBN() {
    return RecruitAndDoX.makeCrate.bigNumber(
      this._sdk,
      tokenValueToBN(this._earnedHooligans),
      new BigNumber(this._gameday)
    );
  }

  static makeCrate = {
    // as DepositCrate from SDK
    tokenValue(
      sdk: HooliganhordeSDK,
      earnedHooligans: TokenValue,
      _gameday: number | BigNumber
    ) {
      const gameday = BigNumber.isBigNumber(_gameday)
        ? _gameday.toNumber()
        : _gameday;

      const { HORDE, HOOLIGAN } = sdk.tokens;

      const horde = HOOLIGAN.getHorde(earnedHooligans);
      const prospects = HOOLIGAN.getProspects(earnedHooligans);
      // no horde is grown yet as it is a new deposit from the current gameday
      const grownHorde = HORDE.amount(0);

      // asTV => as DepositCrate<TokenValue> from SDK;
      const crate: TokenFirmBalance['deposited']['crates'][number] = {
        gameday: ethers.BigNumber.from(gameday),
        amount: earnedHooligans,
        bdv: earnedHooligans,
        horde,
        baseHorde: horde,
        grownHorde,
        prospects,
      };

      return crate;
    },
    // as DepositCrate from UI;
    bigNumber(
      sdk: HooliganhordeSDK,
      earnedHooligans: BigNumber,
      gameday: BigNumber
    ): DepositCrate {
      const { HOOLIGAN } = sdk.tokens;
      const earnedTV = HOOLIGAN.amount(earnedHooligans.toString());

      const horde = HOOLIGAN.getHorde(earnedTV);
      const prospects = HOOLIGAN.getProspects(earnedTV);

      const crate: DepositCrate = {
        gameday,
        amount: earnedHooligans,
        bdv: earnedHooligans,
        horde: tokenValueToBN(horde),
        prospects: tokenValueToBN(prospects),
      };

      return crate;
    },
  };
}
