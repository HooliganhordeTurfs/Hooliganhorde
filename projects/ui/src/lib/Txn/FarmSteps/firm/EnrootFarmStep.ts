import { HooliganhordeSDK, Token } from '@xblackfury/sdk';
import BigNumber from 'bignumber.js';
import { EstimatesGas, FarmStep } from '~/lib/Txn/Interface';
import { DepositCrate, GuvnorFirmBalance } from '~/state/guvnor/firm';
import { TokenMap } from '~/constants';

enum EnrootType {
  DEPOSIT = 'DEPOSIT',
  DEPOSITS = 'DEPOSITS',
}

export class EnrootFarmStep extends FarmStep implements EstimatesGas {
  constructor(
    _sdk: HooliganhordeSDK,
    private _crates: Record<string, DepositCrate[]>
  ) {
    super(_sdk);
    this._crates = _crates;
  }

  async estimateGas() {
    const { hooliganhorde } = this._sdk.contracts;
    const gasEstimate = await hooliganhorde.estimateGas.farm(
      Object.values(this._getEncoded()).reduce<string[]>(
        (prev, curr) => [...prev, ...curr],
        []
      )
    );
    console.debug(`[EnrootFarmStep][estimateGas]: `, gasEstimate.toString());

    return gasEstimate;
  }

  build() {
    this.clear();

    const { hooliganhorde } = this._sdk.contracts;

    Object.entries(this._getEncoded()).forEach(([k, callDatas]) => {
      const key = k as EnrootType;
      if (key === EnrootType.DEPOSIT) {
        callDatas.forEach((callData) => {
          this.pushInput({
            input: async (_amountInStep) => ({
              name: 'enrootDeposit',
              amountOut: _amountInStep,
              prepare: () => ({
                target: hooliganhorde.address,
                callData,
              }),
              decode: (data: string) =>
                hooliganhorde.interface.decodeFunctionData('enrootDeposit', data),
              decodeResult: (result: string) =>
                hooliganhorde.interface.decodeFunctionResult(
                  'enrootDeposit',
                  result
                ),
            }),
          });
        });
      } else if (key === EnrootType.DEPOSITS) {
        callDatas.forEach((callData) => {
          this.pushInput({
            input: async (_amountInStep) => ({
              name: 'enrootDeposits',
              amountOut: _amountInStep,
              prepare: () => ({
                target: hooliganhorde.address,
                callData,
              }),
              decode: (data: string) =>
                hooliganhorde.interface.decodeFunctionData('enrootDeposits', data),
              decodeResult: (result: string) =>
                hooliganhorde.interface.decodeFunctionResult(
                  'enrootDeposits',
                  result
                ),
            }),
          });
        });
      }
    });

    console.debug(`[EnrootFarmStep][build]: `, this.getFarmInput());

    return this;
  }

  /// class specific methods
  private _getEncoded() {
    const { hooliganhorde } = this._sdk.contracts;

    const callData: { [key in EnrootType]: string[] } = {
      [EnrootType.DEPOSIT]: [],
      [EnrootType.DEPOSITS]: [],
    };

    [...this._sdk.tokens.unripeTokens].forEach((urToken) => {
      const crates = this._crates[urToken.address];
      if (crates?.length === 1) {
        const encoded = hooliganhorde.interface.encodeFunctionData(
          'enrootDeposit',
          [
            urToken.address,
            crates[0].gameday.toString(),
            urToken.fromHuman(crates[0].amount.toString()).toBlockchain(),
          ]
        );
        callData[EnrootType.DEPOSIT] = [...[EnrootType.DEPOSIT], encoded];
      } else if (crates?.length > 1) {
        const encoded = hooliganhorde.interface.encodeFunctionData(
          'enrootDeposits',
          [
            urToken.address,
            crates.map((crate) => crate.gameday.toString()),
            crates.map((crate) =>
              urToken.fromHuman(crate.amount.toString()).toBlockchain()
            ),
          ]
        );

        callData[EnrootType.DEPOSITS] = [
          ...callData[EnrootType.DEPOSITS],
          encoded,
        ];
      }
    });

    return callData;
  }

  /// static methods
  static pickUnripeCrates(
    unripeTokens: HooliganhordeSDK['tokens']['unripeTokens'],
    balances: TokenMap<GuvnorFirmBalance>,
    getBDV: (token: Token) => BigNumber
  ) {
    return [...unripeTokens].reduce<TokenMap<DepositCrate[]>>((prev, token) => {
      const balance = balances[token.address];
      const depositCrates = balance?.deposited.crates;

      prev[token.address] = depositCrates?.filter((crate) => {
        const bdv = getBDV(token).times(crate.amount).toFixed(6, 1);
        return new BigNumber(bdv).gt(crate.bdv);
      });

      return prev;
    }, {});
  }
}
