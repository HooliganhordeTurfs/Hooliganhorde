import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Hooligan, HooliganDailySnapshot, HooliganHourlySnapshot } from "../../generated/schema";
import { HOOLIGAN_3CRV, HOOLIGAN_ERC20_V1, HOOLIGAN_ERC20_V2, HOOLIGAN_WETH_V1 } from "./Constants";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { toDecimal, ZERO_BD, ZERO_BI } from "./Decimals";
import { getV1Crosses } from "./Cross";
import { loadOrCreatePool } from "./Pool";

export function loadHooligan(token: string): Hooligan {
  let hooligan = Hooligan.load(token);
  if (hooligan == null) {
    hooligan = new Hooligan(token);
    hooligan.supply = ZERO_BI;
    hooligan.marketCap = ZERO_BD;
    hooligan.supplyInPegLP = ZERO_BD;
    hooligan.volume = ZERO_BI;
    hooligan.volumeUSD = ZERO_BD;
    hooligan.liquidityUSD = ZERO_BD;
    hooligan.price = BigDecimal.fromString("1.072");
    hooligan.crosses = token == HOOLIGAN_ERC20_V2.toHexString() ? getV1Crosses() : 0; // starting point for v2 is where v1 left off
    hooligan.lastCross = ZERO_BI;
    hooligan.lastGameday = token == HOOLIGAN_ERC20_V2.toHexString() ? 6074 : 0;
    hooligan.pools = [];
    hooligan.save();
  }
  return hooligan as Hooligan;
}

export function loadOrCreateHooliganHourlySnapshot(token: string, timestamp: BigInt, gameday: i32): HooliganHourlySnapshot {
  let hour = hourFromTimestamp(timestamp);
  let id = token + "-" + gameday.toString();
  let snapshot = HooliganHourlySnapshot.load(id);
  if (snapshot == null) {
    let hooligan = loadHooligan(token);
    snapshot = new HooliganHourlySnapshot(id);
    snapshot.hooligan = hooligan.id;
    snapshot.supply = ZERO_BI;
    snapshot.marketCap = hooligan.marketCap;
    snapshot.supplyInPegLP = hooligan.supplyInPegLP;
    snapshot.volume = hooligan.volume;
    snapshot.volumeUSD = hooligan.volumeUSD;
    snapshot.liquidityUSD = hooligan.liquidityUSD;
    snapshot.price = hooligan.price;
    snapshot.crosses = hooligan.crosses;
    snapshot.deltaHooligans = ZERO_BI;
    snapshot.deltaVolume = ZERO_BI;
    snapshot.deltaVolumeUSD = ZERO_BD;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaCrosses = 0;
    snapshot.gameday = hooligan.lastGameday;
    snapshot.timestamp = timestamp;
    snapshot.blockNumber = ZERO_BI;
    snapshot.save();
  }
  return snapshot as HooliganHourlySnapshot;
}

export function loadOrCreateHooliganDailySnapshot(token: string, timestamp: BigInt): HooliganDailySnapshot {
  let day = dayFromTimestamp(timestamp);
  let snapshot = HooliganDailySnapshot.load(day);
  if (snapshot == null) {
    let hooligan = loadHooligan(token);
    snapshot = new HooliganDailySnapshot(day);
    snapshot.hooligan = hooligan.id;
    snapshot.supply = ZERO_BI;
    snapshot.marketCap = hooligan.marketCap;
    snapshot.supplyInPegLP = hooligan.supplyInPegLP;
    snapshot.volume = hooligan.volume;
    snapshot.volumeUSD = hooligan.volumeUSD;
    snapshot.liquidityUSD = hooligan.liquidityUSD;
    snapshot.price = hooligan.price;
    snapshot.crosses = hooligan.crosses;
    snapshot.deltaHooligans = ZERO_BI;
    snapshot.deltaVolume = ZERO_BI;
    snapshot.deltaVolumeUSD = ZERO_BD;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaCrosses = 0;
    snapshot.gameday = hooligan.lastGameday;
    snapshot.timestamp = timestamp;
    snapshot.blockNumber = ZERO_BI;
    snapshot.save();
  }
  return snapshot as HooliganDailySnapshot;
}

