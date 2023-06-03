const fs = require("fs");
const { wrapWithRetryHandling } = require("./utils/retry.js");
const { HOOLIGANHORDE } = require("../test/utils/constants.js");

// Files
const HOOLIGAN_DEPOSITS = "./rerecruit/data/r5-hooliganDeposits.json";
const LP_DEPOSITS = "./rerecruit/data/r6-lpDeposits.json";
const EARNED_HOOLIGANS = "./rerecruit/data/r7-earnedHooligans.json";

const RERECRUIT_GAMEDAY = "6074";

function addCommas(nStr) {
  nStr += "";
  const x = nStr.split(".");
  let x1 = x[0];
  const x2 = x.length > 1 ? "." + x[1] : "";
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, "$1" + "," + "$2");
  }
  return x1 + x2;
}

function strDisplay(str) {
  return addCommas(str.toString());
}

const chunkArray = (arr, size) => (arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [arr]);

async function rerecruitX(account, _deposits, name, chunkSize = 180, init2 = false, initData = []) {
  const deposits = chunkArray(_deposits, chunkSize);

  const RerecruitX = await ethers.getContractFactory(name, account);
  const rerecruitX = await RerecruitX.deploy();
  await rerecruitX.deployed();
  const receipt = await rerecruitX.deployTransaction.wait();
  console.log(`${name} deploy gas used: ` + strDisplay(receipt.gasUsed));
  const initFacetAddress = receipt.contractAddress;
  console.log(`${name} address: ` + initFacetAddress);

  const diamondCut = await ethers.getContractAt("DiamondCutFacet", HOOLIGANHORDE);

  if (init2) {
    functionCall = rerecruitX.interface.encodeFunctionData("init2", initData);
    const receipt = await diamondCut.connect(account).diamondCut([], initFacetAddress, functionCall);
    const gasUsed = (await receipt.wait()).gasUsed;
    console.log(`init2 gas used: ${strDisplay(gasUsed)}`);
  }

  let totalGasUsed = ethers.BigNumber.from("0");
  let start = 0;

  const diamondCutRetry = wrapWithRetryHandling((functionCall, initAddress) => {
    return diamondCut.connect(account).diamondCut([], initAddress, functionCall);
  });
  for (let i = start; i < deposits.length; i++) {
    functionCall = rerecruitX.interface.encodeFunctionData("init", [deposits[i]]);
    const receipt = await diamondCutRetry(functionCall, initFacetAddress);
    const gasUsed = (await receipt.wait()).gasUsed;
    totalGasUsed = totalGasUsed.add(gasUsed);
    process.stdout.write("\r\x1b[K");
    process.stdout.write(
      `${chunkSize * (i + 1)}/${_deposits.length}: ${getProcessString(i, deposits.length)} gas used: ${strDisplay(totalGasUsed)}`
    );
  }

  process.stdout.write("\r\x1b[K");
  process.stdout.write(`${_deposits.length}/${_deposits.length}: ${getProcessString(1, 1)} gas used: ${strDisplay(totalGasUsed)}`);
  console.log("\n");
}

function getProcessString(processed, total) {
  const max = 20;
  const eq = (max * processed) / total;
  const sp = max - eq;
  return `[${"=".repeat(eq)}${" ".repeat(sp)}]`;
}

exports.getProcessString = getProcessString;
exports.rerecruitX = rerecruitX;
