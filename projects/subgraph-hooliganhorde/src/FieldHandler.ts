import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import {
  FundFundraiser,
  Draft,
  TurfTransfer,
  Sow,
  SupplyDecrease,
  SupplyIncrease,
  SupplyNeutral,
  WeatherChange
} from "../generated/Field/Hooliganhorde";
import { CurvePrice } from "../generated/Field/CurvePrice";
import { Draft as DraftEntity } from "../generated/schema";
import { HOOLIGANHORDE, HOOLIGANHORDE_FARMS, CURVE_PRICE } from "./utils/Constants";
import { ONE_BD, toDecimal, ZERO_BD, ZERO_BI } from "./utils/Decimals";
import { loadGuvnor } from "./utils/Guvnor";
import { loadField, loadFieldDaily, loadFieldHourly } from "./utils/Field";
import { loadTurf } from "./utils/Turf";
import { saveCasualTransfer } from "./utils/CasualTransfer";
import { loadGameday } from "./utils/Gameday";
import { loadHooliganhorde } from "./utils/Hooliganhorde";

export function handleWeatherChange(event: WeatherChange): void {
  let field = loadField(event.address);
  let fieldHourly = loadFieldHourly(event.address, event.params.gameday.toI32(), event.block.timestamp);
  let fieldDaily = loadFieldDaily(event.address, event.block.timestamp);

  field.intensity += event.params.change;
  fieldHourly.intensity += event.params.change;
  fieldDaily.intensity += event.params.change;

  // Real Rate of Return

  let gameday = loadGameday(event.address, event.params.gameday);
  let curvePrice = CurvePrice.bind(CURVE_PRICE);
  let currentPrice = gameday.price == ZERO_BD ? toDecimal(curvePrice.getCurve().price, 6) : gameday.price;

  field.realRateOfReturn = ONE_BD.plus(BigDecimal.fromString((field.intensity / 100).toString())).div(currentPrice);
  fieldHourly.realRateOfReturn = field.realRateOfReturn;
  fieldHourly.realRateOfReturn = field.realRateOfReturn;

  field.save();
  fieldHourly.save();
  fieldDaily.save();
}

export function handleSow(event: Sow): void {
  let hooliganhorde = loadHooliganhorde(event.address);

  let sownHooligans = event.params.hooligans;

  if (event.params.account == HOOLIGANHORDE_FARMS) {
    let startingField = loadField(event.address);
    sownHooligans = startingField.rage;
  }

  // Update Hooliganhorde Totals
  updateFieldTotals(
    event.address,
    hooliganhorde.lastGameday,
    ZERO_BI,
    sownHooligans,
    event.params.casuals,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );

  // Update Guvnor Totals
  updateFieldTotals(
    event.params.account,
    hooliganhorde.lastGameday,
    ZERO_BI,
    sownHooligans,
    event.params.casuals,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );

  let field = loadField(event.address);
  let guvnor = loadGuvnor(event.params.account);
  let turf = loadTurf(event.address, event.params.index);

  let newIndexes = field.turfIndexes;
  newIndexes.push(turf.index);
  field.turfIndexes = newIndexes;
  field.save();

  turf.guvnor = event.params.account.toHexString();
  turf.source = "SOW";
  turf.gameday = field.gameday;
  turf.creationHash = event.transaction.hash.toHexString();
  turf.createdAt = event.block.timestamp;
  turf.updatedAt = event.block.timestamp;
  turf.hooligans = event.params.hooligans;
  turf.casuals = event.params.casuals;
  turf.sownCasuals = event.params.casuals;
  turf.intensity = field.intensity;
  turf.save();

  // Increment protocol amounts
  incrementSows(event.address, field.gameday, event.block.timestamp);

  // Increment guvnor amounts
  incrementSows(event.params.account, field.gameday, event.block.timestamp);
}