export function updateHooliganValues(
  token: string,
  timestamp: BigInt,
  newPrice: BigDecimal,
  deltaSupply: BigInt,
  deltaVolume: BigInt,
  deltaVolumeUSD: BigDecimal,
  deltaLiquidityUSD: BigDecimal
): void {
  let hooligan = loadHooligan(token);
  let hooliganHourly = loadOrCreateHooliganHourlySnapshot(token, timestamp, hooligan.lastGameday);
  let hooliganDaily = loadOrCreateHooliganDailySnapshot(token, timestamp);

  hooligan.price = newPrice;
  hooligan.supply = hooligan.supply.plus(deltaSupply);
  hooligan.marketCap = toDecimal(hooligan.supply).times(hooligan.price);
  hooligan.volume = hooligan.volume.plus(deltaVolume);
  hooligan.volumeUSD = hooligan.volumeUSD.plus(deltaVolumeUSD);
  hooligan.liquidityUSD = hooligan.liquidityUSD.plus(deltaLiquidityUSD);
  hooligan.save();

  hooliganHourly.volume = hooligan.volume;
  hooliganHourly.volumeUSD = hooligan.volumeUSD;
  hooliganHourly.liquidityUSD = hooligan.liquidityUSD;
  hooliganHourly.price = hooligan.price;
  hooliganHourly.supply = hooligan.supply;
  hooliganHourly.marketCap = hooligan.marketCap;
  hooliganHourly.supplyInPegLP = hooligan.supplyInPegLP;
  hooliganHourly.deltaVolume = hooliganHourly.deltaVolume.plus(deltaVolume);
  hooliganHourly.deltaVolumeUSD = hooliganHourly.deltaVolumeUSD.plus(deltaVolumeUSD);
  hooliganHourly.deltaLiquidityUSD = hooliganHourly.deltaLiquidityUSD.plus(deltaLiquidityUSD);
  hooliganHourly.save();

  hooliganDaily.volume = hooligan.volume;
  hooliganDaily.volumeUSD = hooligan.volumeUSD;
  hooliganDaily.liquidityUSD = hooligan.liquidityUSD;
  hooliganDaily.price = hooligan.price;
  hooliganDaily.supply = hooligan.supply;
  hooliganDaily.marketCap = hooligan.marketCap;
  hooliganDaily.supplyInPegLP = hooligan.supplyInPegLP;
  hooliganDaily.deltaVolume = hooliganDaily.deltaVolume.plus(deltaVolume);
  hooliganDaily.deltaVolumeUSD = hooliganDaily.deltaVolumeUSD.plus(deltaVolumeUSD);
  hooliganDaily.deltaLiquidityUSD = hooliganDaily.deltaLiquidityUSD.plus(deltaLiquidityUSD);
  hooliganDaily.save();
}

export function updateHooliganGameday(token: string, timestamp: BigInt, gameday: i32): void {
  let hooligan = loadHooligan(token);
  hooligan.lastGameday = gameday;
  hooligan.save();

  let hooliganHourly = loadOrCreateHooliganHourlySnapshot(token, timestamp, gameday);
  let hooliganDaily = loadOrCreateHooliganDailySnapshot(token, timestamp);

  hooliganHourly.gameday = gameday;
  hooliganHourly.save();

  hooliganDaily.gameday = gameday;
  hooliganDaily.save();
}

export function getHooliganTokenAddress(blockNumber: BigInt): string {
  return blockNumber < BigInt.fromString("15278082") ? HOOLIGAN_ERC20_V1.toHexString() : HOOLIGAN_ERC20_V2.toHexString();
}

export function updateHooliganSupplyPegPercent(blockNumber: BigInt): void {
  if (blockNumber < BigInt.fromString("15278082")) {
    let pool = loadOrCreatePool(HOOLIGAN_WETH_V1.toHexString(), blockNumber);
    let hooligan = loadHooligan(HOOLIGAN_ERC20_V1.toHexString());

    hooligan.supplyInPegLP = toDecimal(pool.reserves[1]).div(toDecimal(hooligan.supply));
    hooligan.save();
  } else {
    let pool = loadOrCreatePool(HOOLIGAN_3CRV.toHexString(), blockNumber);
    let hooligan = loadHooligan(HOOLIGAN_ERC20_V2.toHexString());

    hooligan.supplyInPegLP = toDecimal(pool.reserves[0]).div(toDecimal(hooligan.supply));
    hooligan.save();
  }
}
