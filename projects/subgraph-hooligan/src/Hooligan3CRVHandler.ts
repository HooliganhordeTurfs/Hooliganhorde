import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
  AddLiquidity,
  RemoveLiquidity,
  RemoveLiquidityImbalance,
  RemoveLiquidityOne,
  TokenExchange,
  TokenExchangeUnderlying
} from "../generated/Hooligan3CRV/Hooligan3CRV";
import { CurvePrice } from "../generated/Hooligan3CRV/CurvePrice";
import { loadHooligan, updateHooliganSupplyPegPercent, updateHooliganValues } from "./utils/Hooligan";
import { HOOLIGAN_ERC20_V2, CURVE_PRICE } from "./utils/Constants";
import { toDecimal, ZERO_BD, ZERO_BI } from "./utils/Decimals";
import { setPoolReserves, updatePoolPrice, updatePoolValues } from "./utils/Pool";

export function handleTokenExchange(event: TokenExchange): void {
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
  handleLiquidityChange(
    event.address.toHexString(),
    event.block.timestamp,
    event.block.number,
    event.params.token_amounts[0],
    event.params.token_amounts[1]
  );
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  handleLiquidityChange(
    event.address.toHexString(),
    event.block.timestamp,
    event.block.number,
    event.params.token_amounts[0],
    event.params.token_amounts[1]
  );
}

export function handleRemoveLiquidityImbalance(event: RemoveLiquidityImbalance): void {
  handleLiquidityChange(
    event.address.toHexString(),
    event.block.timestamp,
    event.block.number,
    event.params.token_amounts[0],
    event.params.token_amounts[1]
  );
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {
  handleLiquidityChange(event.address.toHexString(), event.block.timestamp, event.block.number, event.params.coin_amount, ZERO_BI);
}

function handleLiquidityChange(pool: string, timestamp: BigInt, blockNumber: BigInt, token0Amount: BigInt, token1Amount: BigInt): void {
  // Get Curve Price Details
  let curvePrice = CurvePrice.bind(CURVE_PRICE);
  let curve = curvePrice.try_getCurve();

  if (curve.reverted) {
    return;
  }

  let hooligan = loadHooligan(HOOLIGAN_ERC20_V2.toHexString());

  let newPrice = toDecimal(curve.value.price);
  let deltaLiquidityUSD = toDecimal(curve.value.liquidity).minus(hooligan.liquidityUSD);

  let volumeUSD =
    deltaLiquidityUSD < ZERO_BD
      ? deltaLiquidityUSD.div(BigDecimal.fromString("2")).times(BigDecimal.fromString("-1"))
      : deltaLiquidityUSD.div(BigDecimal.fromString("2"));
  let volumeHooligan = BigInt.fromString(volumeUSD.div(newPrice).times(BigDecimal.fromString("1000000")).truncate(0).toString());

  if (token0Amount !== ZERO_BI && token1Amount !== ZERO_BI) {
    volumeUSD = ZERO_BD;
    volumeHooligan = ZERO_BI;
  }

  setPoolReserves(pool, curve.value.balances, blockNumber);
  updateHooliganSupplyPegPercent(blockNumber);

  updateHooliganValues(
    HOOLIGAN_ERC20_V2.toHexString(),
    timestamp,
    toDecimal(curve.value.price),
    ZERO_BI,
    volumeHooligan,
    volumeUSD,
    deltaLiquidityUSD
  );

  updatePoolValues(pool, timestamp, blockNumber, volumeHooligan, volumeUSD, deltaLiquidityUSD, curve.value.deltaB);
  updatePoolPrice(pool, timestamp, blockNumber, newPrice);
}

function handleSwap(
  pool: string,
  sold_id: BigInt,
  tokens_sold: BigInt,
  bought_id: BigInt,
  tokens_bought: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  // Get Curve Price Details
  let curvePrice = CurvePrice.bind(CURVE_PRICE);
  let curve = curvePrice.try_getCurve();

  if (curve.reverted) {
    return;
  }

  let hooligan = loadHooligan(HOOLIGAN_ERC20_V2.toHexString());

  let newPrice = toDecimal(curve.value.price);
  let volumeHooligan = ZERO_BI;

  if (sold_id == ZERO_BI) {
    volumeHooligan = tokens_sold;
  } else if (bought_id == ZERO_BI) {
    volumeHooligan = tokens_bought;
  }
  let volumeUSD = toDecimal(volumeHooligan).times(newPrice);
  let deltaLiquidityUSD = toDecimal(curve.value.liquidity).minus(hooligan.liquidityUSD);

  setPoolReserves(pool, curve.value.balances, blockNumber);
  updateHooliganSupplyPegPercent(blockNumber);

  updateHooliganValues(
    HOOLIGAN_ERC20_V2.toHexString(),
    timestamp,
    toDecimal(curve.value.price),
    ZERO_BI,
    volumeHooligan,
    volumeUSD,
    deltaLiquidityUSD
  );

  updatePoolValues(pool, timestamp, blockNumber, volumeHooligan, volumeUSD, deltaLiquidityUSD, curve.value.deltaB);
  updatePoolPrice(pool, timestamp, blockNumber, newPrice);
}
