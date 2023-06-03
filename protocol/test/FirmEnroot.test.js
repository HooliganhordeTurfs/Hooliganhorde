const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { readPrune, toBN, signFirmDepositTokenPermit, signFirmDepositTokensPermit, getHooligan } = require("../utils");
const { getAltHooliganhorde } = require("../utils/contracts.js");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { HOOLIGAN, THREE_POOL, HOOLIGAN_3_CURVE, UNRIPE_LP, UNRIPE_HOOLIGAN, THREE_CURVE } = require("./utils/constants");
const { to18, to6, toHorde, toHooligan } = require("./utils/helpers.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
const ZERO_BYTES = ethers.utils.formatBytes32String("0x0");

let user, user2, owner;
let userAddress, ownerAddress, user2Address;

let pru;

function pruneToProspects(value, prospects = 2) {
  return prune(value).mul(prospects);
}

function pruneToHorde(value) {
  return prune(value).mul(toBN("10000"));
}

function prune(value) {
  return toBN(value).mul(toBN(pru)).div(to18("1"));
}

describe("Firm Enroot", function () {
  before(async function () {
    pru = await readPrune();
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;

    // Setup mock facets for manipulating Hooliganhorde's state during tests
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.firm = await ethers.getContractAt("MockFirmFacet", this.diamond.address);
    this.unripe = await ethers.getContractAt("MockUnripeFacet", this.diamond.address);

    this.threeCurve = await ethers.getContractAt("MockToken", THREE_CURVE);
    this.hooliganMetapool = await ethers.getContractAt("IMockCurvePool", HOOLIGAN_3_CURVE);
    await this.hooliganMetapool.set_supply(ethers.utils.parseUnits("2000000", 6));
    await this.hooliganMetapool.set_balances([ethers.utils.parseUnits("1000000", 6), ethers.utils.parseEther("1000000")]);

    const FirmToken = await ethers.getContractFactory("MockToken");
    this.firmToken = await FirmToken.deploy("Firm", "FIRM");
    await this.firmToken.deployed();

    await this.firm.mockWhitelistToken(this.firmToken.address, this.firm.interface.getSighash("mockBDV(uint256 amount)"), "10000", "1");

    await this.gameday.firmActuation(0);
    await this.firmToken.connect(user).approve(this.firm.address, "100000000000");
    await this.firmToken.connect(user2).approve(this.firm.address, "100000000000");
    await this.firmToken.mint(userAddress, "10000");
    await this.firmToken.mint(user2Address, "10000");

    await this.firmToken.connect(owner).approve(this.firm.address, to18("10000"));
    await this.firmToken.mint(ownerAddress, to18("10000"));

    this.unripeHooligans = await ethers.getContractAt("MockToken", UNRIPE_HOOLIGAN);
    await this.unripeHooligans.connect(user).mint(userAddress, to6("10000"));
    await this.unripeHooligans.connect(user).approve(this.firm.address, to18("10000"));
    await this.unripe.addUnripeToken(UNRIPE_HOOLIGAN, this.firmToken.address, ZERO_BYTES);
    await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("10000").mul(toBN(pru)).div(to18("1")));

    this.unripeLP = await ethers.getContractAt("MockToken", UNRIPE_LP);
    await this.unripeLP.connect(user).mint(userAddress, to6("10000"));
    await this.unripeLP.connect(user).approve(this.firm.address, to18("10000"));
    await this.unripe.addUnripeToken(UNRIPE_LP, this.firmToken.address, ZERO_BYTES);
    await this.unripe.connect(owner).addUnderlying(UNRIPE_LP, toBN(pru).mul(toBN("10000")));

    this.hooliganThreeCurve = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
    await this.hooliganThreeCurve.set_supply(ethers.utils.parseEther("2000000"));
    await this.hooliganThreeCurve.set_balances([ethers.utils.parseUnits("1000000", 6), ethers.utils.parseEther("1000000")]);
    await this.hooliganThreeCurve.set_balances([ethers.utils.parseUnits("1200000", 6), ethers.utils.parseEther("1000000")]);
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("enrootDeposit fails if not unripe token", async function () {
    await expect(this.firm.connect(user).enrootDeposit(HOOLIGAN, "1", "1")).to.be.revertedWith("Firm: token not unripe");
  });

  it("enrootDeposits fails if not unripe token", async function () {
    await expect(this.firm.connect(user).enrootDeposits(HOOLIGAN, ["1"], ["1"])).to.be.revertedWith("Firm: token not unripe");
  });

  describe("1 deposit, some", async function () {
    beforeEach(async function () {
      await this.firm.connect(user).deposit(UNRIPE_HOOLIGAN, to6("5"), EXTERNAL);
      await this.firm.connect(user).mockUnripeHooliganDeposit("2", to6("5"));
      await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("1000"));

      this.result = await this.firm.connect(user).enrootDeposit(UNRIPE_HOOLIGAN, "2", to6("5"));
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.getTotalDeposited(UNRIPE_HOOLIGAN)).to.eq(to6("10"));
      expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("10")).add(toHorde("0.5")));
      expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("10")).add(to6("1")));
    });

    it("properly updates the user balance", async function () {
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(pruneToHorde(to6("10")).add(toHorde("0.5")));
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(pruneToProspects(to6("10")).add(to6("1")));
    });

    it("properly removes the crate", async function () {
      let dep = await this.firm.getDeposit(userAddress, UNRIPE_HOOLIGAN, 2);
      expect(dep[0]).to.equal(to6("10"));
      expect(dep[1]).to.equal(prune(to6("10")).add(to6("0.5")));
    });

    it("emits Remove and Withdrawal event", async function () {
      await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_HOOLIGAN, 2, to6("5"));
      await expect(this.result)
        .to.emit(this.firm, "AddDeposit")
        .withArgs(userAddress, UNRIPE_HOOLIGAN, 2, to6("5"), prune(to6("5")).add(to6("0.5")));
    });
  });

  describe("1 deposit after 1 sesaon, all", async function () {
    beforeEach(async function () {
      await this.firm.connect(user).deposit(UNRIPE_HOOLIGAN, to6("5"), EXTERNAL);
      await this.firm.connect(user).mockUnripeHooliganDeposit("2", to6("5"));

      await this.gameday.lightActuation();

      await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("5000").sub(to6("10000").mul(toBN(pru)).div(to18("1"))));

      this.result = await this.firm.connect(user).enrootDeposit(UNRIPE_HOOLIGAN, "2", to6("10"));
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.getTotalDeposited(UNRIPE_HOOLIGAN)).to.eq(to6("10"));
      expect(await this.firm.totalHorde()).to.eq(toHorde("5.001"));
      expect(await this.firm.totalProspects()).to.eq(to6("10"));
    });

    it("properly updates the user balance", async function () {
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("5.001"));
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("10"));
    });

    it("properly removes the crate", async function () {
      let dep = await this.firm.getDeposit(userAddress, UNRIPE_HOOLIGAN, 2);
      expect(dep[0]).to.equal(to6("10"));
      expect(dep[1]).to.equal(to6("5"));
    });

    it("emits Remove and Withdrawal event", async function () {
      await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_HOOLIGAN, 2, to6("10"));
      await expect(this.result).to.emit(this.firm, "AddDeposit").withArgs(userAddress, UNRIPE_HOOLIGAN, 2, to6("10"), to6("5"));
    });
  });

  describe("2 deposit, all", async function () {
    beforeEach(async function () {
      await this.firm.connect(user).mockUnripeHooliganDeposit("2", to6("5"));
      await this.gameday.lightActuation();
      await this.firm.connect(user).deposit(UNRIPE_HOOLIGAN, to6("5"), EXTERNAL);
      await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("5000").sub(to6("10000").mul(toBN(pru)).div(to18("1"))));
      this.result = await this.firm.connect(user).enrootDeposits(UNRIPE_HOOLIGAN, ["2", "3"], [to6("5"), to6("5")]);
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.getTotalDeposited(UNRIPE_HOOLIGAN)).to.eq(to6("10"));
      expect(await this.firm.totalHorde()).to.eq(toHorde("5.0005"));
      expect(await this.firm.totalProspects()).to.eq(to6("10"));
    });

    it("properly updates the user balance", async function () {
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("5.0005"));
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("10"));
    });

    it("properly removes the crate", async function () {
      let dep = await this.firm.getDeposit(userAddress, UNRIPE_HOOLIGAN, 2);
      expect(dep[0]).to.equal(to6("5"));
      expect(dep[1]).to.equal(to6("2.5"));
    });

    it("emits Remove and Withdrawal event", async function () {
      await expect(this.result)
        .to.emit(this.firm, "RemoveDeposits")
        .withArgs(userAddress, UNRIPE_HOOLIGAN, [2, 3], [to6("5"), to6("5")], to6("10"));
      await expect(this.result).to.emit(this.firm, "AddDeposit").withArgs(userAddress, UNRIPE_HOOLIGAN, 2, to6("5"), to6("2.5"));
      await expect(this.result).to.emit(this.firm, "AddDeposit").withArgs(userAddress, UNRIPE_HOOLIGAN, 3, to6("5"), to6("2.5"));
    });
  });

  describe("2 deposit, round", async function () {
    beforeEach(async function () {
      await this.firm.connect(user).mockUnripeLPDeposit("0", "1", to18("0.000000083406453"), to6("10"));
      await this.firm.connect(user).mockUnripeLPDeposit("0", "2", to18("0.000000083406453"), to6("10"));
      await this.unripe.connect(owner).addUnderlying(UNRIPE_LP, "147796000000000");
      this.result = await this.firm.connect(user).enrootDeposits(UNRIPE_LP, ["1", "2"], [to6("10"), to6("10")]);
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("20"));
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("3.7120342584"));
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("14.845168"));
    });

    it("properly updates the user balance", async function () {
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("3.7120342584"));
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("14.845168"));
    });

    it("properly updates the crate", async function () {
      let dep = await this.firm.getDeposit(userAddress, UNRIPE_LP, 1);
      expect(dep[0]).to.equal(to6("10"));
      expect(dep[1]).to.equal("1855646");
      dep = await this.firm.getDeposit(userAddress, UNRIPE_LP, 2);
      expect(dep[0]).to.equal(to6("10"));
      expect(dep[1]).to.equal("1855646");
    });
  });
});
