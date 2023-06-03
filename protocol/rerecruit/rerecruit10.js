const { upgradeWithNewFacets, deploy } = require("../scripts/diamond.js");
const {
  HOOLIGAN,
  HOOLIGANHORDE,
  BCM,
  USDC,
  HOOLIGAN_3_CURVE,
  ZERO_ADDRESS,
  CURVE_ZAP,
  TEST_GNOSIS
} = require("../test/utils/constants.js");
const { to6 } = require("../test/utils/helpers.js");
const fs = require("fs");

async function rerecruit10(account, mock, verbose) {
  console.log("-----------------------------------");
  console.log("Rerecruit10: Rerecruit Hooliganhorde\n");

  const Percoceter = await ethers.getContractFactory("Percoceter", account);
  const percoceter = await Percoceter.deploy();
  await percoceter.deployed();
  console.log(`Fertilzer deployed to : ${percoceter.address}`);

  const diamondCutParams = await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [
      "BDVFacet",
      "CurveFacet",
      "ConvertFacet",
      "FarmFacet",
      "PercoceterFacet",
      "FieldFacet",
      "FundraiserFacet",
      "MarketplaceFacet",
      "OwnershipFacet",
      "PauseFacet",
      "GamedayFacet",
      "FirmFacet",
      "TokenFacet",
      "UnripeFacet",
      "WhitelistFacet"
    ],
    initFacetName: "InitRerecruit",
    initArgs: [percoceter.address],
    object: true,
    verbose: verbose,
    account: account
  });

  const deployingSelectors = diamondCutParams.diamondCut.map((d) => d[2]).flat();

  const loupe = await ethers.getContractAt("DiamondLoupeFacet", HOOLIGANHORDE);
  const deployedSelectors = await loupe.facets();
  selectorsToRemove = deployedSelectors
    .filter(
      (d) =>
        d.facetAddress !== "0xDFeFF7592915bea8D040499E961E332BD453C249" && d.facetAddress !== "0xB51D5C699B749E0382e257244610039dDB272Da0"
    )
    .map((d) => d.functionSelectors)
    .flat()
    .filter((d) => !deployingSelectors.includes(d));

  if (selectorsToRemove.length > 0) {
    diamondCutParams.diamondCut.push([ZERO_ADDRESS, 2, selectorsToRemove]);
  }

  const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", HOOLIGANHORDE);
  const pauseFacet = await ethers.getContractAt("PauseFacet", HOOLIGANHORDE);
  const percoceterFacet = await ethers.getContractAt("PercoceterFacet", HOOLIGANHORDE);

  console.log("Preparing Transactions for BCM submission...");

  const curveZap = await ethers.getContractAt("ICurveZap", CURVE_ZAP);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const usdcBalance = await usdc.balanceOf(BCM);
  const amount = ethers.BigNumber.from(usdcBalance).div(ethers.BigNumber.from("1000000"));

  let minLPOut = await curveZap.callStatic.calc_token_amount(
    HOOLIGAN_3_CURVE,
    [usdcBalance.mul(to6("0.866616")).div(to6("1")), "0", usdcBalance, "0"],
    true
  ); // set
  minLPOut = minLPOut.mul(to6(".99")).div(to6("1"));

  const diamondCut = diamondCutFacet.interface.encodeFunctionData("diamondCut", Object.values(diamondCutParams));

  const approvalParams = [HOOLIGANHORDE, `${ethers.constants.MaxUint256}`];
  const approval = usdc.interface.encodeFunctionData("approve", approvalParams);

  const addPercoceterParams = ["0", `${amount}`, `${minLPOut}`];
  const addPercoceter = percoceterFacet.interface.encodeFunctionData("addPercoceterOwner", addPercoceterParams);

  if (mock) {
    const receipt = await account.sendTransaction({
      to: BCM,
      value: ethers.utils.parseEther("1")
    });
    await receipt.wait();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [BCM]
    });

    await hre.network.provider.send("hardhat_setCode", [BCM, "0x"]);
    await hre.network.provider.send("hardhat_setBalance", [BCM, "0xDE0B6B3A7640000"]);

    const bcm = await ethers.getSigner(BCM);

    console.log("Upgrading Hooliganhorde...");
    await bcm.sendTransaction({ to: HOOLIGANHORDE, value: "0", data: diamondCut });

    console.log("Approving USDC to Hooliganhorde...");
    await bcm.sendTransaction({ to: USDC, value: "0", data: approval });

    console.log("Adding Percoceter...");
    await bcm.sendTransaction({ to: HOOLIGANHORDE, value: "0", data: addPercoceter });

    console.log("Unpausing Hooliganhorde...");
    unpause = await pauseFacet.connect(bcm).unpause();

    console.log("Hooliganhorde successfully upgraded...");
  } else {
    await fs.writeFileSync(
      `./rerecruit/gnosis/diamondCut.json`,
      JSON.stringify({ to: HOOLIGANHORDE, parameters: Object.values(diamondCutParams), data: diamondCut }, null, 4)
    );
    await fs.writeFileSync(
      `./rerecruit/gnosis/approval.json`,
      JSON.stringify({ to: USDC, parameters: approvalParams, data: approval }, null, 4)
    );
    await fs.writeFileSync(
      `./rerecruit/gnosis/addPercoceter.json`,
      JSON.stringify({ to: HOOLIGANHORDE, parameters: addPercoceterParams, data: addPercoceter }, null, 4)
    );
    console.log("BCM Transactions ready for submission");
  }
  console.log("-----------------------------------");
}
exports.rerecruit10 = rerecruit10;
