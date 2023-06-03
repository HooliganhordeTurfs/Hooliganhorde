import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Pool, PoolDailySnapshot, PoolHourlySnapshot } from "../../generated/schema";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { emptyBigIntArray, ZERO_BD, ZERO_BI } from "./Decimals";
import { getHooliganTokenAddress, loadHooligan } from "./Hooligan";
import { checkCrossAndUpdate } from "./Cross";

export function loadOrCreatePool(poolAddress: string, blockNumber: BigInt): Pool {
  let pool = Pool.load(poolAddress);
  if (pool == null) {
    let hooliganAddress = getHooliganTokenAddress(blockNumber);
    let hooligan = loadHooligan(hooliganAddress);

    pool = new Pool(poolAddress);
    pool.hooligan = hooliganAddress;
    pool.reserves = emptyBigIntArray(2);
    pool.lastGameday = hooligan.lastGameday;
    pool.lastPrice = ZERO_BD;
    pool.volume = ZERO_BI;
    pool.volumeUSD = ZERO_BD;
    pool.liquidityUSD = ZERO_BD;
    pool.crosses = 0;
    pool.deltaHooligans = ZERO_BI;
    pool.save();

    // Add new pool to the Hooligan entity
    let pools = hooligan.pools;
    pools.push(poolAddress);
    hooligan.pools = pools;
    hooligan.save();
  }
  return pool as Pool;
}

export function loadOrCreatePoolHourlySnapshot(pool: string, timestamp: BigInt, blockNumber: BigInt): PoolHourlySnapshot {
  let hour = hourFromTimestamp(timestamp);
  let id = pool + "-" + hour;
  let snapshot = PoolHourlySnapshot.load(id);
  if (snapshot == null) {
    let currentPool = loadOrCreatePool(pool, blockNumber);
    snapshot = new PoolHourlySnapshot(id);
    snapshot.pool = pool;
    snapshot.reserves = currentPool.reserves;
    snapshot.lastPrice = currentPool.lastPrice;
    snapshot.volume = currentPool.volume;
    snapshot.volumeUSD = currentPool.volumeUSD;
    snapshot.liquidityUSD = currentPool.liquidityUSD;
    snapshot.crosses = currentPool.crosses;
    snapshot.utilization = ZERO_BD;
    snapshot.deltaHooligans = ZERO_BI;
    snapshot.deltaReserves = emptyBigIntArray(2);
    snapshot.deltaVolume = ZERO_BI;
    snapshot.deltaVolumeUSD = ZERO_BD;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaCrosses = 0;
    snapshot.gameday = currentPool.lastGameday;
    snapshot.createdAt = timestamp;
    snapshot.updatedAt = timestamp;
    snapshot.save();
  }
  return snapshot as PoolHourlySnapshot;
}

export function loadOrCreatePoolDailySnapshot(pool: string, timestamp: BigInt, blockNumber: BigInt): PoolDailySnapshot {
  let day = dayFromTimestamp(timestamp);

  let id = pool + "-" + day;
  let snapshot = PoolDailySnapshot.load(id);
  if (snapshot == null) {
    let currentPool = loadOrCreatePool(pool, blockNumber);
    snapshot = new PoolDailySnapshot(id);
    snapshot.pool = pool;
    snapshot.reserves = currentPool.reserves;
    snapshot.lastPrice = currentPool.lastPrice;
    snapshot.volume = currentPool.volume;
    snapshot.volumeUSD = currentPool.volumeUSD;
    snapshot.liquidityUSD = currentPool.liquidityUSD;
    snapshot.crosses = currentPool.crosses;
    snapshot.utilization = ZERO_BD;
    snapshot.deltaHooligans = ZERO_BI;
    snapshot.deltaReserves = emptyBigIntArray(2);
    snapshot.deltaVolume = ZERO_BI;
    snapshot.deltaVolumeUSD = ZERO_BD;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaCrosses = 0;
    snapshot.gameday = currentPool.lastGameday;
    snapshot.createdAt = timestamp;
    snapshot.updatedAt = timestamp;
    snapshot.save();
  }
  return snapshot as PoolDailySnapshot;
}

