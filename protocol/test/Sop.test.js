const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { HOOLIGAN, THREE_CURVE, THREE_POOL, HOOLIGAN_3_CURVE } = require("./utils/constants");
const { to18, to6, toHorde } = require("./utils/helpers.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");

let user, user2, owner;
let userAddress, ownerAddress, user2Address;

describe("Sop", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.firm = await ethers.getContractAt("MockFirmFacet", this.diamond.address);
    this.field = await ethers.getContractAt("MockFieldFacet", this.diamond.address);
    this.hooligan = await ethers.getContractAt("Hooligan", HOOLIGAN);
    this.threeCurve = await ethers.getContractAt("MockToken", THREE_CURVE);
    this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
    this.hooliganMetapool = await ethers.getContractAt("IMockCurvePool", HOOLIGAN_3_CURVE);

    await this.gameday.firmActuation(0);
    await this.hooligan.connect(user).approve(this.firm.address, "100000000000");
    await this.hooligan.connect(user2).approve(this.firm.address, "100000000000");
    await this.hooligan.connect(user).approve(this.hooliganMetapool.address, "100000000000");
    await this.hooligan.mint(userAddress, to6("10000"));
    await this.hooligan.mint(user2Address, to6("10000"));

    await this.threeCurve.mint(userAddress, to18("100000"));
    await this.threePool.set_virtual_price(to18("1"));
    await this.threeCurve.connect(user).approve(this.hooliganMetapool.address, to18("100000000000"));

    await this.hooliganMetapool.set_A_precise("1000");
    await this.hooliganMetapool.set_virtual_price(ethers.utils.parseEther("1"));
    await this.hooliganMetapool.connect(user).approve(this.threeCurve.address, to18("100000000000"));
    await this.hooliganMetapool.connect(user).approve(this.firm.address, to18("100000000000"));
    await this.hooliganMetapool.connect(user).add_liquidity([to6("1000"), to18("1000")], to18("2000"));
    this.result = await this.firm.connect(user).deposit(this.hooligan.address, to6("1000"), EXTERNAL);
    this.result = await this.firm.connect(user2).deposit(this.hooligan.address, to6("1000"), EXTERNAL);
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("Rain", async function () {
    it("Not raining", async function () {
      const gameday = await this.gameday.time();
      expect(gameday.raining).to.be.equal(false);
    });

    it("Raining", async function () {
      await this.field.incrementTotalCasualsE(to18("100"));
      await this.gameday.rainActuation();
      await this.firm.update(userAddress);
      const rain = await this.gameday.rain();
      const gameday = await this.gameday.time();
      expect(gameday.rainStart).to.be.equal(gameday.current);
      expect(gameday.raining).to.be.equal(true);
      expect(rain.casuals).to.be.equal(await this.field.totalCasuals());
      expect(rain.roots).to.be.equal("20000000000000000000000000");
      const userRain = await this.firm.balanceOfSop(userAddress);
      expect(userRain.lastRain).to.be.equal(gameday.rainStart);
      expect(userRain.roots).to.be.equal("10000000000000000000000000");
    });

    it("Stops raining", async function () {
      await this.field.incrementTotalCasualsE(to18("100"));
      await this.gameday.rainActuation();
      await this.firm.update(userAddress);
      await this.gameday.droughtActuation();
      await this.firm.update(userAddress);
      const gameday = await this.gameday.time();
      expect(gameday.rainStart).to.be.equal(gameday.current - 1);
      const userRain = await this.firm.balanceOfSop(userAddress);
      expect(userRain.lastRain).to.be.equal(0);
    });
  });

  describe("Sop when P <= 1", async function () {
    it("sops p = 1", async function () {
      await this.gameday.rainActuations(25);
      const gameday = await this.gameday.time();
      const rain = await this.gameday.rain();
      expect(gameday.lastSop).to.be.equal(0);
      expect(gameday.lastSopGameday).to.be.equal(0);
    });

    it("sops p < 1", async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([to6("100"), to18("0")], to18("50"));
      await this.gameday.rainActuations(25);
      const gameday = await this.gameday.time();
      const rain = await this.gameday.rain();
      expect(gameday.lastSop).to.be.equal(0);
      expect(gameday.lastSopGameday).to.be.equal(0);
    });
  });

  describe("1 sop", async function () {
    beforeEach(async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([to6("0"), to18("200")], to18("50"));
      await this.gameday.rainActuation();
      await this.firm.update(user2Address);
      await this.gameday.rainActuations(24);
    });

    it("sops p > 1", async function () {
      const gameday = await this.gameday.time();
      const balances = await this.hooliganMetapool.get_balances();
      const scaledBalance1 = balances[1].div(ethers.utils.parseEther("0.000001"));
      expect(balances[0]).to.be.within(scaledBalance1.sub(1), scaledBalance1.add(1));
      expect(gameday.lastSop).to.be.equal(gameday.rainStart);
      expect(gameday.lastSopGameday).to.be.equal(await this.gameday.gameday());
      expect(await this.threeCurve.balanceOf(this.firm.address)).to.be.equal("100416214692705624318");
    });

    it("tracks user plenty before update", async function () {
      expect(await this.firm.connect(user).balanceOfPlenty(userAddress)).to.be.equal("50208107346352812150");
    });

    it("tracks user plenty after update", async function () {
      await this.firm.update(userAddress);
      const userSop = await this.firm.balanceOfSop(userAddress);
      expect(userSop.lastRain).to.be.equal(3);
      expect(userSop.lastSop).to.be.equal(3);
      expect(userSop.roots).to.be.equal("10000000000000000000000000");
      expect(userSop.plenty).to.be.equal("50208107346352812150");
      expect(userSop.plentyPerRoot).to.be.equal("5020810734635281215");
    });

    it("tracks user2 plenty", async function () {
      expect(await this.firm.connect(user).balanceOfPlenty(user2Address)).to.be.equal("50208107346352812150");
    });

    it("tracks user2 plenty after update", async function () {
      await this.firm.update(user2Address);
      const userSop = await this.firm.balanceOfSop(user2Address);
      expect(userSop.lastRain).to.be.equal(3);
      expect(userSop.lastSop).to.be.equal(3);
      expect(userSop.roots).to.be.equal("10000000000000000000000000");
      expect(userSop.plenty).to.be.equal("50208107346352812150");
      expect(userSop.plentyPerRoot).to.be.equal("5020810734635281215");
    });

    it("claims user plenty", async function () {
      await this.firm.update(user2Address);
      await this.firm.connect(user2).claimPlenty();
      expect(await this.firm.balanceOfPlenty(user2Address)).to.be.equal("0");
      expect(await this.threeCurve.balanceOf(user2Address)).to.be.equal("50208107346352812150");
    });
  });

  describe("multiple sop", async function () {
    beforeEach(async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([to6("0"), to18("200")], to18("50"));
      await this.gameday.rainActuation();
      await this.firm.update(user2Address);
      await this.gameday.rainActuations(24);
      await this.gameday.droughtActuation();
      await this.hooliganMetapool.connect(user).add_liquidity([to6("0"), to18("200")], to18("50"));
      await this.gameday.rainActuations(25);
    });

    it("sops p > 1", async function () {
      const gameday = await this.gameday.time();
      const balances = await this.hooliganMetapool.get_balances();
      const scaledBalance1 = balances[1].div(ethers.utils.parseEther("0.000001"));
      expect(balances[0]).to.be.within(scaledBalance1.sub(1), scaledBalance1.add(1));
      expect(gameday.lastSop).to.be.equal(gameday.rainStart);
      expect(gameday.lastSopGameday).to.be.equal(await this.gameday.gameday());
      expect(await this.threeCurve.balanceOf(this.firm.address)).to.be.equal("200797438285419950779");
    });

    it("tracks user plenty before update", async function () {
      expect(await this.firm.connect(user).balanceOfPlenty(userAddress)).to.be.equal("100393700583386272030");
    });

    it("tracks user plenty after update", async function () {
      await this.firm.update(userAddress);
      const userSop = await this.firm.balanceOfSop(userAddress);
      expect(userSop.lastRain).to.be.equal(29);
      expect(userSop.lastSop).to.be.equal(29);
      expect(userSop.roots).to.be.equal("10000000000000000000000000");
      expect(userSop.plenty).to.be.equal("100393700583386272030");
      expect(userSop.plentyPerRoot).to.be.equal("10039370058338627203");
    });

    it("tracks user2 plenty", async function () {
      expect(await this.firm.connect(user).balanceOfPlenty(user2Address)).to.be.equal("100403737702033678721");
    });

    it("tracks user2 plenty after update", async function () {
      await this.firm.update(user2Address);
      const userSop = await this.firm.balanceOfSop(user2Address);
      expect(userSop.lastRain).to.be.equal(29);
      expect(userSop.lastSop).to.be.equal(29);
      expect(userSop.roots).to.be.equal("10002000000000000000000000");
      expect(userSop.plenty).to.be.equal("100403737702033678721");
      expect(userSop.plentyPerRoot).to.be.equal("10039370058338627203");
    });
  });
});
