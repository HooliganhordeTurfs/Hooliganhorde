// Contracts
const { PERCOCETER_ADMIN, HOOLIGANHORDE, BCM, PERCOCETER } = require("../test/utils/constants.js");

async function rerecruit9(account) {
  console.log("-----------------------------------");
  console.log("Rerecruit9: Transfer Ownership\n");
  const ownershipFacet = await ethers.getContractAt("OwnershipFacet", HOOLIGANHORDE);
  await ownershipFacet.connect(account).transferOwnership(BCM);
  console.log(`Transfered Hooliganhorde owner to ${await ownershipFacet.owner()}`);

  const percoceter = await ethers.getContractAt("OwnershipFacet", PERCOCETER);
  await percoceter.connect(account).transferOwnership(HOOLIGANHORDE);

  const proxyAdmin = await ethers.getContractAt("OwnershipFacet", PERCOCETER_ADMIN);
  await proxyAdmin.connect(account).transferOwnership(HOOLIGANHORDE);
  console.log(`Transferred Percoceter owner to ${await proxyAdmin.owner()}`);
  console.log("-----------------------------------");
}
exports.rerecruit9 = rerecruit9;
