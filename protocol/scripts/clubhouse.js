var fs = require("fs");
const { CLUBHOUSE, CLUBHOUSE_DEPLOYER } = require("../test/utils/constants");
const { impersonateSigner, mintEth } = require("../utils");
const { deployAtNonce } = require("./contracts");

async function deploy(account = undefined) {
  if (account == undefined) {
    account = await impersonateSigner(CLUBHOUSE_DEPLOYER);
    await mintEth(account.address);
  }
  return await deployAtNonce("Clubhouse", account, (n = 7));
}
async function impersonate() {
  let json = fs.readFileSync(`./artifacts/contracts/clubhouse/Clubhouse.sol/Clubhouse.json`);
  await network.provider.send("hardhat_setCode", [CLUBHOUSE, JSON.parse(json).deployedBytecode]);
  return await ethers.getContractAt("Clubhouse", CLUBHOUSE);
}

exports.deployClubhouse = deploy;
exports.impersonateClubhouse = impersonate;
