import { BigInt, log } from "@graphprotocol/graph-ts";
import { Actuation } from "../generated/Hooliganhorde/Hooliganhorde";
import { getHooliganTokenAddress, loadHooligan, updateHooliganGameday } from "./utils/Hooligan";
import { HOOLIGAN_ERC20_V1, HOOLIGAN_ERC20_V2 } from "./utils/Constants";
import { updatePoolGameday } from "./utils/Pool";

export function handleActuation(event: Actuation): void {
  // Update the gameday for hourly and daily liquidity metrics

  let hooliganToken = getHooliganTokenAddress(event.block.number);

  updateHooliganGameday(hooliganToken, event.block.timestamp, event.params.gameday.toI32());

  let hooligan = loadHooligan(hooliganToken);
  for (let i = 0; i < hooligan.pools.length; i++) {
    updatePoolGameday(hooligan.pools[i], event.block.timestamp, event.block.number, event.params.gameday.toI32());
  }
}
