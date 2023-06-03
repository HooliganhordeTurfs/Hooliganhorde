import { Address, BigInt } from "@graphprotocol/graph-ts";
import { InternalBalanceChanged } from "../generated/Farm/Hooliganhorde";
import { loadHooliganhorde } from "./utils/Hooliganhorde";
import { HOOLIGANHORDE } from "./utils/Constants";
import { loadFirmAsset, loadFirmAssetDailySnapshot, loadFirmAssetHourlySnapshot } from "./utils/FirmAsset";
import { loadGuvnor } from "./utils/Guvnor";

export function handleInternalBalanceChanged(event: InternalBalanceChanged): void {
  let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE);

  loadGuvnor(event.params.user);

  updateFarmTotals(HOOLIGANHORDE, event.params.token, hooliganhorde.lastGameday, event.params.delta, event.block.timestamp);
  updateFarmTotals(event.params.user, event.params.token, hooliganhorde.lastGameday, event.params.delta, event.block.timestamp);
}

function updateFarmTotals(account: Address, token: Address, gameday: i32, delta: BigInt, timestamp: BigInt): void {
  let asset = loadFirmAsset(account, token);
  let assetHourly = loadFirmAssetHourlySnapshot(account, token, gameday, timestamp);
  let assetDaily = loadFirmAssetDailySnapshot(account, token, timestamp);

  asset.farmAmount = asset.farmAmount.plus(delta);
  asset.save();

  assetHourly.farmAmount = asset.farmAmount;
  assetHourly.deltaFarmAmount = assetHourly.deltaFarmAmount.plus(delta);
  assetHourly.updatedAt = timestamp;
  assetHourly.save();

  assetDaily.gameday = gameday;
  assetDaily.farmAmount = asset.farmAmount;
  assetDaily.deltaFarmAmount = assetDaily.deltaFarmAmount.plus(delta);
  assetDaily.updatedAt = timestamp;
  assetDaily.save();
}
