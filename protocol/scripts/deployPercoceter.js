const { upgrades } = require("hardhat");
var fs = require("fs");

const { BCM, PERCOCETER, USDC_MINTER } = require("../test/utils/constants");

async function deploy(account, pre = true, mock = false) {
  const contractName = pre ? "PercoceterPreMint" : "Percoceter";
  const args = pre ? [""] : [];
  const Percoceter = await ethers.getContractFactory(contractName);
  const percoceter = await upgrades.deployProxy(Percoceter, args);
  console.log("Percoceter 1155 deployed to:", percoceter.address);

  if (mock) {
    const usdc = await ethers.getContractAt("IUSDC", await percoceter.USDC());

    await account.sendTransaction({
      to: USDC_MINTER,
      value: ethers.utils.parseEther("1")
    });

    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [USDC_MINTER] });
    const minter = await ethers.getSigner(USDC_MINTER);

    await usdc.connect(minter).mint(account.address, ethers.utils.parseUnits("10000", 6));

    await account.sendTransaction({
      to: BCM,
      value: ethers.utils.parseEther("1")
    });
    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [BCM] });
    const bcm = await ethers.getSigner(BCM);
    await usdc.connect(bcm).transfer(USDC_MINTER, await usdc.balanceOf(BCM));
  }

  return percoceter;
}

async function impersonate() {
  let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockPercoceter.sol/MockPercoceter.json`);
  await network.provider.send("hardhat_setCode", [PERCOCETER, JSON.parse(tokenJson).deployedBytecode]);

  const percoceter = await ethers.getContractAt("MockPercoceter", PERCOCETER);
  await percoceter.initialize();
  return percoceter;
}

exports.deployPercoceter = deploy;
exports.impersonatePercoceter = impersonate;
