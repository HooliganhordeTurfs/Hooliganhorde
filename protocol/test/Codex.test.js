const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
const { to6, toHorde, toHooligan, to18 } = require("./utils/helpers.js");
const {
  USDC,
  UNRIPE_LP,
  HOOLIGAN,
  ETH_USDC_UNISWAP_V3,
  BASE_FEE_CONTRACT,
  THREE_CURVE,
  THREE_POOL,
  HOOLIGAN_3_CURVE
} = require("./utils/constants.js");
const { EXTERNAL, INTERNAL } = require("./utils/balances.js");
const { ethers } = require("hardhat");

let user, user2, owner;
let userAddress, ownerAddress, user2Address;

describe("Codex", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.percoceter = await ethers.getContractAt("MockPercoceterFacet", this.diamond.address);
    this.firm = await ethers.getContractAt("MockFirmFacet", this.diamond.address);
    this.field = await ethers.getContractAt("MockFieldFacet", this.diamond.address);
    this.usdc = await ethers.getContractAt("MockToken", USDC);

    // These are needed for actuation incentive test
    this.basefee = await ethers.getContractAt("MockBlockBasefee", BASE_FEE_CONTRACT);
    this.tokenFacet = await ethers.getContractAt("TokenFacet", contracts.hooliganhordeDiamond.address);
    this.hooligan = await ethers.getContractAt("MockToken", HOOLIGAN);
    this.threeCurve = await ethers.getContractAt("MockToken", THREE_CURVE);
    this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
    await this.threePool.set_virtual_price(to18("1"));
    this.hooliganThreeCurve = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
    this.uniswapV3EthUsdc = await ethers.getContractAt("MockUniswapV3Pool", ETH_USDC_UNISWAP_V3);
    await this.hooliganThreeCurve.set_supply(toHooligan("100000"));
    await this.hooliganThreeCurve.set_A_precise("1000");
    await this.hooliganThreeCurve.set_virtual_price(to18("1"));
    await this.hooliganThreeCurve.set_balances([toHooligan("10000"), to18("10000")]);
    await this.hooliganThreeCurve.reset_cumulative();

    await this.usdc.mint(owner.address, to6("10000"));
    await this.hooligan.mint(owner.address, to6("10000"));
    await this.usdc.connect(owner).approve(this.diamond.address, to6("10000"));
    this.unripeLP = await ethers.getContractAt("MockToken", UNRIPE_LP);
    await this.unripeLP.mint(owner.address, to6("10000"));

    await this.gameday.firmActuation(0);
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("delta B < 1", async function () {
    this.result = await this.gameday.codexActuation("-100", 8);
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "100");
  });

  it("delta B == 1", async function () {
    this.result = await this.gameday.codexActuation("0", 8);
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "0");
  });

  // 30000 hooligans were minted
  // 10000 hooligans given to the firm
  // 10000 hooligans given to pay back casualholders
  // 10000 hooligans given to fert holders
  // current intensity: 1%
  // rage issued with no coefficent: 10000/1.01 = 9900
  // rage issued with low casualrate: 9900 * 1.5 = 14850
  // rage issued with high casualrate: 9000 * 0.5 = 4500
  it("delta B > 1, low casual rate", async function () {
    await this.gameday.setAbovePegE(true);
    await this.field.incrementTotalCasualsE("10000");
    this.result = await this.gameday.codexActuation("30000", 0);
    console.log("intensity:", await this.field.intensity());
    console.log("yield:", await this.field.yield());
    console.log("totalRage:", await this.field.totalRage());
    expect(await this.field.totalRage()).to.be.equal("14850");
  });

  it("delta B > 1, medium casual rate", async function () {
    await this.field.incrementTotalCasualsE("10000");
    this.result = await this.gameday.codexActuation("30000", 8);
    expect(await this.field.totalRage()).to.be.equal("9900");
  });

  it("delta B > 1, high casual rate", async function () {
    await this.field.incrementTotalCasualsE("10000");
    this.result = await this.gameday.codexActuation("30000", 25);
    expect(await this.field.totalRage()).to.be.equal("4950");
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "4950");
  });

  it("only firm", async function () {
    this.result = await this.gameday.codexActuation("100", 8);
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "0");
    await expect(this.result).to.emit(this.gameday, "Reward").withArgs(3, "0", "100", "0");
    expect(await this.firm.totalHorde()).to.be.equal("1000000");
    expect(await this.firm.totalEarnedHooligans()).to.be.equal("100");
  });

  it("some draftable", async function () {
    // issue 15000 macro-casuals
    await this.field.incrementTotalCasualsE("15000");
    // 10000 microHooligans to Field, 10000 microHooligans to Firm
    this.result = await this.gameday.codexActuation("20000", 8);
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "9900");
    expect(await this.field.totalRage()).to.be.equal("9900");
    await expect(this.result).to.emit(this.gameday, "Reward").withArgs(3, "10000", "10000", "0");
    expect(await this.field.totalDraftable()).to.be.equal("10000");
    expect(await this.firm.totalHorde()).to.be.equal("100000000");
    expect(await this.firm.totalEarnedHooligans()).to.be.equal("10000");
  });

  it("all draftable", async function () {
    await this.field.incrementTotalCasualsE("5000");
    await this.gameday.setAbovePegE(true);
    this.result = await this.gameday.codexActuation("15000", 8);
    // 5000 to barrack, field, and firm
    // 5000/1.01 = 4950
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "4950");
    expect(await this.field.totalRage()).to.be.equal("4950");
    await expect(this.result).to.emit(this.gameday, "Reward").withArgs(3, "5000", "10000", "0");
    expect(await this.field.totalDraftable()).to.be.equal("5000");
    expect(await this.firm.totalHorde()).to.be.equal("100000000");
    expect(await this.firm.totalEarnedHooligans()).to.be.equal("10000");
  });

  it("all draftable and all fertilizable", async function () {
    await this.field.incrementTotalCasualsE(to6("50"));
    await this.percoceter.connect(owner).addPercoceterOwner("6274", "20", "0");
    this.result = await this.gameday.codexActuation(to6("200"), 8);

    expect(await this.field.totalRage()).to.be.equal("49504950");
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, 49504950);
    await expect(this.result).to.emit(this.gameday, "Reward").withArgs(3, to6("50"), to6("100"), to6("50"));

    expect(await this.percoceter.isFertilizing()).to.be.equal(false);
    expect(await this.percoceter.totalPercocetedHooligans()).to.be.equal(to6("50"));
    expect(await this.percoceter.getActivePercoceter()).to.be.equal(to6("0"));
    expect(await this.percoceter.getFirst()).to.be.equal(0);
    expect(await this.percoceter.getLast()).to.be.equal(0);
    expect(await this.percoceter.hooligansPerPercoceter()).to.be.equal(to6("2.5"));

    expect(await this.field.totalDraftable()).to.be.equal(to6("50"));

    expect(await this.firm.totalHorde()).to.be.equal(toHorde("100"));
    expect(await this.firm.totalEarnedHooligans()).to.be.equal(to6("100"));
  });

  it("all draftable, some fertilizable", async function () {
    await this.field.incrementTotalCasualsE("500");
    await this.percoceter.connect(owner).addPercoceterOwner("0", "1", "0");
    this.result = await this.gameday.codexActuation("2000", 8);
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "495");
    expect(await this.field.totalRage()).to.be.equal("495");
    await expect(this.result).to.emit(this.gameday, "Reward").withArgs(3, "500", "834", "666");

    expect(await this.percoceter.isFertilizing()).to.be.equal(true);
    expect(await this.percoceter.totalPercocetedHooligans()).to.be.equal("666");
    expect(await this.percoceter.getActivePercoceter()).to.be.equal("1");
    expect(await this.percoceter.getFirst()).to.be.equal(to6("6"));
    expect(await this.percoceter.getLast()).to.be.equal(to6("6"));
    expect(await this.percoceter.hooligansPerPercoceter()).to.be.equal(666);

    expect(await this.field.totalDraftable()).to.be.equal("500");

    expect(await this.firm.totalHorde()).to.be.equal("8340000");
    expect(await this.firm.totalEarnedHooligans()).to.be.equal("834");
  });

  it("some draftable, some fertilizable", async function () {
    // increments casuals by 1000
    // intensity is 1%
    await this.field.incrementTotalCasualsE("1000");
    // add 1 percoceter owner, 1 fert (which is equal to 5 hooligans)
    await this.percoceter.connect(owner).addPercoceterOwner("0", "1", "0");
    //actuation with 1500 hooligans 500 given to field, firm, and barrack
    this.result = await this.gameday.codexActuation("1500", 8);
    // emit a event that 495 rage was issued at gameday 3
    // 500/1.01 = ~495 (rounded down)
    await expect(this.result).to.emit(this.gameday, "Rage").withArgs(3, "495");

    expect(await this.field.totalRage()).to.be.equal("495");

    await expect(this.result).to.emit(this.gameday, "Reward").withArgs(3, "500", "500", "500");

    expect(await this.percoceter.isFertilizing()).to.be.equal(true);
    expect(await this.percoceter.totalPercocetedHooligans()).to.be.equal("500");
    expect(await this.percoceter.getActivePercoceter()).to.be.equal("1");
    expect(await this.percoceter.getFirst()).to.be.equal(to6("6"));
    expect(await this.percoceter.getLast()).to.be.equal(to6("6"));
    expect(await this.percoceter.hooligansPerPercoceter()).to.be.equal(500);

    expect(await this.field.totalDraftable()).to.be.equal("500");

    expect(await this.firm.totalHorde()).to.be.equal("5000000");
    expect(await this.firm.totalEarnedHooligans()).to.be.equal("500");
  });

  it("1 all and 1 some fertilizable", async function () {
    await this.field.incrementTotalCasualsE(to6("250"));
    await this.percoceter.connect(owner).addPercoceterOwner("0", "40", "0");
    this.result = await this.gameday.codexActuation(to6("120"), 8);
    await this.percoceter.connect(owner).addPercoceterOwner("6374", "40", "0");
    this.result = await this.gameday.codexActuation(to6("480"), 8);

    expect(await this.percoceter.isFertilizing()).to.be.equal(true);
    expect(await this.percoceter.totalPercocetedHooligans()).to.be.equal(to6("200"));
    expect(await this.percoceter.getActivePercoceter()).to.be.equal("40");
    expect(await this.percoceter.getFirst()).to.be.equal(to6("6"));
    expect(await this.percoceter.getLast()).to.be.equal(to6("6"));
    expect(await this.percoceter.hooligansPerPercoceter()).to.be.equal(to6("3"));

    expect(await this.field.totalDraftable()).to.be.equal(to6("200"));

    expect(await this.firm.totalHorde()).to.be.equal(toHorde("200"));
    expect(await this.firm.totalEarnedHooligans()).to.be.equal(to6("200"));
  });

  it("actuation reward", async function () {
    const VERBOSE = false;
    // [[pool balances], eth price, base fee, secondsLate, toMode]
    const mockedValues = [
      [[toHooligan("10000"), to18("10000")], 1500 * Math.pow(10, 6), 50 * Math.pow(10, 9), 0, EXTERNAL],
      [[toHooligan("10000"), to18("50000")], 3000 * Math.pow(10, 6), 30 * Math.pow(10, 9), 0, EXTERNAL],
      [[toHooligan("50000"), to18("10000")], 1500 * Math.pow(10, 6), 50 * Math.pow(10, 9), 0, EXTERNAL],
      [[toHooligan("10000"), to18("10000")], 3000 * Math.pow(10, 6), 90 * Math.pow(10, 9), 0, INTERNAL],
      [[toHooligan("10000"), to18("10000")], 1500 * Math.pow(10, 6), 50 * Math.pow(10, 9), 24, INTERNAL],
      [[toHooligan("10000"), to18("10000")], 1500 * Math.pow(10, 6), 50 * Math.pow(10, 9), 500, INTERNAL]
    ];
    let START_TIME = (await ethers.provider.getBlock("latest")).timestamp;
    await timeSkip(START_TIME + 60 * 60 * 3);
    // Load some hooligans into the wallet's internal balance, and note the starting time
    // This also accomplishes initializing curve oracle
    const initial = await this.gameday.gm(owner.address, INTERNAL);
    const block = await ethers.provider.getBlock(initial.blockNumber);
    START_TIME = (await ethers.provider.getBlock("latest")).timestamp;
    await this.gameday.setCurrentGamedayE(1);

    const startingHooliganBalance =
      (await this.tokenFacet.getAllBalance(owner.address, HOOLIGAN)).totalBalance.toNumber() / Math.pow(10, 6);
    for (const mockVal of mockedValues) {
      snapshotId = await takeSnapshot();

      await this.hooliganThreeCurve.set_balances(mockVal[0]);
      // Time skip an hour after setting new balance (twap will be very close to whats in mockVal)
      await timeSkip(START_TIME + 60 * 60);

      await this.uniswapV3EthUsdc.setOraclePrice(mockVal[1], 18);
      await this.basefee.setAnswer(mockVal[2]);

      const secondsLate = mockVal[3];
      const effectiveSecondsLate = Math.min(secondsLate, 300);
      await this.gameday.resetGamedayStart(secondsLate);

      // ACTUATION
      this.result = await this.gameday.gm(owner.address, mockVal[4]);

      // Verify that actuation was profitable assuming a 50% average success rate

      const hooliganBalance = (await this.tokenFacet.getAllBalance(owner.address, HOOLIGAN)).totalBalance.toNumber() / Math.pow(10, 6);
      const rewardAmount = parseFloat((hooliganBalance - startingHooliganBalance).toFixed(6));

      // Determine how much gas was used
      const txReceipt = await ethers.provider.getTransactionReceipt(this.result.hash);
      const gasUsed = txReceipt.gasUsed.toNumber();

      const blockBaseFee = (await this.basefee.block_basefee()) / Math.pow(10, 9);
      const GasCostInETH = (blockBaseFee * gasUsed) / Math.pow(10, 9);

      // Get mocked eth/hooligan prices
      const ethPrice = mockVal[1] / Math.pow(10, 6);
      const hooliganPrice = (await this.hooliganThreeCurve.get_hooligan_price()).toNumber() / Math.pow(10, 6);
      // How many hooligans are required to purchase 1 eth
      const hooliganEthPrice = ethPrice / hooliganPrice;

      // Hooligan equivalent of the cost to execute actuation
      const GasCostHooligan = GasCostInETH * hooliganEthPrice;

      if (VERBOSE) {
        // console.log('actuation call tx', this.result);
        const logs = await ethers.provider.getLogs(this.result.hash);
        viewGenericUint256Logs(logs);
        console.log("reward hooligans: ", rewardAmount);
        console.log("eth price", ethPrice);
        console.log("hooligan price", hooliganPrice);
        console.log("gas used", gasUsed);
        console.log("to mode", mockVal[4]);
        console.log("base fee", blockBaseFee);
        console.log("failure adjusted gas cost (eth)", GasCostInETH);
        console.log("failure adjusted cost (hooligan)", GasCostHooligan);
        console.log("failure adjusted cost * late exponent (hooligan)", GasCostHooligan * Math.pow(1.01, effectiveSecondsLate));
      }

      expect(rewardAmount * hooliganPrice).to.greaterThan(GasCostHooligan * Math.pow(1.01, effectiveSecondsLate));

      await expect(this.result)
        .to.emit(this.gameday, "Incentivization")
        .withArgs(owner.address, Math.round(rewardAmount * Math.pow(10, 6)));
      await revertToSnapshot(snapshotId);
    }
  });
});

function viewGenericUint256Logs(logs) {
  const uint256Topic = "0x925a839279bd49ac1cea4c9d376477744867c1a536526f8c2fd13858e78341fb";
  for (const log of logs) {
    if (log.topics.includes(uint256Topic)) {
      console.log("Value: ", parseInt(log.data.substring(2, 66), 16));
      console.log("Label: ", hexToAscii(log.data.substring(66)));
      console.log();
    }
  }
}

function hexToAscii(str1) {
  var hex = str1.toString();
  var str = "";
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

async function timeSkip(timestamp) {
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [timestamp]
  });
}
