import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import { AddDeposit, RemoveDeposit, RemoveDeposits } from "../../generated/Firm-Rerecruited/Hooliganhorde";
import { handleAddDeposit } from "../../src/FirmHandler";
import { HOOLIGAN_DECIMALS } from "../../src/utils/Constants";

export function createActuationEvent(gameday: BigInt): void {}
export function createGamedaySnapshotEvent(
  gameday: i32,
  price: BigInt,
  supply: BigInt,
  horde: BigInt,
  prospects: BigInt,
  casualIndex: BigInt,
  draftableIndex: BigInt
): void {}
export function createIncentivizationEvent(account: string, hooligans: BigInt): void {}

/** ===== Rerecruit Events ===== */

export function createRewardEvent(gameday: BigInt, toField: BigInt, toFirm: BigInt, toPercoceter: BigInt): void {}
export function createMetapoolOracleEvent(gameday: BigInt, deltaB: BigInt, balances: BigInt[]): void {}
export function createRageEvent(gameday: BigInt, rage: BigInt): void {}