export function handleDraft(event: Draft): void {
  let hooliganhorde = loadHooliganhorde(event.address);
  let gameday = loadGameday(event.address, BigInt.fromI32(hooliganhorde.lastGameday));

  // Draft function is only called with a list of turfs

  // Update turfs and field totals

  let remainingIndex = ZERO_BI;

  for (let i = 0; i < event.params.turfs.length; i++) {
    // Turf should exist
    let turf = loadTurf(event.address, event.params.turfs[i]);

    let draftableCasuals = gameday.draftableIndex.minus(turf.index);

    if (draftableCasuals >= turf.casuals) {
      // Turf fully drafts
      updateFieldTotals(
        event.address,
        hooliganhorde.lastGameday,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        turf.casuals,
        event.block.timestamp,
        event.block.number
      );
      updateFieldTotals(
        event.params.account,
        hooliganhorde.lastGameday,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        turf.casuals,
        event.block.timestamp,
        event.block.number
      );

      turf.draftedCasuals = turf.casuals;
      turf.fullyDrafted = true;
      turf.save();
    } else {
      // Turf partially drafts

      updateFieldTotals(
        event.address,
        hooliganhorde.lastGameday,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        draftableCasuals,
        event.block.timestamp,
        event.block.number
      );
      updateFieldTotals(
        event.params.account,
        hooliganhorde.lastGameday,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        draftableCasuals,
        event.block.timestamp,
        event.block.number
      );

      remainingIndex = turf.index.plus(draftableCasuals);
      let remainingCasuals = turf.casuals.minus(draftableCasuals);

      let remainingTurf = loadTurf(event.address, remainingIndex);
      remainingTurf.guvnor = turf.guvnor;
      remainingTurf.source = "DRAFT";
      remainingTurf.gameday = hooliganhorde.lastGameday;
      remainingTurf.creationHash = event.transaction.hash.toHexString();
      remainingTurf.createdAt = event.block.timestamp;
      remainingTurf.updatedAt = event.block.timestamp;
      remainingTurf.index = remainingIndex;
      remainingTurf.hooligans = ZERO_BI;
      remainingTurf.casuals = remainingCasuals;
      remainingTurf.intensity = turf.intensity;
      remainingTurf.save();

      turf.draftedCasuals = draftableCasuals;
      turf.casuals = draftableCasuals;
      turf.fullyDrafted = true;
      turf.save();
    }
  }

  // Remove the drafted turf IDs from the field list
  let field = loadField(event.address);
  let newIndexes = field.turfIndexes;
  for (let i = 0; i < event.params.turfs.length; i++) {
    let turfIndex = newIndexes.indexOf(event.params.turfs[i]);
    newIndexes.splice(turfIndex, 1);
    newIndexes.sort();
  }
  if (remainingIndex !== ZERO_BI) {
    newIndexes.push(remainingIndex);
  }
  field.turfIndexes = newIndexes;
  field.save();

  // Save the low level details for the event.
  let draft = new DraftEntity("draft-" + event.transaction.hash.toHexString() + "-" + event.transactionLogIndex.toString());
  draft.hash = event.transaction.hash.toHexString();
  draft.logIndex = event.transactionLogIndex.toI32();
  draft.protocol = event.address.toHexString();
  draft.guvnor = event.params.account.toHexString();
  draft.turfs = event.params.turfs;
  draft.hooligans = event.params.hooligans;
  draft.blockNumber = event.block.number;
  draft.createdAt = event.block.timestamp;
  draft.save();
}