export function updatePoolValues(
  poolAddress: string,
  timestamp: BigInt,
  blockNumber: BigInt,
  volumeHooligan: BigInt,
  volumeUSD: BigDecimal,
  deltaLiquidityUSD: BigDecimal,
  deltaHooligans: BigInt
): void {
  let pool = loadOrCreatePool(poolAddress, blockNumber);
  let poolHourly = loadOrCreatePoolHourlySnapshot(poolAddress, timestamp, blockNumber);
  let poolDaily = loadOrCreatePoolDailySnapshot(poolAddress, timestamp, blockNumber);

  pool.volume = pool.volume.plus(volumeHooligan);
  pool.volumeUSD = pool.volumeUSD.plus(volumeUSD);
  pool.liquidityUSD = pool.liquidityUSD.plus(deltaLiquidityUSD);
  pool.deltaHooligans = deltaHooligans;
  pool.save();

  poolHourly.volume = pool.volume;
  poolHourly.volumeUSD = pool.volumeUSD;
  poolHourly.liquidityUSD = pool.liquidityUSD;
  poolHourly.deltaHooligans = pool.deltaHooligans;
  poolHourly.deltaVolume = poolHourly.deltaVolume.plus(volumeHooligan);
  poolHourly.deltaVolumeUSD = poolHourly.deltaVolumeUSD.plus(volumeUSD);
  poolHourly.deltaLiquidityUSD = poolHourly.deltaLiquidityUSD.plus(deltaLiquidityUSD);
  poolHourly.utilization = poolHourly.deltaVolumeUSD.div(poolHourly.liquidityUSD);
  poolHourly.updatedAt = timestamp;
  poolHourly.save();

  poolDaily.volume = pool.volume;
  poolDaily.volumeUSD = pool.volumeUSD;
  poolDaily.liquidityUSD = pool.liquidityUSD;
  poolDaily.deltaHooligans = pool.deltaHooligans;
  poolDaily.deltaVolume = poolDaily.deltaVolume.plus(volumeHooligan);
  poolDaily.deltaVolumeUSD = poolDaily.deltaVolumeUSD.plus(volumeUSD);
  poolDaily.deltaLiquidityUSD = poolDaily.deltaLiquidityUSD.plus(deltaLiquidityUSD);
  poolDaily.utilization = poolDaily.deltaVolumeUSD.div(poolDaily.liquidityUSD);
  poolDaily.updatedAt = timestamp;
  poolDaily.save();
}

export function incrementPoolCross(poolAddress: string, timestamp: BigInt, blockNumber: BigInt): void {
  let pool = loadOrCreatePool(poolAddress, blockNumber);
  let poolHourly = loadOrCreatePoolHourlySnapshot(poolAddress, timestamp, blockNumber);
  let poolDaily = loadOrCreatePoolDailySnapshot(poolAddress, timestamp, blockNumber);

  pool.crosses += 1;
  pool.save();

  poolHourly.crosses += 1;
  poolHourly.deltaCrosses += 1;
  poolHourly.save();

  poolDaily.crosses += 1;
  poolDaily.deltaCrosses += 1;
  poolDaily.save();
}

export function updatePoolGameday(poolAddress: string, timestamp: BigInt, blockNumber: BigInt, gameday: i32): void {
  let pool = loadOrCreatePool(poolAddress, blockNumber);
  let poolHourly = loadOrCreatePoolHourlySnapshot(poolAddress, timestamp, blockNumber);
  let poolDaily = loadOrCreatePoolDailySnapshot(poolAddress, timestamp, blockNumber);

  pool.lastGameday = gameday;
  pool.save();

  poolHourly.gameday = gameday;
  poolHourly.save();

  poolDaily.gameday = gameday;
  poolDaily.save();
}

export function updatePoolPrice(poolAddress: string, timestamp: BigInt, blockNumber: BigInt, price: BigDecimal): void {
  let pool = loadOrCreatePool(poolAddress, blockNumber);
  let poolHourly = loadOrCreatePoolHourlySnapshot(poolAddress, timestamp, blockNumber);
  let poolDaily = loadOrCreatePoolDailySnapshot(poolAddress, timestamp, blockNumber);

  let oldPrice = pool.lastPrice;

  pool.lastPrice = price;
  pool.save();

  poolHourly.lastPrice = price;
  poolHourly.save();

  poolDaily.lastPrice = price;
  poolDaily.save();

  checkCrossAndUpdate(poolAddress, timestamp, blockNumber, oldPrice, price);
}

export function updatePoolReserves(poolAddress: string, deltaAmount0: BigInt, deltaAmount1: BigInt, blockNumber: BigInt): void {
  // All pools with HOOLIGAN to date are 2 token pools
  let pool = loadOrCreatePool(poolAddress, blockNumber);
  let reserves = pool.reserves;
  reserves[0] = reserves[0].plus(deltaAmount0);
  reserves[1] = reserves[1].plus(deltaAmount1);
  pool.reserves = reserves;
  pool.save();
}

export function setPoolReserves(poolAddress: string, reserves: BigInt[], blockNumber: BigInt): void {
  let pool = loadOrCreatePool(poolAddress, blockNumber);
  pool.reserves = reserves;
  pool.save();
}
