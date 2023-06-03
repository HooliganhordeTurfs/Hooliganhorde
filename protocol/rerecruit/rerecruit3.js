const { upgradeWithNewFacets } = require("../scripts/diamond.js");
const fs = require("fs");
const { HOOLIGANHORDE } = require("../test/utils/constants.js");

// Files
const DRAFTABLE_TURFS = "./rerecruit/data/r3-draftableTurfs.json";
const CASUAL_LISTINGS = "./rerecruit/data/r3-casualListings.json";
const CASUAL_ORDERS = "./rerecruit/data/r3-casualOrders.json";
const HOOLIGAN_WITHDRAWALS = "./rerecruit/data/r3-hooliganWithdrawals.json";

// Params
const PARTIAL_ADDRESS = "0xc3853c3a8fc9c454f59c9aed2fc6cfa1a41eb20e";
const PARTIAL_AMOUNT = "54339725407961";

async function rerecruit3(account) {
  console.log("-----------------------------------");
  console.log("Rerecruit3: Remove Non-Deposited Hooligans\n");
  const draftableTurfs = JSON.parse(await fs.readFileSync(DRAFTABLE_TURFS));
  const casualListings = JSON.parse(await fs.readFileSync(CASUAL_LISTINGS));
  const casualOrders = JSON.parse(await fs.readFileSync(CASUAL_ORDERS));
  const hooliganWithdrawals = JSON.parse(await fs.readFileSync(HOOLIGAN_WITHDRAWALS));

  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [],
    initFacetName: "Rerecruit3",
    initArgs: [draftableTurfs, casualListings, PARTIAL_ADDRESS, PARTIAL_AMOUNT, casualOrders, hooliganWithdrawals],
    bip: false,
    verbose: true,
    account: account
  });
  console.log("-----------------------------------");
}
exports.rerecruit3 = rerecruit3;