export function handleTurfTransfer(event: TurfTransfer): void {
  let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE);
  let gameday = loadGameday(event.address, BigInt.fromI32(hooliganhorde.lastGameday));

  // Ensure both guvnor entites exist
  let fromGuvnor = loadGuvnor(event.params.from);
  let toGuvnor = loadGuvnor(event.params.to);

  // Update guvnor field data
  updateFieldTotals(
    event.params.from,
    hooliganhorde.lastGameday,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI.minus(event.params.casuals),
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
  updateFieldTotals(
    event.params.to,
    hooliganhorde.lastGameday,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.params.casuals,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );

  let field = loadField(HOOLIGANHORDE);
  let sortedTurfs = field.turfIndexes.sort();

  let sourceIndex = ZERO_BI;

  for (let i = 0; i < sortedTurfs.length; i++) {
    // Handle only single comparison for first value of array
    if (i == 0) {
      if (sortedTurfs[i] == event.params.id) {
        sourceIndex = sortedTurfs[i];
        break;
      } else {
        continue;
      }
    }
    // Transferred turf matches existing. Start value of zero.
    if (sortedTurfs[i] == event.params.id) {
      sourceIndex = sortedTurfs[i];
      break;
    }
    // Transferred turf is in the middle of existing turf. Non-zero start value.
    if (sortedTurfs[i - 1] < event.params.id && event.params.id < sortedTurfs[i]) {
      sourceIndex = sortedTurfs[i - 1];
    }
  }

  let sourceTurf = loadTurf(event.address, sourceIndex);
  let sourceEndIndex = sourceIndex.plus(sourceTurf.casuals);
  let transferEndIndex = event.params.id.plus(event.params.casuals);

  log.debug("\nCasualTransfer: ===================\n", []);
  log.debug("\nCasualTransfer: Transfer Gameday - {}\n", [field.gameday.toString()]);
  log.debug("\nCasualTransfer: Transfer Index - {}\n", [event.params.id.toString()]);
  log.debug("\nCasualTransfer: Transfer Casuals - {}\n", [event.params.casuals.toString()]);
  log.debug("\nCasualTransfer: Transfer Ending Index - {}\n", [event.params.id.plus(event.params.casuals).toString()]);
  log.debug("\nCasualTransfer: Source Index - {}\n", [sourceIndex.toString()]);
  log.debug("\nCasualTransfer: Source Ending Index - {}\n", [sourceIndex.plus(sourceTurf.casuals).toString()]);
  log.debug("\nCasualTransfer: Starting Source Casuals - {}\n", [sourceTurf.casuals.toString()]);

  // Actually transfer the turfs
  if (sourceTurf.casuals == event.params.casuals) {
    // Sending full turf
    sourceTurf.guvnor = event.params.to.toHexString();
    sourceTurf.updatedAt = event.block.timestamp;
    sourceTurf.save();
    log.debug("\nCasualTransfer: Sending full turf\n", []);
  } else if (sourceIndex == event.params.id) {
    // We are only needing to split this turf once to send
    // Start value of zero
    let remainderIndex = sourceIndex.plus(event.params.casuals);
    let remainderTurf = loadTurf(event.address, remainderIndex);
    sortedTurfs.push(remainderIndex);

    sourceTurf.guvnor = event.params.to.toHexString();
    sourceTurf.updatedAt = event.block.timestamp;
    sourceTurf.casuals = event.params.casuals;
    sourceTurf.save();

    remainderTurf.guvnor = event.params.from.toHexString();
    remainderTurf.source = "TRANSFER";
    remainderTurf.gameday = field.gameday;
    remainderTurf.creationHash = event.transaction.hash.toHexString();
    remainderTurf.createdAt = event.block.timestamp;
    remainderTurf.updatedAt = event.block.timestamp;
    remainderTurf.index = remainderIndex;
    remainderTurf.casuals = sourceEndIndex.minus(transferEndIndex);
    remainderTurf.intensity = sourceTurf.intensity;
    remainderTurf.save();

    log.debug("\nCasualTransfer: sourceIndex == transferIndex\n", []);
    log.debug("\nCasualTransfer: Remainder Index - {}\n", [remainderIndex.toString()]);
    log.debug("\nCasualTransfer: Source Casuals - {}\n", [sourceTurf.casuals.toString()]);
    log.debug("\nCasualTransfer: Remainder Casuals - {}\n", [remainderTurf.casuals.toString()]);
  } else if (sourceEndIndex == transferEndIndex) {
    // We are only needing to split this turf once to send
    // Non-zero start value. Sending to end of turf
    let toTurf = loadTurf(event.address, event.params.id);
    sortedTurfs.push(event.params.id);

    sourceTurf.updatedAt = event.block.timestamp;
    sourceTurf.casuals = sourceTurf.casuals.minus(event.params.casuals);
    sourceTurf.save();

    toTurf.guvnor = event.params.to.toHexString();
    toTurf.source = "TRANSFER";
    toTurf.gameday = field.gameday;
    toTurf.creationHash = event.transaction.hash.toHexString();
    toTurf.createdAt = event.block.timestamp;
    toTurf.updatedAt = event.block.timestamp;
    toTurf.index = event.params.id;
    toTurf.casuals = event.params.casuals;
    toTurf.intensity = sourceTurf.intensity;
    toTurf.save();

    log.debug("\nCasualTransfer: sourceEndIndex == transferEndIndex\n", []);
    log.debug("\nCasualTransfer: Updated Source Casuals - {}\n", [sourceTurf.casuals.toString()]);
  } else {
    // We have to split this turf twice to send
    let remainderIndex = event.params.id.plus(event.params.casuals);
    let toTurf = loadTurf(event.address, event.params.id);
    let remainderTurf = loadTurf(event.address, remainderIndex);

    sortedTurfs.push(event.params.id);
    sortedTurfs.push(remainderIndex);

    sourceTurf.updatedAt = event.block.timestamp;
    sourceTurf.casuals = event.params.id.minus(sourceTurf.index);
    sourceTurf.save();

    toTurf.guvnor = event.params.to.toHexString();
    toTurf.source = "TRANSFER";
    toTurf.gameday = field.gameday;
    toTurf.creationHash = event.transaction.hash.toHexString();
    toTurf.createdAt = event.block.timestamp;
    toTurf.updatedAt = event.block.timestamp;
    toTurf.index = event.params.id;
    toTurf.casuals = event.params.casuals;
    toTurf.intensity = sourceTurf.intensity;
    toTurf.save();

    remainderTurf.guvnor = event.params.from.toHexString();
    remainderTurf.source = "TRANSFER";
    remainderTurf.gameday = field.gameday;
    remainderTurf.creationHash = event.transaction.hash.toHexString();
    remainderTurf.createdAt = event.block.timestamp;
    remainderTurf.updatedAt = event.block.timestamp;
    remainderTurf.index = remainderIndex;
    remainderTurf.casuals = sourceEndIndex.minus(transferEndIndex);
    remainderTurf.intensity = sourceTurf.intensity;
    remainderTurf.save();

    log.debug("\nCasualTransfer: split source twice\n", []);
    log.debug("\nCasualTransfer: Updated Source Casuals - {}\n", [sourceTurf.casuals.toString()]);
    log.debug("\nCasualTransfer: Transferred Casuals - {}\n", [toTurf.casuals.toString()]);
    log.debug("\nCasualTransfer: Remainder Casuals - {}\n", [remainderTurf.casuals.toString()]);
  }
  sortedTurfs.sort();
  field.turfIndexes = sortedTurfs;
  field.save();

  // Update any draftable casual amounts
  updateDraftableTurfs(gameday.draftableIndex, event.block.timestamp, event.block.number);

  // Save the raw event data
  saveCasualTransfer(event);
}

