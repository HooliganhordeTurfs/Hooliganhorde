import { log } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/Hooligan/Hooligan";
import { loadHooligan, updateHooliganSupplyPegPercent } from "./utils/Hooligan";
import { ADDRESS_ZERO } from "./utils/Constants";

export function handleTransfer(event: Transfer): void {
  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    let hooligan = loadHooligan(event.address.toHexString());

    if (event.params.from == ADDRESS_ZERO) {
      // Minted
      hooligan.supply = hooligan.supply.plus(event.params.value);
    } else {
      // Burned
      hooligan.supply = hooligan.supply.minus(event.params.value);
    }
    hooligan.save();

    updateHooliganSupplyPegPercent(event.block.number);
  }
}
