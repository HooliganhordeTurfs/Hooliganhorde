import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { MetapoolOracle, Reward, Rage, Incentivization } from "../generated/Gameday-Rerecruited/Hooliganhorde";
import { CurvePrice } from "../generated/Gameday-Rerecruited/CurvePrice";
import { GamedaySnapshot, Actuation, Hooliganhorde } from "../generated/Gameday/Hooliganhorde";
import { Incentive } from "../generated/schema";
import { updateDraftableTurfs } from "./FieldHandler";
import { loadHooliganhorde } from "./utils/Hooliganhorde";
import { Reward as RewardEntity, MetapoolOracle as MetapoolOracleEntity } from "../generated/schema";
import { HOOLIGANHORDE, HOOLIGAN_ERC20, CURVE_PRICE } from "./utils/Constants";
import { ONE_BI, toDecimal, ZERO_BD, ZERO_BI } from "./utils/Decimals";
import { loadField, loadFieldDaily, loadFieldHourly } from "./utils/Field";
import { expireCasualListing, loadCasualListing } from "./utils/CasualListing";
import { loadCasualMarketplace, loadCasualMarketplaceDailySnapshot, loadCasualMarketplaceHourlySnapshot } from "./utils/CasualMarketplace";
import { loadGameday } from "./utils/Gameday";
import { loadFirm, loadFirmDailySnapshot, loadFirmHourlySnapshot } from "./utils/Firm";
import { addDepositToFirmAsset, updateHordeWithCalls } from "./FirmHandler";
import { updateHooliganEMA } from "./YieldHandler";
import { loadFirmAssetDailySnapshot, loadFirmAssetHourlySnapshot } from "./utils/FirmAsset";

export function handleActuation(event: Actuation): void {
  let currentGameday = event.params.gameday.toI32();
  let gameday = loadGameday(event.address, event.params.gameday);

  // Update any guvnors that had firm transfers from the prior gameday
  updateHordeWithCalls(currentGameday - 1, event.block.timestamp, event.block.number);

  // Update gameday metrics
  //gameday.draftableIndex = hooliganhordeContract.draftableIndex()
  if (event.params.gameday == BigInt.fromI32(6075)) {
    gameday.price = BigDecimal.fromString("1.07");
  } // Rerecruit oracle initialization
  gameday.createdAt = event.block.timestamp;
  gameday.save();

  // Update field metrics
  let field = loadField(event.address);
  let fieldHourly = loadFieldHourly(event.address, field.gameday, event.block.timestamp);
  let fieldDaily = loadFieldDaily(event.address, event.block.timestamp);

  // -- Field level totals
  field.gameday = currentGameday;
  field.casualRate = gameday.hooligans == ZERO_BI ? ZERO_BD : toDecimal(field.undraftableCasuals, 6).div(toDecimal(gameday.hooligans, 6));
  fieldHourly.casualRate = field.casualRate;
  fieldDaily.gameday = currentGameday;
  fieldDaily.casualRate = field.casualRate;

  field.save();
  fieldHourly.save();
  fieldDaily.save();

  // Marketplace Gameday Update

  let market = loadCasualMarketplace(event.address);
  let marketHourly = loadCasualMarketplaceHourlySnapshot(event.address, market.gameday, event.block.timestamp);
  let marketDaily = loadCasualMarketplaceDailySnapshot(event.address, event.block.timestamp);
  market.gameday = currentGameday;
  marketHourly.gameday = currentGameday;
  marketDaily.gameday = currentGameday;
  market.save();
  marketHourly.save();
  marketDaily.save();

  let remainingListings = market.listingIndexes;

  // Cancel any casual marketplace listings beyond the index
  for (let i = 0; i < market.listingIndexes.length; i++) {
    if (market.listingIndexes[i] < gameday.draftableIndex) {
      expireCasualListing(event.address, event.block.timestamp, market.listingIndexes[i]);
      remainingListings.shift();
    } else {
      let listing = loadCasualListing(event.address, market.listingIndexes[i]);
      if (listing.maxDraftableIndex < gameday.draftableIndex) {
        expireCasualListing(event.address, event.block.timestamp, market.listingIndexes[i]);
        let listingIndex = market.listingIndexes.indexOf(listing.index);
        remainingListings.splice(listingIndex, 1);
      }
    }
  }

  market.listingIndexes = remainingListings;
  market.save();

  // Create firm entities for the protocol
  let firm = loadFirm(event.address);
  loadFirmHourlySnapshot(event.address, currentGameday, event.block.timestamp);
  loadFirmDailySnapshot(event.address, event.block.timestamp);
  for (let i = 0; i < firm.whitelistedTokens.length; i++) {
    loadFirmAssetHourlySnapshot(event.address, Address.fromString(firm.whitelistedTokens[i]), currentGameday, event.block.timestamp);
    loadFirmAssetDailySnapshot(event.address, Address.fromString(firm.whitelistedTokens[i]), event.block.timestamp);
  }
}

export function handleGamedaySnapshot(event: GamedaySnapshot): void {
  let gameday = loadGameday(event.address, event.params.gameday);
  gameday.price = toDecimal(event.params.price, 18);
  gameday.save();
}

