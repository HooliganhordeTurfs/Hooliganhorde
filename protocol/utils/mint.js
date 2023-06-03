const { USDC_MINTER, HOOLIGAN } = require("../test/utils/constants");
const { getUsdc, getHooligan, getHooliganhordeAdminControls } = require("./contracts.js");
const { impersonateSigner, impersonateHooliganhordeOwner } = require("./signer.js");

async function mintUsdc(address, amount) {
  const signer = await impersonateSigner(USDC_MINTER);
  const usdc = await getUsdc();
  await usdc.connect(signer).mint(address, amount);
}

async function mintHooligans(address, amount) {
  const hooliganhordeAdmin = await getHooliganhordeAdminControls();
  await hooliganhordeAdmin.mintHooligans(address, amount);
}

async function mintEth(address) {
  await hre.network.provider.send("hardhat_setBalance", [address, "0x3635C9ADC5DEA00000"]);
}

exports.mintEth = mintEth;
exports.mintUsdc = mintUsdc;
exports.mintHooligans = mintHooligans;
