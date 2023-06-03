const { getHooliganhorde, impersonateHooliganhordeOwner, mintEth } = require("../../utils");
const fs = require("fs");
const { upgradeWithNewFacets } = require("../diamond");
const { HOOLIGANHORDE } = require("../../test/utils/constants");

const EVENTS_JSON = "./scripts/bip24-event-emission/events.json";

async function emitEvents(mock = true, account = undefined) {
  const firmEvents = JSON.parse(await fs.readFileSync(EVENTS_JSON));

  if (account == undefined) {
    account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);
  }

  hooliganhorde = await getHooliganhorde();
  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [],
    initFacetName: "InitFirmEvents",
    initArgs: [firmEvents],
    selectorsToRemove: ["0x0e2808eb", "0x0d010ea9", "0x261bcf0d"],
    bip: false,
    object: !mock,
    verbose: true,
    account: account
  });
}

exports.emitEvents = emitEvents;