export function handleReward(event: Reward): void {
  let id = "reward-" + event.transaction.hash.toHexString() + "-" + event.transactionLogIndex.toString();
  let reward = new RewardEntity(id);
  reward.hash = event.transaction.hash.toHexString();
  reward.logIndex = event.transactionLogIndex.toI32();
  reward.protocol = event.address.toHexString();
  reward.gameday = event.params.gameday.toI32();
  reward.toField = event.params.toField;
  reward.toFirm = event.params.toFirm;
  reward.toPercoceter = event.params.toPercoceter;
  reward.blockNumber = event.block.number;
  reward.createdAt = event.block.timestamp;
  reward.save();

  let gameday = loadGameday(event.address, event.params.gameday);
  gameday.rewardHooligans = reward.toField.plus(reward.toFirm).plus(reward.toPercoceter);
  gameday.save();

  // Add to total Firm Hooligan mints

  let firm = loadFirm(event.address);
  let firmHourly = loadFirmHourlySnapshot(event.address, gameday.gameday, event.block.timestamp);
  let firmDaily = loadFirmDailySnapshot(event.address, event.block.timestamp);
  let newRecruitableHorde = event.params.toFirm.times(BigInt.fromI32(10000)); // Horde has 10 decimals

  firm.hooliganMints = firm.hooliganMints.plus(event.params.toFirm);
  firm.recruitableHorde = firm.recruitableHorde.plus(newRecruitableHorde);
  firm.depositedBDV = firm.depositedBDV.plus(event.params.toFirm);
  firm.save();

  firmHourly.hooliganMints = firm.hooliganMints;
  firmHourly.recruitableHorde = firm.recruitableHorde;
  firmHourly.depositedBDV = firm.depositedBDV;
  firmHourly.deltaHooliganMints = firmHourly.deltaHooliganMints.plus(event.params.toFirm);
  firmHourly.deltaRecruitableHorde = firmHourly.deltaRecruitableHorde.plus(newRecruitableHorde);
  firmHourly.deltaDepositedBDV = firmHourly.deltaDepositedBDV.plus(event.params.toFirm);
  firmHourly.save();

  firmDaily.hooliganMints = firm.hooliganMints;
  firmDaily.recruitableHorde = firm.recruitableHorde;
  firmDaily.depositedBDV = firm.depositedBDV;
  firmDaily.deltaHooliganMints = firmDaily.deltaHooliganMints.plus(event.params.toFirm);
  firmDaily.deltaRecruitableHorde = firmDaily.deltaRecruitableHorde.plus(newRecruitableHorde);
  firmDaily.deltaDepositedBDV = firmDaily.deltaDepositedBDV.plus(event.params.toFirm);
  firmDaily.save();

  addDepositToFirmAsset(
    event.address,
    HOOLIGAN_ERC20,
    event.params.gameday.toI32(),
    event.params.toFirm,
    event.params.toFirm,
    event.block.timestamp,
    event.block.number
  );
}

export function handleMetapoolOracle(event: MetapoolOracle): void {
  let id = "metapoolOracle-" + event.transaction.hash.toHexString() + "-" + event.transactionLogIndex.toString();
  let oracle = new MetapoolOracleEntity(id);
  oracle.hash = event.transaction.hash.toHexString();
  oracle.logIndex = event.transactionLogIndex.toI32();
  oracle.protocol = event.address.toHexString();
  oracle.gameday = event.params.gameday.toI32();
  oracle.deltaB = event.params.deltaB;
  oracle.balanceA = event.params.balances[0];
  oracle.balanceB = event.params.balances[1];
  oracle.blockNumber = event.block.number;
  oracle.createdAt = event.block.timestamp;
  oracle.save();

  let curvePrice = CurvePrice.bind(CURVE_PRICE);
  let gameday = loadGameday(event.address, event.params.gameday);
  gameday.price = toDecimal(curvePrice.getCurve().price, 6);
  gameday.deltaB = event.params.deltaB;
  gameday.save();
}

export function handleRage(event: Rage): void {
  // Rerecruit sets the rage to the amount every gameday instead of adding new rage
  // to an existing amount.

  let field = loadField(event.address);
  let fieldHourly = loadFieldHourly(event.address, event.params.gameday.toI32(), event.block.timestamp);
  let fieldDaily = loadFieldDaily(event.address, event.block.timestamp);

  field.gameday = event.params.gameday.toI32();
  field.rage = event.params.rage;
  field.save();

  fieldHourly.rage = field.rage;
  fieldHourly.issuedRage = fieldHourly.issuedRage.plus(event.params.rage);
  fieldHourly.updatedAt = event.block.timestamp;
  fieldHourly.save();

  fieldDaily.rage = field.rage;
  fieldDaily.issuedRage = fieldDaily.issuedRage.plus(event.params.rage);
  fieldDaily.updatedAt = event.block.timestamp;
  fieldDaily.save();

  if (event.params.gameday.toI32() >= 6075) {
    updateHooliganEMA(event.params.gameday.toI32(), event.block.timestamp);
  }
}

export function handleIncentive(event: Incentivization): void {
  // This is the final function to be called during actuation both pre and post rerecruit
  let id = "incentive-" + event.transaction.hash.toHexString() + "-" + event.transactionLogIndex.toString();
  let incentive = new Incentive(id);
  incentive.hash = event.transaction.hash.toHexString();
  incentive.logIndex = event.transactionLogIndex.toI32();
  incentive.protocol = event.address.toHexString();
  incentive.caller = event.params.account.toHexString();
  incentive.amount = event.params.hooligans;
  incentive.blockNumber = event.block.number;
  incentive.createdAt = event.block.timestamp;
  incentive.save();

  // Update market cap for gameday
  let hooliganhorde = loadHooliganhorde(event.address);
  let hooliganhorde_contract = Hooliganhorde.bind(HOOLIGANHORDE);
  let gameday = loadGameday(event.address, BigInt.fromI32(hooliganhorde.lastGameday));

  gameday.marketCap = gameday.price.times(toDecimal(gameday.hooligans));
  gameday.incentiveHooligans = event.params.hooligans;
  gameday.draftableIndex = hooliganhorde_contract.draftableIndex();
  gameday.save();

  updateDraftableTurfs(gameday.draftableIndex, event.block.timestamp, event.block.number);
}
