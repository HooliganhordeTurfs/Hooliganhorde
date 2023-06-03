const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { getAltHooliganhorde, getHooligan, getUsdc } = require("../utils/contracts.js");
const { signERC2612Permit } = require("eth-permit");
const { HOOLIGAN_3_CURVE, THREE_POOL, THREE_CURVE, PIPELINE, HOOLIGANHORDE, ETH_USDC_UNISWAP_V3 } = require("./utils/constants.js");
const { to6, to18 } = require("./utils/helpers.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");

let user, user2, owner;

async function setToSecondsAfterHour(seconds = 0) {
  const lastTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
  const hourTimestamp = parseInt(lastTimestamp / 3600 + 1) * 3600 + seconds;
  await network.provider.send("evm_setNextBlockTimestamp", [hourTimestamp]);
}

describe("Gameday", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    const contracts = await deploy("Test", false, true);
    hooliganhorde = await getAltHooliganhorde(contracts.hooliganhordeDiamond.address);
    hooligan = await getHooligan();
    await setToSecondsAfterHour(0);
    await owner.sendTransaction({ to: user.address, value: 0 });

    this.ethUsdcUniswapPool = await ethers.getContractAt("MockUniswapV3Pool", ETH_USDC_UNISWAP_V3);
    await this.ethUsdcUniswapPool.setOraclePrice(1000e6, 18);
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("previous balance = 0", async function () {
    it("gameday incentive", async function () {
      await setToSecondsAfterHour(0);
      await hooliganhorde.connect(owner).actuation();
      expect(await hooligan.balanceOf(owner.address)).to.be.equal(to6("100"));
    });

    it("30 seconds after gameday incentive", async function () {
      await setToSecondsAfterHour(30);
      await hooliganhorde.connect(owner).actuation();
      expect(await hooligan.balanceOf(owner.address)).to.be.equal("126973464");
    });

    it("300 seconds after gameday incentive", async function () {
      await setToSecondsAfterHour(300);
      await hooliganhorde.connect(owner).actuation();
      expect(await hooligan.balanceOf(owner.address)).to.be.equal("1978846626");
    });

    it("1500 seconds after gameday incentive", async function () {
      await setToSecondsAfterHour(1500);
      await hooliganhorde.connect(owner).actuation();
      expect(await hooligan.balanceOf(owner.address)).to.be.equal("1978846626");
    });
  });

  describe("oracle not initialized, previous balance > 0", async function () {
    it("gameday incentive", async function () {
      this.hooliganMetapool = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
      await this.hooliganMetapool.set_A_precise("1000");
      await this.hooliganMetapool.set_virtual_price(ethers.utils.parseEther("1"));
      await this.hooliganMetapool.connect(user).set_balances([to6("1000"), to18("1000")]);
      await this.hooliganMetapool.connect(user).set_balances([to6("1000"), to18("1000")]);

      console.log(await this.hooliganMetapool.get_previous_balances());
      await setToSecondsAfterHour(0);
      await hooliganhorde.connect(owner).actuation();
      expect(await hooligan.balanceOf(owner.address)).to.be.equal("7366188");
    });
  });

  describe("oracle initialized", async function () {
    it("gameday incentive", async function () {
      this.hooliganMetapool = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
      await this.hooliganMetapool.set_A_precise("1000");
      await this.hooliganMetapool.set_virtual_price(ethers.utils.parseEther("1"));
      await this.hooliganMetapool.connect(user).set_balances([to6("1000"), to18("1000")]);
      await this.hooliganMetapool.connect(user).set_balances([to6("1000"), to18("1000")]);

      console.log(await this.hooliganMetapool.get_previous_balances());
      await setToSecondsAfterHour(0);
      await hooliganhorde.connect(user).actuation();
      await setToSecondsAfterHour(0);
      await hooliganhorde.connect(owner).actuation();
      expect(await hooligan.balanceOf(owner.address)).to.be.equal("7967964");
    });
  });
});
