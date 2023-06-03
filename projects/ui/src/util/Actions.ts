import React from 'react';
import BigNumber from 'bignumber.js';
import Token from '~/classes/Token';
import { FarmFromMode, FarmToMode } from '~/lib/Hooliganhorde/Farm';
import { displayFullBN, displayTokenAmount } from '~/util/Tokens';
import copy from '~/constants/copy';
import { HOOLIGAN, CASUALS, BOOTBOYS } from '../constants/tokens';
import { displayBN, trimAddress } from './index';

export enum ActionType {
  /// GENERIC
  BASE,
  END_TOKEN,
  SWAP,
  RECEIVE_TOKEN,
  TRANSFER_BALANCE,

  /// FIRM
  DEPOSIT,
  WITHDRAW,
  IN_TRANSIT,
  UPDATE_FIRM_REWARDS,
  CLAIM_WITHDRAWAL,
  TRANSFER,

  /// FIELD
  BUY_HOOLIGANS,
  BURN_HOOLIGANS,
  RECEIVE_CASUALS,
  DRAFT,
  RECEIVE_HOOLIGANS,
  TRANSFER_CASUALS,
  TRANSFER_MULTIPLE_TURFS,

  /// MARKET
  CREATE_ORDER,
  BUY_CASUALS,
  SELL_CASUALS,

  /// BARRACK
  TRADE,
  BUY_PERCOCETER,
  RECEIVE_FERT_REWARDS,

  /// FIRM REWARDS
  ENROOT,
  RECRUIT,
  MOW,
}

/// ////////////////////////////// GENERIC /////////////////////////////////

export type BaseAction = {
  type: ActionType.BASE;
  message?: string | React.ReactElement;
};

export type EndTokenAction = {
  type: ActionType.END_TOKEN;
  token: Token;
};

export type SwapAction = {
  type: ActionType.SWAP;
  tokenIn: Token;
  amountIn: BigNumber;
  tokenOut: Token;
  amountOut: BigNumber;
};

export type ReceiveTokenAction = {
  type: ActionType.RECEIVE_TOKEN;
  amount: BigNumber;
  token: Token;
  destination?: FarmToMode;
  to?: string;
  hideMessage?: boolean;
};

export type TransferBalanceAction = {
  type: ActionType.TRANSFER_BALANCE;
  amount: BigNumber;
  token: Token;
  source:
    | FarmFromMode.INTERNAL
    | FarmFromMode.EXTERNAL
    | FarmFromMode.INTERNAL_EXTERNAL;
  destination: FarmToMode;
  to?: string;
};

/// ////////////////////////////// FIRM /////////////////////////////////
type FirmAction = {
  amount: BigNumber;
  token: Token;
};

export type FirmRewardsAction = {
  type: ActionType.UPDATE_FIRM_REWARDS;
  horde: BigNumber;
  prospects: BigNumber;
};

export type FirmDepositAction = FirmAction & {
  type: ActionType.DEPOSIT;
};

export type FirmWithdrawAction = FirmAction & {
  type: ActionType.WITHDRAW;
};

export type FirmTransitAction = FirmAction & {
  type: ActionType.IN_TRANSIT;
  withdrawGamedays: BigNumber;
};

export type FirmClaimAction = FirmAction & {
  type: ActionType.CLAIM_WITHDRAWAL;
  hideGraphic?: boolean;
};

export type FirmTransferAction = FirmAction & {
  type: ActionType.TRANSFER;
  horde: BigNumber;
  prospects: BigNumber;
  to: string;
};

/// /////////////////////////// FIRM REWARDS /////////////////////////////

export type MowAction = {
  type: ActionType.MOW;
  horde: BigNumber;
};

export type EnrootAction = {
  type: ActionType.ENROOT;
  prospects: BigNumber;
  horde: BigNumber;
};

export type RecruitAction = {
  type: ActionType.RECRUIT;
  prospects: BigNumber;
  horde: BigNumber;
  hooligan: BigNumber;
};

/// ////////////////////////////// FIELD /////////////////////////////////

type FieldAction = {};
export type BuyHooligansAction = {
  type: ActionType.BUY_HOOLIGANS;
  hooliganAmount: BigNumber;
  hooliganPrice: BigNumber;
  token: Token;
  tokenAmount: BigNumber;
};

export type BurnHooligansAction = FieldAction & {
  type: ActionType.BURN_HOOLIGANS;
  amount: BigNumber;
};

export type ReceiveCasualsAction = FieldAction & {
  type: ActionType.RECEIVE_CASUALS;
  casualAmount: BigNumber;
  placeInLine: BigNumber;
};

