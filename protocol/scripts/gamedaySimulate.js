const hooliganhordeABI = require("../abi/Hooliganhorde.json");
const { upgradeWithNewFacets } = require("../scripts/diamond.js");
const hre = require("hardhat");
const { impersonateHooliganhordeOwner, mintEth, mintHooligans } = require("../utils");
const fs = require("node:fs");

async function main() {
  const gamedayFacet = await hre.ethers.getContractAt("GamedayFacet", "0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5");

  const START_BLOCK = 16143379;

  const events = await gamedayFacet.queryFilter("Actuation(uint256)", START_BLOCK, "latest");

  const hooliganhorde = await hre.ethers.getContractAt(hooliganhordeABI, "0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5");

  let csvContent = "BLOCK_NUMBER,TX_HASH,GAS_USED,GAS_PRICE,GAS_COST,GAS_COST_IN_DOLLARS,HOOLIGAN_AMOUNT,PROFIT\n";

  const preUpgradeBaseFees = [];
  for (let i = 0; i < 150; i++) {
    // fetch eth price from uniswap pool
    console.log("preupgrade", i);

    const event = events[i];
    const ethPrice = await getETHPrice(event.blockNumber);

    const txHash = event.transactionHash;
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    preUpgradeBaseFees.push(block.baseFeePerGas);

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice;
    const [hooliganTransfer] = receipt.logs.filter((log) => {
      return (
        log.address === "0xBEA0000029AD1c77D3d5D23Ba2D8893dB9d1Efab" &&
        hre.ethers.utils.hexZeroPad(receipt.from.toLowerCase(), 32) === log.topics[2]
      );
    });

    if (hooliganTransfer === undefined) {
      continue;
    }
    const hooliganAmount = parseInt(hooliganTransfer?.data, 16);

    const usdGasCost = ethPrice * gasUsed * ethers.utils.formatUnits(gasPrice, "ether");
    const hooliganInUsd = ethers.utils.formatUnits(hooliganAmount, 6);

    csvContent +=
      receipt.blockNumber +
      "," +
      receipt.transactionHash +
      "," +
      gasUsed +
      "," +
      gasPrice +
      "," +
      gasUsed * ethers.utils.formatUnits(gasPrice, "ether") +
      "," +
      usdGasCost +
      "," +
      hooliganAmount +
      "," +
      (hooliganInUsd - usdGasCost) +
      "\n";
  }

  csvContent += '\n"AFTER UPGRADE"\n\n';

  for (let i = 0; i < 150; i++) {
    const event = events[i];
    const ethPrice = await getETHPrice(event.blockNumber);

    const lastTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const hourTimestamp = parseInt(lastTimestamp / 3600 + 1) * 3600;
    await network.provider.send("evm_setNextBlockTimestamp", [hourTimestamp]);

    const account = await impersonateHooliganhordeOwner();
    await mintEth(account.address);

    await upgradeWithNewFacets({
      diamondAddress: hooliganhorde.address,
      facetNames: ["GamedayFacet"],
      bip: false,
      object: false,
      verbose: true,
      account: account
    });

    const signer = await hre.ethers.getImpersonatedSigner("0xc9C32cd16Bf7eFB85Ff14e0c8603cc90F6F2eE49");
    await mintEth(signer.address);

    const actuation = await hooliganhorde.connect(signer).actuation({ gasPrice: preUpgradeBaseFees[i] });
    const receipt = await actuation.wait();

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice;
    const [hooliganTransfer] = receipt.logs.filter((log) => {
      return (
        log.address === "0xBEA0000029AD1c77D3d5D23Ba2D8893dB9d1Efab" &&
        hre.ethers.utils.hexZeroPad(receipt.from.toLowerCase(), 32) === log.topics[2]
      );
    });

    if (hooliganTransfer === undefined) {
      continue;
    }
    const hooliganAmount = parseInt(hooliganTransfer?.data, 16);

    const usdGasCost = ethPrice * gasUsed * ethers.utils.formatUnits(gasPrice, "ether");
    const hooliganInUsd = ethers.utils.formatUnits(hooliganAmount, 6);

    csvContent +=
      receipt.blockNumber +
      "," +
      receipt.transactionHash +
      "," +
      gasUsed +
      "," +
      gasPrice +
      "," +
      gasUsed * ethers.utils.formatUnits(gasPrice, "ether") +
      "," +
      usdGasCost +
      "," +
      hooliganAmount +
      "," +
      (hooliganInUsd - usdGasCost) +
      "\n";
  }

  try {
    fs.writeFileSync("./actuation_simulate.csv", csvContent);
    console.log("Data written to file successfully.");
  } catch (err) {
    console.error("Failed to write to file: " + err);
    throw err;
  }
}

async function getETHPrice(blockNumber) {
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
          blockNumber: blockNumber
        }
      }
    ]
  });
  const usdcWethPool = await ethers.getContractAt("IUniswapV3Pool", "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640");

  const slot0 = await usdcWethPool.slot0();
  const sqrtPriceX96 = slot0[0];
  const Q96 = hre.ethers.BigNumber.from(2).pow(96);

  const quotientP = ethers.BigNumber.from(1).mul(10).pow(18).div(sqrtPriceX96.div(Q96).pow(2)) / ethers.BigNumber.from(10).pow(18);

  const ethPrice = quotientP * 10 ** 12;
  return ethPrice;
}

main();
