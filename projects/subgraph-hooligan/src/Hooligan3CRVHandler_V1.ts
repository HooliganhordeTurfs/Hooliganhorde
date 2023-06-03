import { BigInt, BigDecimal, Address, log } from "@graphprotocol/graph-ts";
import {
  AddLiquidity,
  RemoveLiquidity,
  RemoveLiquidityImbalance,
  RemoveLiquidityOne,
  TokenExchange,
  TokenExchangeUnderlying
} from "../generated/Hooligan3CRV/Hooligan3CRV";
import { loadHooligan, updateHooliganSupplyPegPercent, updateHooliganValues } from "./utils/Hooligan";
import { HOOLIGAN_3CRV_V1, HOOLIGAN_ERC20_V1, HOOLIGAN_LUSD_V1, CALCULATIONS_CURVE, CRV3_POOL_V1, LUSD_3POOL } from "./utils/Constants";
import { toDecimal, ZERO_BD, ZERO_BI } from "./utils/Decimals";
import { loadOrCreatePool, setPoolReserves, updatePoolPrice, updatePoolValues } from "./utils/Pool";
import { CalculationsCurve } from "../generated/Hooligan3CRV-V1/CalculationsCurve";
import { Hooligan3CRV } from "../generated/Hooligan3CRV-V1/Hooligan3CRV";
import { ERC20 } from "../generated/Hooligan3CRV-V1/ERC20";

export function handleTokenExchange(event: TokenExchange): void {
  // Do not index post-exploit data
  if (event.block.number >= BigInt.fromI32(14602790)) return;

  handleSwap(
    event.address.toHexString(),
    event.params.sold_id,
    event.params.tokens_sold,
    event.params.bought_id,
    event.params.tokens_bought,
    event.block.timestamp,
    event.block.number
  );
}

export function handleTokenExchangeUnderlying(event: TokenExchangeUnderlying): void {
  // Do not index post-exploit data
  if (event.block.number >= BigInt.fromI32(14602790)) return;

  handleSwap(
    event.address.toHexString(),
    event.params.sold_id,
    event.params.tokens_sold,
    event.params.bought_id,
    event.params.tokens_bought,
    event.block.timestamp,
    event.block.number
  );
}

export function handleAddLiquidity(event: AddLiquidity): void {
  // Do not index post-exploit data
  if (event.block.number >= BigInt.fromI32(14602790)) return;

  handleLiquidityChange(
    event.address.toHexString(),
    event.block.timestamp,
    event.block.number,
    event.params.token_amounts[0],
    event.params.token_amounts[1]
  );
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  // Do not index post-exploit data
  if (event.block.number >= BigInt.fromI32(14602790)) return;

  handleLiquidityChange(
    event.address.toHexString(),
    event.block.timestamp,
    event.block.number,
    ZERO_BI.minus(event.params.token_amounts[0]),
    ZERO_BI.minus(event.params.token_amounts[1])
  );
}