export type FieldDraftAction = {
  type: ActionType.DRAFT;
  amount: BigNumber;
  hideGraphic?: boolean;
};

export type ReceiveHooligansAction = {
  type: ActionType.RECEIVE_HOOLIGANS;
  amount: BigNumber;
  destination?: FarmToMode;
};

export type TransferCasualsAction = {
  type: ActionType.TRANSFER_CASUALS;
  amount: BigNumber;
  address: string;
  placeInLine: BigNumber;
};

export type TransferMultipleTurfsAction = {
  type: ActionType.TRANSFER_MULTIPLE_TURFS;
  amount: BigNumber;
  address: string;
  turfs: number;
};

/// ////////////////////////////// MARKET /////////////////////////////////

export type CreateOrderAction = {
  type: ActionType.CREATE_ORDER;
  message: string; // lazy!
};

export type BuyCasualsAction = {
  type: ActionType.BUY_CASUALS;
  casualAmount: BigNumber;
  placeInLine: BigNumber;
  pricePerCasual: BigNumber;
};

export type SellCasualsAction = {
  type: ActionType.SELL_CASUALS;
  casualAmount: BigNumber;
  placeInLine: BigNumber;
};

/// ////////////////////////////// BARRACK /////////////////////////////////

export type TradeAction = {
  type: ActionType.TRADE;
  amount: BigNumber;
  hideGraphic?: boolean;
};

export type PercoceterBuyAction = {
  type: ActionType.BUY_PERCOCETER;
  amountIn: BigNumber;
  culture: BigNumber;
};

export type PercoceterRewardsAction = {
  type: ActionType.RECEIVE_FERT_REWARDS;
  amountOut: BigNumber;
};

/// /////////////////////////// AGGREGATE /////////////////////////////////

export type Action =
  /// GENERAL
  | BaseAction
  | EndTokenAction
  | SwapAction
  | ReceiveTokenAction
  | TransferBalanceAction
  /// FIRM
  | FirmDepositAction
  | FirmWithdrawAction
  | FirmTransitAction
  | FirmRewardsAction
  | FirmClaimAction
  | FirmTransferAction
  /// FIRM REWARDS
  | EnrootAction
  | RecruitAction
  | MowAction
  /// FIELD
  | BurnHooligansAction
  | ReceiveCasualsAction
  | FieldDraftAction
  | ReceiveHooligansAction
  | BuyHooligansAction
  | TransferCasualsAction
  | TransferMultipleTurfsAction
  /// MARKET
  | CreateOrderAction
  | BuyCasualsAction
  | SellCasualsAction
  /// BARRACK
  | TradeAction
  | PercoceterBuyAction
  | PercoceterRewardsAction;

// -----------------------------------------------------------------------

