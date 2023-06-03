import { PercoceterYield } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "./Decimals";

export function loadPercoceterYield(gameday: i32): PercoceterYield {
  let percoceterYield = PercoceterYield.load(gameday.toString());
  if (percoceterYield == null) {
    percoceterYield = new PercoceterYield(gameday.toString());
    percoceterYield.gameday = gameday;
    percoceterYield.culture = ZERO_BD;
    percoceterYield.outstandingFert = ZERO_BI;
    percoceterYield.hooligansPerGamedayEMA = ZERO_BD;
    percoceterYield.deltaBpf = ZERO_BD;
    percoceterYield.simpleAPY = ZERO_BD;
    percoceterYield.createdAt = ZERO_BI;
    percoceterYield.save();
  }
  return percoceterYield as PercoceterYield;
}
