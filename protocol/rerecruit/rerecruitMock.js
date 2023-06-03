const { impersonateHooliganhordeOwner } = require("../utils/signer.js");
const { upgradeWithNewFacets } = require("../scripts/diamond.js");
const { HOOLIGANHORDE } = require("../test/utils/constants.js");

async function rerecruitMock(account) {
  console.log("-----------------------------------");
  console.log("Mock Rerecruit:\n");
  console.log("Mocking Rerecruit");
  const signer = await impersonateHooliganhordeOwner();
  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: ["MockAdminFacet"],
    bip: false,
    verbose: false,
    account: signer
  });
  console.log("-----------------------------------");
}
exports.rerecruitMock = rerecruitMock;
