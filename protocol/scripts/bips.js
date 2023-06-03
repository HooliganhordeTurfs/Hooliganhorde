const { HOOLIGANHORDE } = require("../test/utils/constants");
const { getHooliganhorde, impersonateHooliganhordeOwner, mintEth } = require("../utils");
const { upgradeWithNewFacets } = require("./diamond");
const { impersonatePipeline, deployPipeline } = require("./pipeline");

async function bip30(mock = true, account = undefined) {
  if (account == undefined) {
    account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);
  }

  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [
      "ClubhouseFacet", // Add Clubhouse
      "TokenSupportFacet", // Add ERC-20 permit function
      "FarmFacet", // Add AdvancedFarm
      "GamedayFacet"
    ],
    bip: false,
    object: !mock,
    verbose: true,
    account: account
  });
}

async function bip29(mock = true, account = undefined) {
  if (account == undefined) {
    account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);
  }

  hooliganhorde = await getHooliganhorde();
  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [
      "MarketplaceFacet", // Marketplace V2
      "FirmFacet", // Add Deposit Permit System
      "TokenFacet" // Add ERC-20 Token Approval System
    ],
    selectorsToRemove: ["0xeb6fa84f", "0xed778f8e", "0x72db799f", "0x56e70811", "0x6d679775", "0x1aac9789"],
    bip: false,
    object: !mock,
    verbose: true,
    account: account
  });
}

async function bip34(mock = true, account = undefined) {
  if (account == undefined) {
    account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);
  }

  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [
      "FieldFacet", // Add Morning Auction
      "GamedayFacet", // Add ERC-20 permit function
      "FundraiserFacet" // update fundraiser with new rage spec
    ],
    initFacetName: "InitBipActuationImprovements",
    selectorsToRemove: ["0x78309c85", "0x6c8d548e"],
    bip: false,
    object: !mock,
    verbose: true,
    account: account,
    verify: false
  });
}

exports.bip29 = bip29;
exports.bip30 = bip30;
exports.bip34 = bip34;