export function handleRemoveLiquidityImbalance(event: RemoveLiquidityImbalance): void {
  // Do not index post-exploit data
  if (event.block.number >= BigInt.fromI32(14602790)) return;

  handleLiquidityChange(
    event.address.toHexString(),
    event.block.timestamp,
    event.block.number,
    ZERO_BI.minus(event.params.token_amounts[0]),
    ZERO_BI.minus(event.params.token_amounts[1])
  );
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {
  // Do not index post-exploit data
  if (event.block.number >= BigInt.fromI32(14602790)) return;

  if (event.params.provider == HOOLIGAN_ERC20_V1)
    handleLiquidityChange(event.address.toHexString(), event.block.timestamp, event.block.number, event.params.token_amount, ZERO_BI);
  else handleLiquidityChange(event.address.toHexString(), event.block.timestamp, event.block.number, ZERO_BI, event.params.token_amount);
}

function handleLiquidityChange(
  poolAddress: string,
  timestamp: BigInt,
  blockNumber: BigInt,
  token0Amount: BigInt,
  token1Amount: BigInt
): void {
  let pool = loadOrCreatePool(poolAddress, blockNumber);

  // Get Curve Price Details
  let curveCalc = CalculationsCurve.bind(CALCULATIONS_CURVE);
  let metapoolPrice = toDecimal(curveCalc.getCurvePriceUsdc(CRV3_POOL_V1));

  let lpContract = Hooligan3CRV.bind(Address.fromString(poolAddress));
  let hooliganCrvPrice = ZERO_BD;
  let lusd3crvPrice = ZERO_BD;

  if (poolAddress == HOOLIGAN_3CRV_V1.toHexString()) {
    hooliganCrvPrice = toDecimal(lpContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromI32(1000000)), 18);
  } else if (poolAddress == HOOLIGAN_LUSD_V1.toHexString()) {
    // price in LUSD
    let priceInLusd = toDecimal(lpContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromI32(1000000)), 18);
    log.info("LiquidityChange: Hooligan LUSD price: {}", [priceInLusd.toString()]);

    let lusdContract = Hooligan3CRV.bind(LUSD_3POOL);
    log.info("LiquidityChange: LUSD Crv price {}", [
      toDecimal(lusdContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromString("1000000000000000000")), 18).toString()
    ]);

    lusd3crvPrice = toDecimal(lusdContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromString("1000000000000000000")), 18);
    hooliganCrvPrice = priceInLusd.times(lusd3crvPrice);
  }

  log.info("LiquidityChange: Hooligan Crv price: {}", [hooliganCrvPrice.toString()]);

  let newPrice = metapoolPrice.times(hooliganCrvPrice);

  log.info("LiquidityChange: Hooligan USD price: {}", [newPrice.toString()]);

  let hooligan = loadHooligan(HOOLIGAN_ERC20_V1.toHexString());

  let hooliganContract = ERC20.bind(HOOLIGAN_ERC20_V1);
  let crv3PoolContract = ERC20.bind(CRV3_POOL_V1);
  let lusdContract = ERC20.bind(LUSD_3POOL);

  let hooliganHolding = toDecimal(hooliganContract.balanceOf(Address.fromString(poolAddress)));
  let crvHolding = toDecimal(crv3PoolContract.balanceOf(Address.fromString(poolAddress)), 18);
  let lusdHolding = toDecimal(lusdContract.balanceOf(Address.fromString(poolAddress)), 18);

  let hooliganValue = hooliganHolding.times(newPrice);
  let crvValue = crvHolding.times(metapoolPrice);
  let lusdValue = lusdHolding.times(lusd3crvPrice).times(metapoolPrice);

  let deltaB = BigInt.fromString(
    crvValue.plus(lusdValue).minus(hooliganHolding).times(BigDecimal.fromString("1000000")).truncate(0).toString()
  );

  let liquidityUSD = hooliganValue.plus(crvValue).plus(lusdValue);

  let deltaLiquidityUSD = liquidityUSD.minus(pool.liquidityUSD);

  let volumeUSD =
    deltaLiquidityUSD < ZERO_BD
      ? deltaLiquidityUSD.div(BigDecimal.fromString("2")).times(BigDecimal.fromString("-1"))
      : deltaLiquidityUSD.div(BigDecimal.fromString("2"));
  let volumeHooligan = BigInt.fromString(volumeUSD.div(newPrice).times(BigDecimal.fromString("1000000")).truncate(0).toString());

  if (token0Amount !== ZERO_BI && token1Amount !== ZERO_BI) {
    volumeUSD = ZERO_BD;
    volumeHooligan = ZERO_BI;
  }

  let reserveBalances = lpContract.try_get_balances();
  if (!reserveBalances.reverted) setPoolReserves(poolAddress, reserveBalances.value, blockNumber);

  updateHooliganSupplyPegPercent(blockNumber);

  updateHooliganValues(HOOLIGAN_ERC20_V1.toHexString(), timestamp, newPrice, ZERO_BI, volumeHooligan, volumeUSD, deltaLiquidityUSD);
  updatePoolValues(poolAddress, timestamp, blockNumber, volumeHooligan, volumeUSD, deltaLiquidityUSD, deltaB);
  updatePoolPrice(poolAddress, timestamp, blockNumber, newPrice);
}

