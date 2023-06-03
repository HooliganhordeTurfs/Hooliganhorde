const fs = require("fs");
const { HOOLIGANHORDE } = require("../test/utils/constants");
const { getHooliganhorde, impersonateHooliganhordeOwner, mintEth, strDisplay } = require("../utils");
const { upgradeWithNewFacets } = require("./diamond");

async function ebip6(mock = true, account = undefined) {
  if (account == undefined) {
    account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);
  }
  const tokenFacet = await (await ethers.getContractFactory("TokenFacet", account)).deploy();
  console.log(`Token Facet deployed to: ${tokenFacet.address}`);
  const ebip6 = await (await ethers.getContractFactory("InitEBip6", account)).deploy();
  console.log(`EBIP-6 deployed to: ${ebip6.address}`);
  const dc = {
    diamondCut: [
      ["0x0c9F436FBEf08914c1C68fe04bD573de6e327776", "0", ["0xdf18a3ee", "0x845a022b", "0x82c65124"]],
      [tokenFacet.address, "0", ["0xd3f4ec6f"]]
    ],
    initFacetAddress: ebip6.address,
    functionCall: ebip6.interface.encodeFunctionData("init", [])
  };
  await bipDiamondCut("EBIP-6", dc, account, mock);
}

async function ebip7(mock = true, account = undefined) {
  if (account == undefined) {
    account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);
  }

  const firmFacet = await (await ethers.getContractFactory("FirmFacet", account)).deploy({ maxFeePerGas: 40757798654 });
  await firmFacet.deployed();
  console.log(`FirmFacet deployed to ${firmFacet.address}`);
  const dc = {
    diamondCut: [[firmFacet.address, 1, ["0xd5d2ea8c", "0x83b9e85d"]]],
    initFacetAddress: "0x0000000000000000000000000000000000000000",
    functionCall: "0x"
  };
  await bipDiamondCut("EBIP-7", dc, account, mock);
}

async function ebip8(mock = true, account = undefined) {
  if (account == undefined) {
    account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);
  }

  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: ["FirmFacet", "ConvertFacet"],
    bip: false,
    object: !mock,
    verbose: true,
    account: account
  });
}

async function bipDiamondCut(name, dc, account, mock = true) {
  hooliganhorde = await getHooliganhorde();
  if (mock) {
    const receipt = await hooliganhorde.connect(account).diamondCut(...Object.values(dc));
    console.log(`Diamond Cut Successful.`);
    console.log(`Gas Used: ${strDisplay((await receipt.wait()).gasUsed)}`);
  } else {
    const encodedDiamondCut = await hooliganhorde.interface.encodeFunctionData("diamondCut", Object.values(dc));
    console.log(JSON.stringify(dc, null, 4));
    console.log("Encoded: -------------------------------------------------------------");
    console.log(encodedDiamondCut);
    const dcName = `diamondCut-${name}-${Math.floor(Date.now() / 1000)}.json`;
    await fs.writeFileSync(`./diamondCuts/${dcName}`, JSON.stringify({ diamondCut: dc, encoded: encodedDiamondCut }, null, 4));
    return dc;
  }
}

exports.ebip6 = ebip6;
exports.ebip7 = ebip7;
exports.ebip8 = ebip8;