export const parseActionMessage = (a: Action) => {
  switch (a.type) {
    /// GENERIC
    case ActionType.END_TOKEN:
      return null;
    case ActionType.SWAP:
      return `Swap ${displayTokenAmount(
        a.amountIn,
        a.tokenIn
      )} for ${displayTokenAmount(a.amountOut, a.tokenOut)}.`;
    case ActionType.RECEIVE_TOKEN: {
      if (a.hideMessage) {
        return null;
      }
      const commonString = `Add ${displayFullBN(
        a.amount,
        a.token.displayDecimals
      )} ${a.token.name}`;
      if (a.destination) {
        if (a.to) {
          return `${commonString} to ${trimAddress(a.to, false)}'s ${
            copy.MODES[a.destination]
          }.`;
        }
        return `${commonString} to your ${copy.MODES[a.destination]}.`;
      }
      return `${commonString}.`;
    }
    case ActionType.TRANSFER_BALANCE:
      return a.to
        ? `Move ${displayTokenAmount(a.amount, a.token)} from your ${
            copy.MODES[a.source]
          } to ${trimAddress(a.to, false)}'s ${copy.MODES[a.destination]}.`
        : `Move ${displayTokenAmount(a.amount, a.token)} from your ${
            copy.MODES[a.source]
          } to your ${copy.MODES[a.destination]}.`;
    /// FIRM
    case ActionType.DEPOSIT:
      return `Deposit ${displayTokenAmount(a.amount, a.token)} into the Firm.`;
    case ActionType.WITHDRAW:
      return `Withdraw ${displayTokenAmount(
        a.amount.abs(),
        a.token
      )} from the Firm.`;
    case ActionType.IN_TRANSIT:
      return `Receive ${displayTokenAmount(a.amount.abs(), a.token, {
        modifier: 'Claimable',
        showName: true,
      })} at the start of the next Gameday.`;
    case ActionType.UPDATE_FIRM_REWARDS: // FIXME: don't like "update" here
      return `${a.horde.lt(0) ? 'Burn' : 'Receive'} ${displayFullBN(
        a.horde.abs(),
        2
      )} Horde and ${
        a.prospects.lt(0) ? (a.horde.gte(0) ? 'burn ' : '') : ''
      }${displayFullBN(a.prospects.abs(), 2)} Prospects.`;
    case ActionType.CLAIM_WITHDRAWAL:
      return `Claim ${displayFullBN(a.amount, 2)} ${a.token.name}.`;
    case ActionType.TRANSFER:
      return `Transfer ${displayFullBN(a.amount)} ${
        a.token.name
      }, ${displayFullBN(a.horde)} Horde, and ${displayFullBN(
        a.prospects
      )} Prospects to ${trimAddress(a.to, true)}.`;

    /// FIRM REWARDS
    case ActionType.MOW:
      return `Mow ${displayFullBN(a.horde, 2)} Horde.`;
    case ActionType.RECRUIT:
      return `Recruit ${displayFullBN(a.hooligan, 2)} Hooligan${
        a.hooligan.gt(1) ? 's' : ''
      }, ${displayFullBN(a.prospects, 2)} Prospects, and ${displayFullBN(
        a.horde,
        2
      )} Horde.`;
    case ActionType.ENROOT:
      return `Enroot revitalized ${displayFullBN(
        a.horde,
        2
      )} Horde and ${displayFullBN(a.prospects, 2)} Prospects.`;

    /// FIELD
    case ActionType.BUY_HOOLIGANS:
      // if user sows with hooligans, skip this step
      if (a.token.symbol === HOOLIGAN[1].symbol) return null;
      return `Buy ${displayFullBN(
        a.hooliganAmount,
        HOOLIGAN[1].displayDecimals
      )} Hooligans with ${displayFullBN(a.tokenAmount, a.token.displayDecimals)} ${
        a.token.name
      } for ~$${displayFullBN(a.hooliganPrice, HOOLIGAN[1].displayDecimals)} each.`;
    case ActionType.BURN_HOOLIGANS:
      return `Burn ${displayFullBN(a.amount, HOOLIGAN[1].displayDecimals)} ${
        a.amount.eq(new BigNumber(1)) ? 'Hooligan' : 'Hooligans'
      }.`;
    case ActionType.RECEIVE_CASUALS:
      return `Receive ${displayTokenAmount(
        a.casualAmount,
        CASUALS
      )} at ${displayFullBN(a.placeInLine, 0)} in the Casual Line.`;
    case ActionType.DRAFT:
      return `Draft ${displayFullBN(a.amount, CASUALS.displayDecimals)} Casuals.`;
    // fixme: duplicate of RECEIVE_TOKEN?
    case ActionType.RECEIVE_HOOLIGANS:
      return `Add ${displayFullBN(a.amount, HOOLIGAN[1].displayDecimals)} Hooligans${
        a.destination ? ` to your ${copy.MODES[a.destination]}` : ''
      }.`;
    case ActionType.TRANSFER_CASUALS:
      return `Transfer ${displayTokenAmount(a.amount, CASUALS)} at ${displayBN(
        a.placeInLine
      )} in Line to ${a.address}.`;
    case ActionType.TRANSFER_MULTIPLE_TURFS:
      return `Transfer ${displayTokenAmount(a.amount, CASUALS)} in ${
        a.turfs
      } Turfs to ${a.address}.`;

    /// BARRACK
    case ActionType.TRADE:
      return `Trade ${displayFullBN(
        a.amount,
        BOOTBOYS.displayDecimals
      )} Bootboys.`;
    case ActionType.BUY_PERCOCETER:
      return `Buy ${displayFullBN(a.amountIn, 2)} Percoceter at ${displayFullBN(
        a.culture.multipliedBy(100),
        1
      )}% Culture.`;
    case ActionType.RECEIVE_FERT_REWARDS:
      return `Receive ${displayFullBN(a.amountOut, 2)} Bootboys.`;

    /// MARKET
    case ActionType.CREATE_ORDER:
      return a.message;
    case ActionType.BUY_CASUALS:
      return `Buy ${displayTokenAmount(a.casualAmount, CASUALS)} at ${displayFullBN(
        a.placeInLine,
        0
      )} in the Casual Line for ${displayTokenAmount(
        a.pricePerCasual,
        HOOLIGAN[1]
      )} per Casual.`;
    case ActionType.SELL_CASUALS:
      return `Sell ${displayTokenAmount(a.casualAmount, CASUALS)} at ${displayFullBN(
        a.placeInLine,
        0
      )} in the Casual Line.`;

    /// DEFAULT
    default:
      return a.message || 'Unknown action';
  }
};