export function handleSupplyIncrease(event: SupplyIncrease): void {
  updateFieldTotals(
    event.address,
    event.params.gameday.toI32(),
    event.params.newRage,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
}

export function handleSupplyDecrease(event: SupplyDecrease): void {
  updateFieldTotals(
    event.address,
    event.params.gameday.toI32(),
    event.params.newRage,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
}

export function handleSupplyNeutral(event: SupplyNeutral): void {
  updateFieldTotals(
    event.address,
    event.params.gameday.toI32(),
    event.params.newRage,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
}

export function handleFundFundraiser(event: FundFundraiser): void {
  // Account for the fact thta fundraiser sow using no rage.
  let hooliganhorde = loadHooliganhorde(event.address);
  updateFieldTotals(
    event.address,
    hooliganhorde.lastGameday,
    ZERO_BI,
    ZERO_BI.minus(event.params.amount),
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
}

function updateFieldTotals(
  account: Address,
  gameday: i32,
  rage: BigInt,
  sownHooligans: BigInt,
  sownCasuals: BigInt,
  transferredCasuals: BigInt,
  draftableCasuals: BigInt,
  draftedCasuals: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let field = loadField(account);
  let fieldHourly = loadFieldHourly(account, gameday, timestamp);
  let fieldDaily = loadFieldDaily(account, timestamp);

  field.gameday = gameday;
  field.rage = field.rage.plus(rage).minus(sownHooligans);
  field.sownHooligans = field.sownHooligans.plus(sownHooligans);
  field.undraftableCasuals = field.undraftableCasuals.plus(sownCasuals).minus(draftableCasuals).plus(transferredCasuals);
  field.draftableCasuals = field.draftableCasuals.plus(draftableCasuals).minus(draftedCasuals);
  field.draftedCasuals = field.draftedCasuals.plus(draftedCasuals);
  field.casualIndex = field.casualIndex.plus(sownCasuals);
  field.save();

  fieldHourly.rage = field.rage;
  fieldHourly.sownHooligans = field.sownHooligans;
  fieldHourly.undraftableCasuals = field.undraftableCasuals;
  fieldHourly.draftableCasuals = field.draftableCasuals;
  fieldHourly.draftedCasuals = field.draftedCasuals;
  fieldHourly.casualIndex = field.casualIndex;
  fieldHourly.issuedRage = fieldHourly.issuedRage.plus(rage);
  fieldHourly.deltaSownHooligans = fieldHourly.deltaSownHooligans.plus(sownHooligans);
  fieldHourly.deltaUndraftableCasuals = fieldHourly.deltaUndraftableCasuals
    .plus(sownCasuals)
    .minus(draftableCasuals)
    .plus(transferredCasuals);
  fieldHourly.deltaDraftableCasuals = fieldHourly.deltaDraftableCasuals.plus(draftableCasuals).minus(draftedCasuals);
  fieldHourly.deltaDraftedCasuals = fieldHourly.deltaDraftedCasuals.plus(draftedCasuals);
  fieldHourly.blockNumber = fieldHourly.blockNumber == ZERO_BI ? blockNumber : fieldHourly.blockNumber;
  fieldHourly.updatedAt = timestamp;
  if (field.rage == ZERO_BI) {
    fieldHourly.blocksToSoldOutRage = blockNumber.minus(fieldHourly.blockNumber);
    fieldHourly.rageSoldOut = true;
  }
  fieldHourly.save();

  fieldDaily.rage = field.rage;
  fieldDaily.sownHooligans = field.sownHooligans;
  fieldDaily.undraftableCasuals = field.undraftableCasuals;
  fieldDaily.draftableCasuals = field.draftableCasuals;
  fieldDaily.draftedCasuals = field.draftedCasuals;
  fieldDaily.casualIndex = field.casualIndex;
  fieldDaily.issuedRage = fieldDaily.issuedRage.plus(rage);
  fieldDaily.deltaSownHooligans = fieldDaily.deltaSownHooligans.plus(sownHooligans);
  fieldDaily.deltaUndraftableCasuals = fieldDaily.deltaUndraftableCasuals
    .plus(sownCasuals)
    .minus(draftableCasuals)
    .plus(transferredCasuals);
  fieldDaily.deltaDraftableCasuals = fieldDaily.deltaDraftableCasuals.plus(draftableCasuals).minus(draftedCasuals);
  fieldDaily.deltaDraftedCasuals = fieldDaily.deltaDraftedCasuals.plus(draftedCasuals);
  fieldDaily.updatedAt = timestamp;
  fieldDaily.save();
}

export function updateDraftableTurfs(draftableIndex: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
  let field = loadField(HOOLIGANHORDE);
  let sortedIndexes = field.turfIndexes.sort();

  for (let i = 0; i < sortedIndexes.length; i++) {
    if (sortedIndexes[i] > draftableIndex) {
      break;
    }
    let turf = loadTurf(HOOLIGANHORDE, sortedIndexes[i]);

    // Turf is fully draftable, but hasn't been drafted yet
    if (turf.draftableCasuals == turf.casuals) {
      continue;
    }

    let draftableCasuals = draftableIndex.minus(turf.index);
    let oldDraftableCasuals = turf.draftableCasuals;
    turf.draftableCasuals = draftableCasuals >= turf.casuals ? turf.casuals : draftableCasuals;
    turf.save();

    let deltaDraftableCasuals = oldDraftableCasuals == ZERO_BI ? turf.draftableCasuals : turf.draftableCasuals.minus(oldDraftableCasuals);

    updateFieldTotals(
      HOOLIGANHORDE,
      field.gameday,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      deltaDraftableCasuals,
      ZERO_BI,
      timestamp,
      blockNumber
    );
    updateFieldTotals(
      Address.fromString(turf.guvnor),
      field.gameday,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      deltaDraftableCasuals,
      ZERO_BI,
      timestamp,
      blockNumber
    );
  }
}

function incrementSowers(account: Address, gameday: i32, timestamp: BigInt): void {
  // Increment total number of sowers by one
  let field = loadField(account);
  let fieldHourly = loadFieldHourly(account, gameday, timestamp);
  let fieldDaily = loadFieldDaily(account, timestamp);

  field.numberOfSowers += 1;
  field.save();

  fieldHourly.numberOfSowers = field.numberOfSowers;
  fieldHourly.deltaNumberOfSowers += 1;
  fieldHourly.save();

  fieldDaily.numberOfSowers = field.numberOfSowers;
  fieldDaily.deltaNumberOfSowers += 1;
  fieldDaily.save();
}

function incrementSows(account: Address, gameday: i32, timestamp: BigInt): void {
  // Increment total sows by one
  let field = loadField(account);
  let fieldHourly = loadFieldHourly(account, gameday, timestamp);
  let fieldDaily = loadFieldDaily(account, timestamp);

  // Add to protocol numberOfSowers if needed
  if (account != HOOLIGANHORDE && field.numberOfSows == 0) incrementSowers(HOOLIGANHORDE, gameday, timestamp);

  // Update sower counts
  field.numberOfSows += 1;
  field.save();

  fieldHourly.numberOfSows = field.numberOfSows;
  fieldHourly.deltaNumberOfSows += 1;
  fieldHourly.save();

  fieldDaily.numberOfSows = field.numberOfSows;
  fieldDaily.deltaNumberOfSows += 1;
  fieldDaily.save();
}
