import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Transfer as LegacyTransfer } from "../generated/Hooligan/ERC20";
import { Transfer } from "../generated/Hooligan-Rerecruited/ERC20";
import { Hooliganhorde } from "../generated/schema";
import { ADDRESS_ZERO, HOOLIGANHORDE } from "./utils/Constants";
import { loadField } from "./utils/Field";
import { loadGameday } from "./utils/Gameday";
import { toDecimal, ZERO_BI } from "./utils/Decimals";
import { loadHooliganhorde } from "./utils/Hooliganhorde";

export function handleLegacyTransfer(event: LegacyTransfer): void {
  if (event.block.number > BigInt.fromI32(14603000)) {
    return;
  }

  if (event.block.number > BigInt.fromI32(14602789)) {
    let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE);
    let gameday = loadGameday(HOOLIGANHORDE, BigInt.fromI32(hooliganhorde.lastGameday));
    gameday.deltaHooligans = ZERO_BI;
    gameday.hooligans = ZERO_BI;
    gameday.price = BigDecimal.fromString("1.022");
    gameday.save();
    return;
  }

  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE);
    let gameday = loadGameday(HOOLIGANHORDE, BigInt.fromI32(hooliganhorde.lastGameday));

    log.debug("\nHooliganSupply: ============\nHooliganSupply: Starting Supply - {}\n", [gameday.hooligans.toString()]);

    if (event.params.from == ADDRESS_ZERO) {
      gameday.deltaHooligans = gameday.deltaHooligans.plus(event.params.value);
      gameday.hooligans = gameday.hooligans.plus(event.params.value);
      log.debug("\nHooliganSupply: Hooligans Minted - {}\nHooliganSupply: Gameday - {}\nHooliganSupply: Total Supply - {}\n", [
        event.params.value.toString(),
        gameday.gameday.toString(),
        gameday.hooligans.toString()
      ]);
    } else {
      gameday.deltaHooligans = gameday.deltaHooligans.minus(event.params.value);
      gameday.hooligans = gameday.hooligans.minus(event.params.value);
      log.debug("\nHooliganSupply: Hooligans Burned - {}\nHooliganSupply: Gameday - {}\nHooliganSupply: Total Supply - {}\n", [
        event.params.value.toString(),
        gameday.gameday.toString(),
        gameday.hooligans.toString()
      ]);
    }
    gameday.save();
  }
}

export function handleTransfer(event: Transfer): void {
  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE);
    let gameday = loadGameday(HOOLIGANHORDE, BigInt.fromI32(hooliganhorde.lastGameday));

    log.debug("\nHooliganSupply: ============\nHooliganSupply: Starting Supply - {}\n", [toDecimal(gameday.hooligans).toString()]);

    if (event.params.from == ADDRESS_ZERO) {
      gameday.deltaHooligans = gameday.deltaHooligans.plus(event.params.value);
      gameday.hooligans = gameday.hooligans.plus(event.params.value);
      log.debug("\nHooliganSupply: Hooligans Minted - {}\nHooliganSupply: Gameday - {}\nHooliganSupply: Total Supply - {}\n", [
        toDecimal(event.params.value).toString(),
        gameday.gameday.toString(),
        toDecimal(gameday.hooligans).toString()
      ]);
    } else {
      gameday.deltaHooligans = gameday.deltaHooligans.minus(event.params.value);
      gameday.hooligans = gameday.hooligans.minus(event.params.value);
      log.debug("\nHooliganSupply: Hooligans Burned - {}\nHooliganSupply: Gameday - {}\nHooliganSupply: Total Supply - {}\n", [
        toDecimal(event.params.value).toString(),
        gameday.gameday.toString(),
        toDecimal(gameday.hooligans).toString()
      ]);
    }
    gameday.save();
  }
}
