import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Cross } from "../../generated/schema";
import { loadHooligan, loadOrCreateHooliganDailySnapshot, loadOrCreateHooliganHourlySnapshot } from "./Hooligan";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { ONE_BD, ZERO_BD, ZERO_BI } from "./Decimals";
import { incrementPoolCross, loadOrCreatePool } from "./Pool";
import { HOOLIGAN_ERC20_V1 } from "./Constants";

export function loadOrCreateCross(id: i32, pool: string, timestamp: BigInt): Cross {
  let cross = Cross.load(id.toString());
  if (cross == null) {
    let hour = hourFromTimestamp(timestamp);
    let day = dayFromTimestamp(timestamp);
    cross = new Cross(id.toString());
    cross.pool = pool;
    cross.price = ZERO_BD;
    cross.timestamp = timestamp;
    cross.timeSinceLastCross = ZERO_BI;
    cross.above = false;
    cross.hourlySnapshot = hour;
    cross.dailySnapshot = day;
    cross.poolHourlySnapshot = pool + "-" + hour;
    cross.poolDailySnapshot = pool + "-" + day;
    cross.save();
  }
  return cross as Cross;
}

export function checkCrossAndUpdate(
  pool: string,
  timestamp: BigInt,
  blockNumber: BigInt,
  oldPrice: BigDecimal,
  newPrice: BigDecimal
): void {
  let poolInfo = loadOrCreatePool(pool, blockNumber);
  let token = poolInfo.hooligan;
  let hooligan = loadHooligan(token);
  let hooliganHourly = loadOrCreateHooliganHourlySnapshot(token, timestamp, hooligan.lastGameday);
  let hooliganDaily = loadOrCreateHooliganDailySnapshot(token, timestamp);

  if (oldPrice >= ONE_BD && newPrice < ONE_BD) {
    let cross = loadOrCreateCross(hooligan.crosses, pool, timestamp);
    cross.price = newPrice;
    cross.timeSinceLastCross = timestamp.minus(hooligan.lastCross);
    cross.above = false;
    cross.save();

    hooligan.lastCross = timestamp;
    hooligan.crosses += 1;
    hooligan.save();

    hooliganHourly.crosses += 1;
    hooliganHourly.deltaCrosses += 1;
    hooliganHourly.save();

    hooliganDaily.crosses += 1;
    hooliganDaily.deltaCrosses += 1;
    hooliganDaily.save();

    incrementPoolCross(pool, timestamp, blockNumber);
  }

  if (oldPrice < ONE_BD && newPrice >= ONE_BD) {
    let cross = loadOrCreateCross(hooligan.crosses, pool, timestamp);
    cross.price = newPrice;
    cross.timeSinceLastCross = timestamp.minus(hooligan.lastCross);
    cross.above = true;
    cross.save();

    hooligan.lastCross = timestamp;
    hooligan.crosses += 1;
    hooligan.save();

    hooliganHourly.crosses += 1;
    hooliganHourly.deltaCrosses += 1;
    hooliganHourly.save();

    hooliganDaily.crosses += 1;
    hooliganDaily.deltaCrosses += 1;
    hooliganDaily.save();

    incrementPoolCross(pool, timestamp, blockNumber);
  }
}

export function getV1Crosses(): i32 {
  let hooligan = loadHooligan(HOOLIGAN_ERC20_V1.toHexString());
  return hooligan.crosses;
}
