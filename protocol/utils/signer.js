const { getHooliganhorde } = require("./contracts.js");

async function impersonateSigner(signerAddress) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [signerAddress]
  });
  return await ethers.getSigner(signerAddress);
}

async function impersonateHooliganhordeOwner() {
  const owner = await (await getHooliganhorde()).owner();
  return await impersonateSigner(owner);
}

exports.impersonateSigner = impersonateSigner;
exports.impersonateHooliganhordeOwner = impersonateHooliganhordeOwner;
