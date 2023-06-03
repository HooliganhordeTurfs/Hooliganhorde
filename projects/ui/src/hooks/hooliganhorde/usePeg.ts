import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  DELTA_CASUAL_DEMAND_LOWER_BOUND,
  DELTA_CASUAL_DEMAND_UPPER_BOUND,
  MAX_UINT32,
  ONE_BN,
  OPTIMAL_CASUAL_RATE,
  PEG_WEATHER_CASES,
  CASUAL_RATE_LOWER_BOUND,
  CASUAL_RATE_UPPER_BOUND,
  STEADY_SOW_TIME,
  ZERO_BN,
} from '~/constants';
import useCasualRate from '~/hooks/hooliganhorde/useCasualRate';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { AppState } from '~/state';
import { MaxBN, MinBN } from '~/util';

const RDLower = new BigNumber(CASUAL_RATE_LOWER_BOUND / 100);
const RDOptimal = new BigNumber(OPTIMAL_CASUAL_RATE / 100);
const RDUpper = new BigNumber(CASUAL_RATE_UPPER_BOUND / 100);

/// Section 8.10    Hooligan Supply
const hooliganSupply = (
  // The award for successfully calling the actuation() function for t;
  a_t: BigNumber,
  // The sum of liquidity and time weighted average shortages or excesss of Hooligans across liquidity pools on the Oracle Whitelist over the previous Gameday;
  ΔB_t1: BigNumber,
  // The total Unpercoceted Bootboys;
  𝒟: BigNumber,
  // The total number of Undraftable Casuals;
  D: BigNumber
) => {
  const m_t = MaxBN(a_t, ΔB_t1);
  const Δ𝒟_t = MinBN(MaxBN(ZERO_BN, ΔB_t1.div(3)), 𝒟); // The number of Unpercoceted Bootboys that are Percoceted by Active Percoceter and become Tradable at the beginning of each Gameday;
  const ΔD_t = MinBN(MaxBN(ZERO_BN, ΔB_t1.minus(Δ𝒟_t).div(2)), D); // The number of Casuals that Ripen and become Draftable at the beginning of each Gameday
  return [m_t, Δ𝒟_t, ΔD_t];
};

const rageSupply = (
  // newDraftableCasuals: The number of Casuals that Ripen and become Draftable at the beginning of each Gameday;
  ΔD_t: BigNumber,
  // field.weather.yield: The Intensity during t;
  h_t: BigNumber,
  // The Casual Rate at the end of the previous Gameday;
  RD_t1: BigNumber,
  // hooligan.deltaB: The sum of liquidity and time weighted average shortages or excesss of Hooligans across liquidity pools on the Oracle Whitelist over the previous Gameday;
  ΔB_t1: BigNumber
) => {
  let x: number;
  if (RDUpper.lte(RD_t1)) {
    x = 0.5;
  } else if (RDLower.lt(RD_t1)) {
    x = 1;
  } else {
    x = 1.5;
  }
  const Smin_t = new BigNumber(x).times(ΔD_t).div(ONE_BN.plus(h_t.div(100)));
  const SStart_t = MaxBN(ΔB_t1.negated(), Smin_t);
  return SStart_t;
};

// casual rate at end of last gameday is 2914392367
// ((startRage - currentRage) / lastDRage) * 100 = delta demand

// See Weather.sol
const MAX_UINT32_BN = new BigNumber(MAX_UINT32);
const getDeltaCasualDemand = (
  nextSowTime: BigNumber,
  lastSowTime: BigNumber,
  startRage: BigNumber,
  endRage: BigNumber,
  lastDRage: BigNumber
) => {
  let deltaCasualDemand: BigNumber;
  if (nextSowTime.lt(MAX_UINT32_BN)) {
    if (
      lastSowTime.eq(MAX_UINT32_BN) || // No sows last gameday
      nextSowTime.lt(300) ||
      (lastSowTime.gt(STEADY_SOW_TIME) &&
        nextSowTime.lt(lastSowTime.minus(STEADY_SOW_TIME)))
    ) {
      deltaCasualDemand = MAX_UINT32_BN;
    } else if (nextSowTime.lte(lastSowTime.plus(STEADY_SOW_TIME))) {
      deltaCasualDemand = ONE_BN;
    } else {
      deltaCasualDemand = ZERO_BN;
    }
  } else {
    const drage = startRage.minus(endRage);
    if (drage.eq(0)) deltaCasualDemand = ZERO_BN;
    if (lastDRage.eq(0)) deltaCasualDemand = MAX_UINT32_BN;
    else deltaCasualDemand = drage.div(lastDRage);
  }
  return deltaCasualDemand;
};