function handleSwap(
  poolAddress: string,
  sold_id: BigInt,
  tokens_sold: BigInt,
  bought_id: BigInt,
  tokens_bought: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let pool = loadOrCreatePool(poolAddress, blockNumber);

  // Get Curve Price Details
  let curveCalc = CalculationsCurve.bind(CALCULATIONS_CURVE);
  let metapoolPrice = toDecimal(curveCalc.getCurvePriceUsdc(CRV3_POOL_V1));

  let lpContract = Hooligan3CRV.bind(Address.fromString(poolAddress));
  let hooliganCrvPrice = ZERO_BD;
  let lusd3crvPrice = ZERO_BD;

  if (poolAddress == HOOLIGAN_3CRV_V1.toHexString()) {
    hooliganCrvPrice = toDecimal(lpContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromI32(1000000)), 18);
  } else if (poolAddress == HOOLIGAN_LUSD_V1.toHexString()) {
    // price in LUSD
    let priceInLusd = toDecimal(lpContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromI32(1000000)), 18);
    log.info("LiquidityChange: Hooligan LUSD price: {}", [priceInLusd.toString()]);

    let lusdContract = Hooligan3CRV.bind(LUSD_3POOL);
    log.info("LiquidityChange: LUSD Crv price {}", [
      toDecimal(lusdContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromString("1000000000000000000")), 18).toString()
    ]);

    lusd3crvPrice = toDecimal(lusdContract.get_dy(ZERO_BI, BigInt.fromI32(1), BigInt.fromString("1000000000000000000")), 18);
    hooliganCrvPrice = priceInLusd.times(lusd3crvPrice);
  }

  log.info("LiquidityChange: Hooligan Crv price: {}", [hooliganCrvPrice.toString()]);

  let newPrice = metapoolPrice.times(hooliganCrvPrice);

  log.info("LiquidityChange: Hooligan USD price: {}", [newPrice.toString()]);

  let hooligan = loadHooligan(HOOLIGAN_ERC20_V1.toHexString());

  let hooliganContract = ERC20.bind(HOOLIGAN_ERC20_V1);
  let crv3PoolContract = ERC20.bind(CRV3_POOL_V1);
  let lusdContract = ERC20.bind(LUSD_3POOL);

  let hooliganHolding = toDecimal(hooliganContract.balanceOf(Address.fromString(poolAddress)));
  let crvHolding = toDecimal(crv3PoolContract.balanceOf(Address.fromString(poolAddress)), 18);
  let lusdHolding = toDecimal(lusdContract.balanceOf(Address.fromString(poolAddress)), 18);

  let hooliganValue = hooliganHolding.times(newPrice);
  let crvValue = crvHolding.times(metapoolPrice);
  let lusdValue = lusdHolding.times(lusd3crvPrice).times(metapoolPrice);

  let deltaB = BigInt.fromString(
    crvValue.plus(lusdValue).minus(hooliganHolding).times(BigDecimal.fromString("1000000")).truncate(0).toString()
  );

  let liquidityUSD = hooliganValue.plus(crvValue);

  let deltaLiquidityUSD = liquidityUSD.minus(pool.liquidityUSD);

  let volumeHooligan = ZERO_BI;
  if (sold_id == ZERO_BI) {
    volumeHooligan = tokens_sold;
  } else if (bought_id == ZERO_BI) {
    volumeHooligan = tokens_bought;
  }

  let reserveBalances = lpContract.try_get_balances();
  if (!reserveBalances.reverted) setPoolReserves(poolAddress, reserveBalances.value, blockNumber);

  updateHooliganSupplyPegPercent(blockNumber);

  let volumeUSD = toDecimal(volumeHooligan).times(newPrice);
  updateHooliganValues(HOOLIGAN_ERC20_V1.toHexString(), timestamp, newPrice, ZERO_BI, volumeHooligan, volumeUSD, deltaLiquidityUSD);
  updatePoolValues(poolAddress, timestamp, blockNumber, volumeHooligan, volumeUSD, deltaLiquidityUSD, deltaB);
  updatePoolPrice(poolAddress, timestamp, blockNumber, newPrice);
}
