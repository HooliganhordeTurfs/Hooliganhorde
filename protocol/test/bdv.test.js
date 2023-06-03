const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
const { HOOLIGAN, THREE_POOL, HOOLIGAN_3_CURVE, UNRIPE_LP, UNRIPE_HOOLIGAN, ZERO_ADDRESS } = require("./utils/constants");
const { to18, to6 } = require("./utils/helpers.js");
let user, user2, owner;
let userAddress, ownerAddress, user2Address;
const ZERO_BYTES = ethers.utils.formatBytes32String("0x0");

let lastTimestamp = 1700000000;
let timestamp;
let snapshotId;

async function resetTime() {
  timestamp = lastTimestamp + 100000000;
  lastTimestamp = timestamp;
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [timestamp]
  });
}

async function advanceTime(time) {
  timestamp += time;
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [timestamp]
  });
}

describe("BDV", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", this.diamond.address);
    this.firm = await ethers.getContractAt("MockFirmFacet", this.diamond.address);
    this.convert = await ethers.getContractAt("ConvertFacet", this.diamond.address);
    this.hooligan = await ethers.getContractAt("MockToken", HOOLIGAN);
    this.bdv = await ethers.getContractAt("BDVFacet", this.diamond.address);

    this.firmToken = await ethers.getContractFactory("MockToken");
    this.firmToken = await this.firmToken.deploy("Firm", "FIRM");
    await this.firmToken.deployed();

    await this.firm.mockWhitelistToken(this.firmToken.address, this.firm.interface.getSighash("mockBDV(uint256 amount)"), "10000", "1");

    await this.gameday.firmActuation(0);
    await this.hooligan.mint(userAddress, "1000000000");
    await this.hooligan.mint(ownerAddress, "1000000000");
    await this.firmToken.connect(user).approve(this.firm.address, "100000000000");
    await this.hooligan.connect(user).approve(this.firm.address, "100000000000");
    await this.hooligan.connect(owner).approve(this.firm.address, "100000000000");
    await this.firmToken.mint(userAddress, "10000");
    await this.firmToken.mint(ownerAddress, to18("1000"));
    await this.firmToken.approve(this.firm.address, to18("1000"));

    this.unripe = await ethers.getContractAt("MockUnripeFacet", this.firm.address);

    this.unripeLP = await ethers.getContractAt("MockToken", UNRIPE_LP);
    await this.unripeLP.connect(user).mint(userAddress, to18("10000"));
    await this.unripeLP.connect(user).approve(this.firm.address, to18("10000"));
    await this.unripe.addUnripeToken(UNRIPE_LP, this.firmToken.address, ZERO_BYTES);
    await this.unripe.connect(owner).addUnderlying(UNRIPE_LP, to18("1000"));

    this.unripeHooligan = await ethers.getContractAt("MockToken", UNRIPE_HOOLIGAN);
    await this.unripeHooligan.connect(user).mint(userAddress, to6("10000"));
    await this.unripeHooligan.connect(user).approve(this.firm.address, to6("10000"));
    await this.unripe.addUnripeToken(UNRIPE_HOOLIGAN, this.hooligan.address, ZERO_BYTES);
    await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("1000"));
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("Hooligan BDV", async function () {
    it("properly checks bdv", async function () {
      expect(await this.bdv.bdv(HOOLIGAN, to6("200"))).to.equal(to6("200"));
    });
  });

  describe("Hooligan Metapool BDV", async function () {
    before(async function () {
      this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
      await this.threePool.set_virtual_price(to18("1"));
      this.hooliganThreeCurve = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
      await this.hooliganThreeCurve.set_supply(to18("2000000"));
      await this.hooliganThreeCurve.set_balances([to6("1000000"), to18("1000000")]);
      await this.hooliganThreeCurve.set_balances([to6("1200000"), to18("1000000")]);
    });

    it("properly checks bdv", async function () {
      expect(await this.bdv.bdv(HOOLIGAN_3_CURVE, to18("200"))).to.equal(to6("200"));
    });

    it("properly checks bdv", async function () {
      await this.threePool.set_virtual_price(to18("1.02"));
      expect(await this.bdv.bdv(HOOLIGAN_3_CURVE, to18("2"))).to.equal("1998191");
    });
  });

  describe("Unripe Hooligan BDV", async function () {
    it("properly checks bdv", async function () {
      expect(await this.bdv.bdv(UNRIPE_HOOLIGAN, to6("200"))).to.equal(to6("20"));
    });
  });

  describe("Unripe LP BDV", async function () {
    before(async function () {
      this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
      await this.threePool.set_virtual_price(to18("1"));
      this.hooliganThreeCurve = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
      await this.hooliganThreeCurve.set_supply(to18("2000000"));
      await this.hooliganThreeCurve.set_A_precise("1000");
      await this.hooliganThreeCurve.set_virtual_price(to18("1"));
      await this.hooliganThreeCurve.set_balances([to6("1000000"), to18("1000000")]);
      await this.hooliganThreeCurve.set_balances([to6("1200000"), to18("1000000")]);
    });

    it("properly checks bdv", async function () {
      expect(await this.bdv.bdv(UNRIPE_LP, to18("2000"))).to.equal(to6("200"));
    });

    it("properly checks bdv", async function () {
      await this.threePool.set_virtual_price(to18("1.02"));
      expect(await this.bdv.bdv(UNRIPE_LP, to18("20"))).to.equal("1998191");
    });
  });

  it("reverts if not correct", async function () {
    this.bdv = await ethers.getContractAt("BDVFacet", this.diamond.address);
    await expect(this.bdv.bdv(ZERO_ADDRESS, to18("2000"))).to.be.revertedWith("BDV: Token not whitelisted");
  });
});
