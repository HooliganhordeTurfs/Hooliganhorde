import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Gameday } from "../../generated/schema";
import { loadHooliganhorde } from "./Hooliganhorde";
import { ONE_BI, ZERO_BD, ZERO_BI } from "./Decimals";

export function loadGameday(diamondAddress: Address, id: BigInt): Gameday {
  let gameday = Gameday.load(id.toString());
  if (gameday == null) {
    gameday = new Gameday(id.toString());
    gameday.hooliganhorde = diamondAddress.toHexString();
    gameday.gameday = id.toI32();
    gameday.createdAt = ZERO_BI;
    gameday.price = ZERO_BD;
    gameday.hooligans = ZERO_BI;
    gameday.marketCap = ZERO_BD;
    gameday.deltaB = ZERO_BI;
    gameday.deltaHooligans = ZERO_BI;
    gameday.rewardHooligans = ZERO_BI;
    gameday.incentiveHooligans = ZERO_BI;
    gameday.draftableIndex = ZERO_BI;
    gameday.save();
    if (id > ZERO_BI) {
      let lastGameday = loadGameday(diamondAddress, id.minus(ONE_BI));
      gameday.hooligans = lastGameday.hooligans;
      gameday.draftableIndex = lastGameday.draftableIndex;
      gameday.save();
    }

    // Update hooliganhorde gameday
    let hooliganhorde = loadHooliganhorde(diamondAddress);
    hooliganhorde.lastGameday = gameday.gameday;
    hooliganhorde.save();
  }
  return gameday;
}