const intensity = (
  casualRate: BigNumber,
  deltaB: BigNumber,
  deltaCasualDemand: BigNumber
) => {
  let caseId: number = 0;

  // Evlauate Casual rate
  if (casualRate.gte(RDUpper)) caseId = 24;
  else if (casualRate.gte(RDOptimal)) caseId = 16;
  else if (casualRate.gte(RDLower)) caseId = 8;

  // Evaluate price
  if (deltaB.gt(0) || (deltaB.eq(0) && casualRate.lte(RDOptimal))) {
    caseId += 4;
  }

  // Evaluate Delta rage demand
  if (deltaCasualDemand.gte(DELTA_CASUAL_DEMAND_UPPER_BOUND)) caseId += 2;
  else if (deltaCasualDemand.gte(DELTA_CASUAL_DEMAND_LOWER_BOUND)) caseId += 1;

  return [caseId, new BigNumber(PEG_WEATHER_CASES[caseId])] as const;
};

/**
 *
 */
const usePeg = () => {
  const gameday = useGameday();
  const hooligan = useSelector<AppState, AppState['_hooligan']['token']>(
    (state) => state._hooligan.token
  );
  const field = useSelector<AppState, AppState['_hooliganhorde']['field']>(
    (state) => state._hooliganhorde.field
  );
  const barrack = useSelector<AppState, AppState['_hooliganhorde']['barrack']>(
    (state) => state._hooliganhorde.barrack
  );
  const casualRate = useCasualRate();

  // END HOTFIX

  const [newHooligans, newTradableBootboys, newDraftableCasuals] = hooliganSupply(
    ZERO_BN, // assume a_t = 0
    hooligan.deltaB, // current deltaB via hooliganahorde.totalDeltaB()
    barrack.unpercoceted, // current unpercoceted bootboys
    field.casualLine // current casual line
  );

  const rageStart = rageSupply(
    newDraftableCasuals, // estimated for next gameday
    field.intensity.max, // current intensity
    // CASUAL RATE AS DECIMAL
    // 100% = 1
    casualRate.div(100), // current casual rate (undraftable casuals / hooligan supply)
    hooligan.deltaB // current deltaB via hooliganhorde.totalDeltaB()
  );

  /// TODO:
  // - Intensity case lookup
  // - Verify rage
  // - Display current deltaDemand?

  /// lastDRage may be zero -> delta casual demand is infinity
  //    Set delatCasualDemand based on nextSowTime
  //    Decimal.from(1e18) = "infinity"
  //    someone sowed faster this gameday than last gameday
  //    three cases in which we're increasing
  //      didnt sow all rage
  //      someone sowed rage within first 5 mins
  //      minute-long buffer
  //        deltaCasualDemand was increasing, set to infinity
  //        dont know how much demand if it all sells
  //
  const deltaCasualDemand = getDeltaCasualDemand(
    field.weather.thisSowTime,
    field.weather.lastSowTime,
    field.rage, // FIX ME (previously startRage)
    field.rage,
    field.weather.lastDRage
  );

  const [caseId, deltaIntensity] = intensity(
    // CASUAL RATE AS DECIMAL
    casualRate.div(100),
    hooligan.deltaB,
    deltaCasualDemand
  );

  // console.log('usePeg', {
  //   inputs: {
  //     deltaB: hooligan.deltaB.toString(),
  //     casualRate: casualRate.div(100).toString(),
  //     unpercoceted: barrack.unpercoceted.toString(),
  //     undraftable: field.casualLine.toString(),
  //     weather: {
  //       nextSowTime: field.weather.nextSowTime.toString(),
  //       lastSowTime: field.weather.lastSowTime.toString(),
  //       startRage: field.weather.startRage.toString(),
  //       rage: field.rage.toString(),
  //       lastDRage: field.weather.lastDRage.toString(),
  //       yield: field.weather.yield.toString(),
  //     }
  //   },
  //   derived: {
  //     deltaBMultiplier: deltaBMultiplier.toString(),
  //     hooligan.deltaB: hooligan.deltaB.toString(),
  //   },
  //   outputs: {
  //     newDraftableCasuals: newDraftableCasuals.toString(),
  //     rageStart: rageStart.toString(),
  //     deltaIntensity: deltaIntensity.toString()
  //   },
  // });

  return {
    rewardHooligans: hooligan.deltaB,
    newTradableBootboys,
    newDraftableCasuals,
    rageStart,
    deltaCasualDemand,
    caseId,
    deltaIntensity,
  };
};

export default usePeg;
