const { upgradeWithNewFacets } = require("../scripts/diamond.js");
const { HOOLIGANHORDE, PRICE_DEPLOYER } = require("../test/utils/constants.js");
const { impersonateSigner } = require("../utils/signer.js");

async function rerecruit8(account, deployAccount) {
  console.log("-----------------------------------");
  console.log("Rerecruit8: Deploy New Tokens\n");
  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [],
    initFacetName: "Rerecruit8",
    bip: false,
    verbose: true,
    account: account
  });

  if (!deployAccount) deployAccount = await impersonateSigner(PRICE_DEPLOYER);

  const receipt = await account.sendTransaction({
    to: deployAccount.address,
    value: ethers.utils.parseEther("0.1")
  });
  await receipt.wait();

  const PriceContract = await ethers.getContractFactory("HooliganhordePrice", deployAccount);
  const priceContract = await PriceContract.deploy();
  await priceContract.deployed();
  console.log(priceContract.address);
  console.log("-----------------------------------");
}
exports.rerecruit8 = rerecruit8;
