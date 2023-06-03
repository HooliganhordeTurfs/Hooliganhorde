const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { to18, to6, toHorde } = require("./utils/helpers.js");
const { HOOLIGAN } = require("./utils/constants");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");

let user, user2, owner;
let userAddress, ownerAddress, user2Address;

describe("Firm", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.firm = await ethers.getContractAt("MockFirmFacet", this.diamond.address);
    this.hooligan = await ethers.getContractAt("Hooligan", HOOLIGAN);

    await this.gameday.lightActuation();
    await this.hooligan.connect(user).approve(this.firm.address, "100000000000");
    await this.hooligan.connect(user2).approve(this.firm.address, "100000000000");
    await this.hooligan.mint(userAddress, to6("10000"));
    await this.hooligan.mint(user2Address, to6("10000"));
    await this.firm.update(userAddress);
    this.result = await this.firm.connect(user).deposit(this.hooligan.address, to6("1000"), EXTERNAL);
    this.result = await this.firm.connect(user2).deposit(this.hooligan.address, to6("1000"), EXTERNAL);
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("Firm Balances After Deposits", function () {
    it("properly updates the user balances", async function () {
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("2000"));
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("1000"));
      expect(await this.firm.balanceOfRoots(userAddress)).to.eq(toHorde("1000000000000000"));
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.totalProspects()).to.eq(to6("4000"));
      expect(await this.firm.totalHorde()).to.eq(toHorde("2000"));
      expect(await this.firm.totalRoots()).to.eq(toHorde("2000000000000000"));
    });
  });

  describe("Firm Balances After Withdrawal", function () {
    beforeEach(async function () {
      await this.firm.connect(user).withdrawDeposit(this.hooligan.address, "2", to6("500"));
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("1000"));
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("500"));
      expect(await this.firm.balanceOfRoots(userAddress)).to.eq(toHorde("500000000000000"));
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.totalProspects()).to.eq(to6("3000"));
      expect(await this.firm.totalHorde()).to.eq(toHorde("1500"));
      expect(await this.firm.totalRoots()).to.eq(toHorde("1500000000000000"));
    });
  });

  describe("Firm Actuation", async function () {
    describe("Single", async function () {
      beforeEach(async function () {
        await this.gameday.firmActuation(to6("100"));
      });

      it("properly updates the earned balances", async function () {
        expect(await this.firm.balanceOfGrownHorde(userAddress)).to.eq(toHorde("0.2"));
        expect(await this.firm.balanceOfEarnedHooligans(userAddress)).to.eq(to6("50"));
        expect(await this.firm.balanceOfEarnedProspects(userAddress)).to.eq(to6("100"));
        expect(await this.firm.balanceOfEarnedHorde(userAddress)).to.eq(toHorde("50"));
        expect(await this.firm.totalEarnedHooligans()).to.eq(to6("100"));
      });

      it("properly updates the total balances", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("2000"));
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("1050"));
        expect(await this.firm.balanceOfRoots(userAddress)).to.eq(toHorde("1000000000000000"));
      });

      it("properly updates the total balances", async function () {
        expect(await this.firm.totalProspects()).to.eq(to6("4000"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("2100"));
        expect(await this.firm.totalRoots()).to.eq(toHorde("2000000000000000"));
      });
    });
  });

  describe("Single Earn", async function () {
    beforeEach(async function () {
      await this.gameday.firmActuation(to6("100"));
      await this.firm.update(user2Address);
      this.result = await this.firm.connect(user).recruit();
    });

    it("properly updates the earned balances", async function () {
      expect(await this.firm.balanceOfGrownHorde(userAddress)).to.eq("0");
      expect(await this.firm.balanceOfEarnedHooligans(userAddress)).to.eq("0");
      expect(await this.firm.balanceOfEarnedProspects(userAddress)).to.eq("0");
      expect(await this.firm.balanceOfEarnedHorde(userAddress)).to.eq("0");
      expect(await this.firm.totalEarnedHooligans()).to.eq(to6("50"));
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("2100"));
      expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("1050.2"));
      expect(await this.firm.balanceOfRoots(userAddress)).to.eq("10001904761904761904761904");
    });

    it("properly updates the total balances", async function () {
      expect(await this.firm.totalProspects()).to.eq(to6("4100"));
      expect(await this.firm.totalHorde()).to.eq(to6("21004000"));
      expect(await this.firm.totalRoots()).to.eq("20003809523809523809523808");
    });

    it("properly emits events", async function () {
      expect(this.result).to.emit(this.firm, "Earn");
    });

    it("user2 earns rest", async function () {
      await this.firm.connect(user2).recruit();
      expect(await this.firm.totalEarnedHooligans()).to.eq("0");
    });
  });
});
