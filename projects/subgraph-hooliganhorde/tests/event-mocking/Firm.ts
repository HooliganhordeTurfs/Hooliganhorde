import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import {
  AddDeposit,
  RemoveDeposit,
  RemoveDeposits,
  AddWithdrawal,
  RemoveWithdrawal,
  RemoveWithdrawals,
  ProspectsBalanceChanged,
  HordeBalanceChanged,
  Recruit,
  WhitelistToken,
  DewhitelistToken
} from "../../generated/Firm-Rerecruited/Hooliganhorde";
import { handleAddDeposit } from "../../src/FirmHandler";
import { HOOLIGAN_DECIMALS } from "../../src/utils/Constants";

export function handleAddDeposits(events: AddDeposit[]): void {
  events.forEach((event) => {
    handleAddDeposit(event);
  });
}

export function createAddDepositEvent(account: string, token: string, gameday: i32, amount: i32, tokenDecimals: i32, bdv: i32): AddDeposit {
  let addDepositEvent = changetype<AddDeposit>(newMockEvent());
  addDepositEvent.parameters = new Array();
  let accountParam = new ethereum.EventParam("account", ethereum.Value.fromAddress(Address.fromString(account)));
  let tokenParam = new ethereum.EventParam("token", ethereum.Value.fromAddress(Address.fromString(token)));
  let gamedayParam = new ethereum.EventParam("gameday", ethereum.Value.fromI32(gameday));
  let amountParam = new ethereum.EventParam(
    "amount",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(amount).times(BigInt.fromI32(10 ** tokenDecimals)))
  );
  let bdvParam = new ethereum.EventParam(
    "bdv",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(bdv).times(BigInt.fromI32(10 ** HOOLIGAN_DECIMALS)))
  );

  addDepositEvent.parameters.push(accountParam);
  addDepositEvent.parameters.push(tokenParam);
  addDepositEvent.parameters.push(gamedayParam);
  addDepositEvent.parameters.push(amountParam);
  addDepositEvent.parameters.push(bdvParam);

  return addDepositEvent as AddDeposit;
}

export function createRemoveDepositEvent(account: string, token: string, gameday: i32, amount: BigInt): RemoveDeposit {
  let removeDepositEvent = changetype<RemoveDeposit>(newMockEvent());
  removeDepositEvent.parameters = new Array();
  let accountParam = new ethereum.EventParam("account", ethereum.Value.fromAddress(Address.fromString(account)));
  let tokenParam = new ethereum.EventParam("token", ethereum.Value.fromAddress(Address.fromString(token)));
  let gamedayParam = new ethereum.EventParam("gameday", ethereum.Value.fromI32(gameday));
  let amountParam = new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount));

  removeDepositEvent.parameters.push(accountParam);
  removeDepositEvent.parameters.push(tokenParam);
  removeDepositEvent.parameters.push(gamedayParam);
  removeDepositEvent.parameters.push(amountParam);

  return removeDepositEvent as RemoveDeposit;
}

export function createRemoveDepositsEvent(
  account: string,
  token: string,
  gamedays: i32[],
  amounts: BigInt[],
  amount: BigInt
): RemoveDeposits {
  let event = changetype<RemoveDeposits>(newMockEvent());
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("account", ethereum.Value.fromAddress(Address.fromString(account)));
  let param2 = new ethereum.EventParam("token", ethereum.Value.fromAddress(Address.fromString(account)));
  let param3 = new ethereum.EventParam("gamedays", ethereum.Value.fromAddress(Address.fromString(account)));
  let param4 = new ethereum.EventParam("amounts", ethereum.Value.fromAddress(Address.fromString(account)));
  let param5 = new ethereum.EventParam("amount", ethereum.Value.fromAddress(Address.fromString(account)));

  event.parameters.push(param1);
  event.parameters.push(param2);
  event.parameters.push(param3);
  event.parameters.push(param4);
  event.parameters.push(param5);

  return event as RemoveDeposits;
}

export function createAddWithdrawalEvent(account: string, token: string, gameday: i32, amount: BigInt): AddWithdrawal {
  let event = changetype<AddWithdrawal>(newMockEvent());
  event.parameters = new Array();
  return event as AddWithdrawal;
}

export function createRemoveWithdrawalEvent(account: string, token: string, gameday: i32, amount: BigInt): RemoveWithdrawal {
  let event = changetype<RemoveWithdrawal>(newMockEvent());
  event.parameters = new Array();
  return event as RemoveWithdrawal;
}

export function createRemoveWithdrawalsEvent(account: string, token: string, gamedays: i32[], amount: BigInt): RemoveWithdrawals {
  let event = changetype<RemoveWithdrawals>(newMockEvent());
  event.parameters = new Array();
  return event as RemoveWithdrawals;
}

export function createProspectsBalanceChangedEvent(account: string, delta: BigInt): ProspectsBalanceChanged {
  let event = changetype<ProspectsBalanceChanged>(newMockEvent());
  event.parameters = new Array();
  return event as ProspectsBalanceChanged;
}

export function createHordeBalanceChangedEvent(account: string, delta: BigInt, rootDelta: BigInt): HordeBalanceChanged {
  let event = changetype<HordeBalanceChanged>(newMockEvent());
  event.parameters = new Array();
  return event as HordeBalanceChanged;
}

export function createRecruitEvent(account: string, amount: BigInt): Recruit {
  let event = changetype<Recruit>(newMockEvent());
  event.parameters = new Array();
  return event as Recruit;
}

export function createWhitelistTokenEvent(token: string, selector: Bytes, prospects: BigInt, horde: BigInt): WhitelistToken {
  let event = changetype<WhitelistToken>(newMockEvent());
  event.parameters = new Array();
  return event as WhitelistToken;
}

export function createDewhitelistTokenEvent(token: string): DewhitelistToken {
  let event = changetype<DewhitelistToken>(newMockEvent());
  event.parameters = new Array();
  return event as DewhitelistToken;
}
