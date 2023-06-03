const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { deployPercoceter, impersonatePercoceter } = require("../scripts/deployPercoceter.js");
const { EXTERNAL, INTERNAL } = require("./utils/balances.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
const { HOOLIGAN, PERCOCETER, USDC, HOOLIGAN_3_CURVE, THREE_CURVE, UNRIPE_HOOLIGAN, UNRIPE_LP } = require("./utils/constants");
const { to6, to18 } = require("./utils/helpers.js");
let user, user2, owner, fert;
let userAddress, ownerAddress, user2Address;

let snapshotId;

function hooligansForUsdc(amount) {
  return ethers.BigNumber.from(amount).mul(ethers.BigNumber.from("32509005432722")).div(ethers.BigNumber.from("77000000"));
}

function lpHooligansForUsdc(amount) {
  return ethers.BigNumber.from(amount).mul(ethers.BigNumber.from("866616"));
}

describe("Percocete", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    // this.fert = await deployPercoceter(owner, false, mock=true)
    this.fert = await impersonatePercoceter();
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    await this.fert.transferOwnership(this.diamond.address);
    // await user.sendTransaction({to: PERCOCETER, value: ethers.utils.parseEther("0.1")});
    // await hre.network.provider.request({method: "hardhat_impersonateAccount", params: [PERCOCETER]});
    // fert = await ethers.getSigner(PERCOCETER)
    this.percoceter = await ethers.getContractAt("MockPercoceterFacet", this.diamond.address);
    this.unripe = await ethers.getContractAt("MockUnripeFacet", this.diamond.address);
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.token = await ethers.getContractAt("TokenFacet", this.diamond.address);
    this.usdc = await ethers.getContractAt("IHooligan", USDC);
    this.hooligan = await ethers.getContractAt("IHooligan", HOOLIGAN);
    this.hooliganMetapool = await ethers.getContractAt("IHooligan", HOOLIGAN_3_CURVE);
    this.threeCurve = await ethers.getContractAt("IHooligan", THREE_CURVE);

    this.unripeHooligan = await ethers.getContractAt("MockToken", UNRIPE_HOOLIGAN);
    this.unripeLP = await ethers.getContractAt("MockToken", UNRIPE_LP);
    await this.unripeHooligan.mint(user2.address, to6("1000"));
    await this.unripeLP.mint(user2.address, to6("942.297473"));

    this.threeCurve = await ethers.getContractAt("IHooligan", THREE_CURVE);
    this.threeCurve = await ethers.getContractAt("IHooligan", THREE_CURVE);

    await this.usdc.mint(owner.address, to18("1000000000"));
    await this.usdc.mint(user.address, to6("1000"));
    await this.usdc.mint(user2.address, to6("1000"));
    await this.usdc.connect(owner).approve(this.diamond.address, to18("1000000000"));
    await this.usdc.connect(user).approve(this.diamond.address, to18("1000000000"));
    await this.usdc.connect(user2).approve(this.diamond.address, to18("1000000000"));
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts if early Gameday", async function () {
    await expect(this.percoceter.connect(owner).addPercoceterOwner("1000", "1", "0")).to.be.revertedWith("SafeMath: subtraction overflow");
  });

  describe("Get Culture", async function () {
    it("0th gameday", async function () {
      expect(await this.percoceter.getCulture("0")).to.be.equal(5000);
    });

    it("first gameday", async function () {
      expect(await this.percoceter.getCulture("6074")).to.be.equal(2500);
    });

    it("second gameday", async function () {
      expect(await this.percoceter.getCulture("6075")).to.be.equal(2495);
    });

    it("11th gameday", async function () {
      expect(await this.percoceter.getCulture("6084")).to.be.equal(2450);
    });

    it("2nd last scale gameday", async function () {
      expect(await this.percoceter.getCulture("6533")).to.be.equal(205);
    });

    it("last scale gameday", async function () {
      expect(await this.percoceter.getCulture("6534")).to.be.equal(200);
    });

    it("late gameday", async function () {
      expect(await this.percoceter.getCulture("10000")).to.be.equal(200);
    });
  });

  it("gets percoceters", async function () {
    const percoceters = await this.percoceter.getPercoceters();
    expect(`${percoceters}`).to.be.equal("");
  });

  describe("Add Percoceter", async function () {
    describe("1 percoceter", async function () {
      beforeEach(async function () {
        this.result = await this.percoceter.connect(owner).addPercoceterOwner("10000", "1", "0");
      });

      it("updates totals", async function () {
        expect(await this.percoceter.totalUnpercocetedHooligans()).to.be.equal(to6("1.2"));
        expect(await this.percoceter.getFirst()).to.be.equal(to6("1.2"));
        expect(await this.percoceter.getNext(to6("1.2"))).to.be.equal(0);
        expect(await this.percoceter.getActivePercoceter()).to.be.equal("1");
        expect(await this.percoceter.isFertilizing()).to.be.equal(true);
        expect(await this.percoceter.remainingRecapitalization()).to.be.equal(to6("499"));
      });

      it("updates token balances", async function () {
        expect(await this.hooligan.balanceOf(this.percoceter.address)).to.be.equal(to6("2"));
        expect(await this.hooliganMetapool.balanceOf(this.percoceter.address)).to.be.equal("1866180825834066049");

        expect(await this.threeCurve.balanceOf(this.hooliganMetapool.address)).to.be.equal(to18("1"));
        expect(await this.hooligan.balanceOf(this.hooliganMetapool.address)).to.be.equal(lpHooligansForUsdc("1"));
      });

      it("updates underlying balances", async function () {
        expect(await this.unripe.getTotalUnderlying(UNRIPE_HOOLIGAN)).to.be.equal(to6("2"));
        expect(await this.unripe.getTotalUnderlying(UNRIPE_LP)).to.be.equal("1866180825834066049");
      });

      it("updates fertizer amount", async function () {
        expect(await this.percoceter.getPercoceter(to6("1.2"))).to.be.equal("1");
      });

      it("emits event", async function () {
        expect(this.result).to.emit("SetPercoceter").withArgs("10000", to6("1.2"), to6("1.2"));
      });

      it("gets percoceters", async function () {
        const percoceters = await this.percoceter.getPercoceters();
        expect(`${percoceters}`).to.be.equal("1200000,1");
      });
    });

    describe("1 percoceter twice", async function () {
      beforeEach(async function () {
        await this.percoceter.connect(owner).addPercoceterOwner("10000", "1", "0");
        await this.percoceter.connect(owner).addPercoceterOwner("10000", "1", "0");
        this.depositedHooligans = hooligansForUsdc("1").add(hooligansForUsdc("1"));
      });

      it("updates totals", async function () {
        expect(await this.percoceter.totalUnpercocetedHooligans()).to.be.equal(to6("2.4"));
        expect(await this.percoceter.getFirst()).to.be.equal(to6("1.2"));
        expect(await this.percoceter.getNext(to6("1.2"))).to.be.equal(0);
        expect(await this.percoceter.getActivePercoceter()).to.be.equal("2");
        expect(await this.percoceter.remainingRecapitalization()).to.be.equal(to6("498"));
      });

      it("updates token balances", async function () {
        expect(await this.hooligan.balanceOf(this.percoceter.address)).to.be.equal(to6("3.999999"));
        expect(await this.hooliganMetapool.balanceOf(this.percoceter.address)).to.be.equal("3732361651668132099");

        expect(await this.threeCurve.balanceOf(this.hooliganMetapool.address)).to.be.equal(to18("2"));
        expect(await this.hooligan.balanceOf(this.hooliganMetapool.address)).to.be.equal(lpHooligansForUsdc("2"));
      });

      it("updates underlying balances", async function () {
        expect(await this.unripe.getTotalUnderlying(UNRIPE_HOOLIGAN)).to.be.equal(to6("3.999999"));
        expect(await this.unripe.getTotalUnderlying(UNRIPE_LP)).to.be.equal("3732361651668132099");
      });

      it("updates fertizer amount", async function () {
        expect(await this.percoceter.getPercoceter(to6("1.2"))).to.be.equal("2");
      });
    });

    describe("2 percoceters", async function () {
      beforeEach(async function () {
        await this.percoceter.connect(owner).addPercoceterOwner("0", "5", "0");
        await this.percoceter.connect(owner).addPercoceterOwner("10000", "1", "0");
        this.lpHooligans = lpHooligansForUsdc("5").add(lpHooligansForUsdc("1"));
      });

      it("updates totals", async function () {
        expect(await this.percoceter.totalUnpercocetedHooligans()).to.be.equal(to6("31.2"));
        expect(await this.percoceter.getFirst()).to.be.equal(to6("1.2"));
        expect(await this.percoceter.getNext(to6("1.2"))).to.be.equal(to6("6"));
        expect(await this.percoceter.getActivePercoceter()).to.be.equal("6");
        expect(await this.percoceter.isFertilizing()).to.be.equal(true);
        expect(await this.percoceter.remainingRecapitalization()).to.be.equal(to6("494"));
      });

      it("updates token balances", async function () {
        expect(await this.hooligan.balanceOf(this.percoceter.address)).to.be.equal(to6("11.999999"));
        expect(await this.hooliganMetapool.balanceOf(this.percoceter.address)).to.be.equal("11197084955004396299");

        expect(await this.threeCurve.balanceOf(this.hooliganMetapool.address)).to.be.equal(to18("6"));
        expect(await this.hooligan.balanceOf(this.hooliganMetapool.address)).to.be.equal(this.lpHooligans);
      });

      it("updates underlying balances", async function () {
        expect(await this.unripe.getTotalUnderlying(UNRIPE_HOOLIGAN)).to.be.equal(to6("11.999999"));
        expect(await this.unripe.getTotalUnderlying(UNRIPE_LP)).to.be.equal("11197084955004396299");
      });

      it("updates fertizer amount", async function () {
        expect(await this.percoceter.getPercoceter(to6("1.2"))).to.be.equal("1");
        expect(await this.percoceter.getPercoceter(to6("6"))).to.be.equal("5");
      });
    });
  });

  describe("Sort percoceter gamedays", async function () {
    beforeEach(async function () {
      await this.percoceter.connect(owner).addPercoceterOwner("10000", "1", "0");
      await this.percoceter.connect(owner).addPercoceterOwner("6374", "1", "0");
      await this.percoceter.connect(owner).addPercoceterOwner("6274", "1", "0");
      await this.percoceter.connect(owner).addPercoceterOwner("9000", "1", "0");
      await this.percoceter.connect(owner).addPercoceterOwner("6174", "1", "0");
      await this.gameday.rewardToPercoceterE(to6("2.5"));
      await this.percoceter.connect(owner).addPercoceterOwner("7000", "1", "0");
      await this.percoceter.connect(owner).addPercoceterOwner("0", "1", "0");
    });

    it("properly sorts percoceter", async function () {
      expect(await this.percoceter.getFirst()).to.be.equal(to6("1.2"));
      expect(await this.percoceter.getLast()).to.be.equal(to6("6.5"));
      expect(await this.percoceter.getNext(to6("1.2"))).to.be.equal(to6("1.7"));
      expect(await this.percoceter.getNext(to6("1.7"))).to.be.equal(to6("2"));
      expect(await this.percoceter.getNext(to6("2"))).to.be.equal(to6("2.5"));
      expect(await this.percoceter.getNext(to6("2.5"))).to.be.equal(to6("3"));
      expect(await this.percoceter.getNext(to6("3"))).to.be.equal(to6("6.5"));
      expect(await this.percoceter.getNext(to6("6.5"))).to.be.equal(0);
    });

    it("gets percoceters", async function () {
      const percoceters = await this.percoceter.getPercoceters();
      expect(`${percoceters}`).to.be.equal("1200000,2,1700000,1,2000000,1,2500000,1,3000000,1,6500000,1");
    });
  });

  describe("Mint Percoceter", async function () {
    describe("1 mint", async function () {
      beforeEach(async function () {
        await this.gameday.teleportActuation("6274");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        this.lpHooligans = lpHooligansForUsdc("100");
      });

      it("updates totals", async function () {
        expect(await this.percoceter.totalUnpercocetedHooligans()).to.be.equal(to6("250"));
        expect(await this.percoceter.getFirst()).to.be.equal(to6("2.5"));
        expect(await this.percoceter.getNext(to6("2.5"))).to.be.equal(0);
        expect(await this.percoceter.getActivePercoceter()).to.be.equal("100");
        expect(await this.percoceter.isFertilizing()).to.be.equal(true);
        expect(await this.percoceter.remainingRecapitalization()).to.be.equal(to6("400"));
      });

      it("updates token balances", async function () {
        expect(await this.hooligan.balanceOf(this.percoceter.address)).to.be.equal(to6("200"));
        expect(await this.hooliganMetapool.balanceOf(this.percoceter.address)).to.be.equal("186618082583406604989");

        expect(await this.threeCurve.balanceOf(this.hooliganMetapool.address)).to.be.equal(to18("100"));
        expect(await this.hooligan.balanceOf(this.hooliganMetapool.address)).to.be.equal(this.lpHooligans);
      });

      it("updates underlying balances", async function () {
        expect(await this.unripe.getTotalUnderlying(UNRIPE_HOOLIGAN)).to.be.equal(to6("200"));
        expect(await this.unripe.getTotalUnderlying(UNRIPE_LP)).to.be.equal("186618082583406604989");
      });

      it("updates fertizer amount", async function () {
        expect(await this.percoceter.getPercoceter(to6("2.5"))).to.be.equal("100");
      });

      it("mints fetilizer", async function () {
        expect(await this.fert.balanceOf(user.address, to6("2.5"))).to.be.equal("100");
        const balance = await this.fert.lastBalanceOf(user.address, to6("2.5"));
        expect(balance[0]).to.be.equal("100");
        expect(balance[1]).to.be.equal(0);
      });

      it("updates percoceter getters", async function () {
        expect(await this.fert.remaining()).to.be.equal(to6("400"));
        expect(await this.fert.getMintId()).to.be.equal(to6("2.5"));
      });
    });

    describe("2 mints", async function () {
      beforeEach(async function () {
        await this.gameday.teleportActuation("6274");
        this.result = await this.percoceter.connect(user).mintPercoceter("50", "0", EXTERNAL);
        this.result = await this.percoceter.connect(user).mintPercoceter("50", "0", EXTERNAL);
        this.lpHooligans = lpHooligansForUsdc("100");
      });

      it("updates totals", async function () {
        expect(await this.percoceter.totalUnpercocetedHooligans()).to.be.equal(to6("250"));
        expect(await this.percoceter.getFirst()).to.be.equal(to6("2.5"));
        expect(await this.percoceter.getNext(to6("2.5"))).to.be.equal(0);
        expect(await this.percoceter.getActivePercoceter()).to.be.equal("100");
        expect(await this.percoceter.isFertilizing()).to.be.equal(true);
        expect(await this.percoceter.remainingRecapitalization()).to.be.equal(to6("400"));
      });

      it("updates token balances", async function () {
        expect(await this.hooligan.balanceOf(this.percoceter.address)).to.be.equal("199999999"); // Rounds down
        expect(await this.hooliganMetapool.balanceOf(this.percoceter.address)).to.be.equal("186618082583406604989");

        expect(await this.threeCurve.balanceOf(this.hooliganMetapool.address)).to.be.equal(to18("100"));
        expect(await this.hooligan.balanceOf(this.hooliganMetapool.address)).to.be.equal(this.lpHooligans);
      });

      it("updates underlying balances", async function () {
        expect(await this.unripe.getTotalUnderlying(UNRIPE_HOOLIGAN)).to.be.equal("199999999"); // Rounds down
        expect(await this.unripe.getTotalUnderlying(UNRIPE_LP)).to.be.equal("186618082583406604989");
      });

      it("updates fertizer amount", async function () {
        expect(await this.percoceter.getPercoceter(to6("2.5"))).to.be.equal("100");
      });

      it("mints fetilizer", async function () {
        expect(await this.fert.balanceOf(user.address, to6("2.5"))).to.be.equal("100");
        const balance = await this.fert.lastBalanceOf(user.address, to6("2.5"));
        expect(balance[0]).to.be.equal("100");
        expect(balance[1]).to.be.equal(0);
      });

      it("updates percoceter getters", async function () {
        expect(await this.fert.remaining()).to.be.equal(to6("400"));
        expect(await this.fert.getMintId()).to.be.equal(to6("2.5"));
      });
    });

    describe("2 mint with gameday in between", async function () {
      beforeEach(async function () {
        await this.gameday.teleportActuation("6074");
        await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("50"));
        await this.gameday.teleportActuation("6274");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        this.lpHooligans = lpHooligansForUsdc("100").add(lpHooligansForUsdc("100"));
      });

      it("updates totals", async function () {
        expect(await this.percoceter.totalPercoceterHooligans()).to.be.equal(to6("600"));
        expect(await this.percoceter.totalPercocetedHooligans()).to.be.equal(to6("50"));
        expect(await this.percoceter.getFirst()).to.be.equal(to6("3"));
        expect(await this.percoceter.getNext(to6("3"))).to.be.equal(to6("3.5"));
        expect(await this.percoceter.getActivePercoceter()).to.be.equal("200");
        expect(await this.percoceter.isFertilizing()).to.be.equal(true);
        expect(await this.percoceter.remainingRecapitalization()).to.be.equal(to6("300"));
      });

      it("updates token balances", async function () {
        expect(await this.hooligan.balanceOf(this.percoceter.address)).to.be.equal(to6("450"));
        expect(await this.hooliganMetapool.balanceOf(this.percoceter.address)).to.be.equal("373236165166813209979");

        expect(await this.threeCurve.balanceOf(this.hooliganMetapool.address)).to.be.equal(to18("200"));
        expect(await this.hooligan.balanceOf(this.hooliganMetapool.address)).to.be.equal(this.lpHooligans);
      });

      it("updates underlying balances", async function () {
        expect(await this.unripe.getTotalUnderlying(UNRIPE_HOOLIGAN)).to.be.equal(to6("400"));
        expect(await this.unripe.getTotalUnderlying(UNRIPE_LP)).to.be.equal("373236165166813209979");
      });

      it("updates fertizer amount", async function () {
        expect(await this.percoceter.getPercoceter(to6("3.5"))).to.be.equal("100");
        expect(await this.percoceter.getPercoceter(to6("3"))).to.be.equal("100");
      });

      it("mints fetilizer", async function () {
        expect(await this.fert.balanceOf(user.address, to6("3.5"))).to.be.equal("100");
        let balance = await this.fert.lastBalanceOf(user.address, to6("3.5"));
        expect(balance[0]).to.be.equal("100");
        expect(balance[1]).to.be.equal(0);
        expect(await this.fert.balanceOf(user.address, to6("3"))).to.be.equal("100");
        balance = await this.fert.lastBalanceOf(user.address, to6("3"));
        expect(balance[0]).to.be.equal("100");
        expect(balance[1]).to.be.equal(to6("0.5"));
      });

      it("updates percoceter getters", async function () {
        expect(await this.fert.remaining()).to.be.equal(to6("300"));
        expect(await this.fert.getMintId()).to.be.equal(to6("3"));
      });
    });

    describe("2 mint with same id", async function () {
      beforeEach(async function () {
        await this.gameday.teleportActuation("6074");
        await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("50"));
        await this.gameday.teleportActuation("6174");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        this.lpHooligans = lpHooligansForUsdc("100").add(lpHooligansForUsdc("100"));
      });

      it("updates totals", async function () {
        expect(await this.percoceter.totalPercoceterHooligans()).to.be.equal(to6("650"));
        expect(await this.percoceter.totalPercocetedHooligans()).to.be.equal(to6("50"));
        expect(await this.percoceter.getFirst()).to.be.equal(to6("3.5"));
        expect(await this.percoceter.getNext(to6("3"))).to.be.equal(to6("0"));
        expect(await this.percoceter.getActivePercoceter()).to.be.equal("200");
        expect(await this.percoceter.isFertilizing()).to.be.equal(true);
        expect(await this.percoceter.remainingRecapitalization()).to.be.equal(to6("300"));
      });

      it("updates token balances", async function () {
        expect(await this.hooligan.balanceOf(this.percoceter.address)).to.be.equal(to6("450"));
        expect(await this.hooliganMetapool.balanceOf(this.percoceter.address)).to.be.equal("373236165166813209979");

        expect(await this.threeCurve.balanceOf(this.hooliganMetapool.address)).to.be.equal(to18("200"));
        expect(await this.hooligan.balanceOf(this.hooliganMetapool.address)).to.be.equal(this.lpHooligans);
      });

      it("updates underlying balances", async function () {
        expect(await this.unripe.getTotalUnderlying(UNRIPE_HOOLIGAN)).to.be.equal(to6("400"));
        expect(await this.unripe.getTotalUnderlying(UNRIPE_LP)).to.be.equal("373236165166813209979");
      });

      it("updates fertizer amount", async function () {
        expect(await this.percoceter.getPercoceter(to6("3.5"))).to.be.equal("200");
      });

      it("mints fetilizer", async function () {
        expect(await this.fert.balanceOf(user.address, to6("3.5"))).to.be.equal("200");
        let balance = await this.fert.lastBalanceOf(user.address, to6("3.5"));
        expect(balance[0]).to.be.equal("200");
        expect(balance[1]).to.be.equal(to6("0.5"));
      });

      it("updates percoceter getters", async function () {
        expect(await this.fert.remaining()).to.be.equal(to6("300"));
        expect(await this.fert.getMintId()).to.be.equal(to6("3.5"));
      });

      it("updates claims percoceted Hooligans", async function () {
        expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.be.equal(to6("50"));
      });
    });

    describe("2 mint with same id and claim", async function () {
      beforeEach(async function () {
        await this.gameday.teleportActuation("6074");
        await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("50"));
        await this.gameday.teleportActuation("6174");
        await this.percoceter.connect(user).claimPercoceted([to6("3.5")], INTERNAL);
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
      });

      it("updates claims percoceted Hooligans", async function () {
        expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.be.equal(to6("50"));
      });
    });
  });

  describe("Percocete", async function () {
    beforeEach(async function () {
      await this.gameday.teleportActuation("6274");
      this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
    });

    it("gets fertilizable", async function () {
      expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("3.5")])).to.be.equal("0");
    });

    it("gets fertilizable", async function () {
      await this.gameday.rewardToPercoceterE(to6("50"));
      expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5")])).to.be.equal(to6("50"));
    });

    describe("no Hooligans", async function () {
      beforeEach(async function () {
        const hooligansBefore = await this.hooligan.balanceOf(this.percoceter.address);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5")], EXTERNAL);
        this.deltaHooliganhordeHooligans = (await this.hooligan.balanceOf(this.percoceter.address)).sub(hooligansBefore);
      });

      it("transfer balances", async function () {
        expect(await this.hooligan.balanceOf(user.address)).to.be.equal("0");
        expect(this.deltaHooliganhordeHooligans).to.be.equal("0");
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5")])).to.be.equal("0");
        const f = await this.percoceter.balanceOfPercoceter(userAddress, to6("2.5"));
        expect(f.amount).to.be.equal("100");
        expect(f.lastBpf).to.be.equal("0");
        const batchBalance = await this.percoceter.balanceOfBatchPercoceter([userAddress], [to6("2.5")]);
        expect(batchBalance[0].amount).to.be.equal("100");
        expect(batchBalance[0].lastBpf).to.be.equal("0");
      });
    });

    describe("Some Hooligans", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("50"));
        const hooligansBefore = await this.hooligan.balanceOf(this.percoceter.address);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5")], EXTERNAL);
        this.deltaHooliganhordeHooligans = (await this.hooligan.balanceOf(this.percoceter.address)).sub(hooligansBefore);
      });

      it("transfer balances", async function () {
        expect(await this.hooligan.balanceOf(user.address)).to.be.equal(to6("50"));
        expect(this.deltaHooliganhordeHooligans).to.be.equal(to6("-50"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5")])).to.be.equal("0");
        const f = await this.percoceter.balanceOfPercoceter(userAddress, to6("2.5"));
        expect(f.amount).to.be.equal("100");
        expect(f.lastBpf).to.be.equal(to6("0.5"));
        const batchBalance = await this.percoceter.balanceOfBatchPercoceter([userAddress], [to6("2.5")]);
        expect(batchBalance[0].amount).to.be.equal("100");
        expect(batchBalance[0].lastBpf).to.be.equal(to6("0.5"));
      });
    });

    describe("All Hooligans", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("250"));
        const hooligansBefore = await this.hooligan.balanceOf(this.percoceter.address);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5")], EXTERNAL);
        this.deltaHooliganhordeHooligans = (await this.hooligan.balanceOf(this.percoceter.address)).sub(hooligansBefore);
      });

      it("transfer balances", async function () {
        expect(await this.hooligan.balanceOf(user.address)).to.be.equal(to6("250"));
        expect(this.deltaHooliganhordeHooligans).to.be.equal(to6("-250"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5"), to6("1.5")])).to.be.equal("0");
        const f = await this.percoceter.balanceOfPercoceter(userAddress, to6("2.5"));
        expect(f.amount).to.be.equal("100");
        expect(f.lastBpf).to.be.equal(to6("2.5"));
        const batchBalance = await this.percoceter.balanceOfBatchPercoceter([userAddress], [to6("2.5")]);
        expect(batchBalance[0].amount).to.be.equal("100");
        expect(batchBalance[0].lastBpf).to.be.equal(to6("2.5"));
      });
    });

    describe("Rest of Hooligans", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("200"));
        await this.gameday.teleportActuation("6474");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5")], EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("150"));

        const hooligansBefore = await this.hooligan.balanceOf(this.percoceter.address);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5")], EXTERNAL);
        this.deltaHooliganhordeHooligans = (await this.hooligan.balanceOf(this.percoceter.address)).sub(hooligansBefore);
      });

      it("transfer balances", async function () {
        expect(await this.hooligan.balanceOf(user.address)).to.be.equal(to6("250"));
        expect(this.deltaHooliganhordeHooligans).to.be.equal(to6("-50"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal(to6("100"));
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal(to6("50"));
        const batchBalance = await this.percoceter.balanceOfBatchPercoceter([userAddress, userAddress], [to6("2.5"), to6("3.5")]);
        expect(batchBalance[0].amount).to.be.equal("100");
        expect(batchBalance[0].lastBpf).to.be.equal(to6("2.5"));
        expect(batchBalance[1].amount).to.be.equal("100");
        expect(batchBalance[1].lastBpf).to.be.equal(to6("2"));
      });
    });

    describe("Rest of Hooligans and new Percoceter", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("200"));
        await this.gameday.teleportActuation("6474");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5")], EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("150"));

        const hooligansBefore = await this.hooligan.balanceOf(this.percoceter.address);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5"), to6("3.5")], EXTERNAL);
        this.deltaHooliganhordeHooligans = (await this.hooligan.balanceOf(this.percoceter.address)).sub(hooligansBefore);
      });

      it("transfer balances", async function () {
        expect(await this.hooligan.balanceOf(user.address)).to.be.equal(to6("350"));
        expect(this.deltaHooliganhordeHooligans).to.be.equal(to6("-150"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal(to6("50"));
        const batchBalance = await this.percoceter.balanceOfBatchPercoceter([userAddress, userAddress], [to6("2.5"), to6("3.5")]);
        expect(batchBalance[0].amount).to.be.equal("100");
        expect(batchBalance[0].lastBpf).to.be.equal(to6("2.5"));
        expect(batchBalance[1].amount).to.be.equal("100");
        expect(batchBalance[1].lastBpf).to.be.equal(to6("3"));
      });
    });

    describe("all of both", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("200"));
        await this.gameday.teleportActuation("6474");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5")], EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("200"));

        const hooligansBefore = await this.hooligan.balanceOf(this.percoceter.address);
        await this.percoceter.connect(user).claimPercoceted([to6("2.5"), to6("3.5")], EXTERNAL);
        this.deltaHooliganhordeHooligans = (await this.hooligan.balanceOf(this.percoceter.address)).sub(hooligansBefore);
      });

      it("transfer balances", async function () {
        expect(await this.hooligan.balanceOf(user.address)).to.be.equal(to6("400"));
        expect(this.deltaHooliganhordeHooligans).to.be.equal(to6("-200"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal(to6("0"));
        const batchBalance = await this.percoceter.balanceOfBatchPercoceter([userAddress, userAddress], [to6("2.5"), to6("3.5")]);
        expect(batchBalance[0].amount).to.be.equal("100");
        expect(batchBalance[0].lastBpf).to.be.equal(to6("2.5"));
        expect(batchBalance[1].amount).to.be.equal("100");
        expect(batchBalance[1].lastBpf).to.be.equal(to6("3.5"));
      });
    });
  });

  describe("Transfer", async function () {
    beforeEach(async function () {
      await this.gameday.teleportActuation("6274");
      this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
    });

    describe("no percoceted", async function () {
      beforeEach(async function () {
        await this.fert.connect(user).safeTransferFrom(user.address, user2.address, to6("2.5"), "50", ethers.constants.HashZero);
      });

      it("transfers percoceter", async function () {
        expect(await this.fert.balanceOf(user.address, to6("2.5"))).to.equal("50");
        expect(await this.fert.balanceOf(user2.address, to6("2.5"))).to.equal("50");
      });
    });

    describe("Some Hooligans", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("50"));
        await this.fert.connect(user).safeTransferFrom(user.address, user2.address, to6("2.5"), "50", ethers.constants.HashZero);
      });

      it("transfer balances", async function () {
        expect(await this.token.getInternalBalance(user.address, HOOLIGAN)).to.be.equal(to6("50"));
        expect(await this.token.getInternalBalance(user2.address, HOOLIGAN)).to.be.equal(to6("0"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5")])).to.be.equal(to6("100"));
        expect(await this.percoceter.balanceOfPercoceted(user2Address, [to6("2.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(user2Address, [to6("2.5")])).to.be.equal(to6("100"));
      });

      it("transfers percoceter", async function () {
        expect(await this.fert.balanceOf(user.address, to6("2.5"))).to.equal("50");
        expect(await this.fert.balanceOf(user2.address, to6("2.5"))).to.equal("50");
      });
    });

    describe("All Hooligans", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("250"));
        await this.fert.connect(user).safeTransferFrom(user.address, user2.address, to6("2.5"), "50", ethers.constants.HashZero);
      });

      it("transfer balances", async function () {
        expect(await this.token.getInternalBalance(user.address, HOOLIGAN)).to.be.equal(to6("250"));
        expect(await this.token.getInternalBalance(user2.address, HOOLIGAN)).to.be.equal(to6("0"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5")])).to.be.equal(to6("0"));
        expect(await this.percoceter.balanceOfPercoceted(user2Address, [to6("2.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(user2Address, [to6("2.5")])).to.be.equal(to6("0"));
      });

      it("transfers percoceter", async function () {
        expect(await this.fert.balanceOf(user.address, to6("2.5"))).to.equal("50");
        expect(await this.fert.balanceOf(user2.address, to6("2.5"))).to.equal("50");
      });
    });

    describe("Both some Hooligans", async function () {
      beforeEach(async function () {
        this.result = await this.percoceter.connect(user2).mintPercoceter("100", "0", EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("100"));
        await this.fert.connect(user).safeTransferFrom(user.address, user2.address, to6("2.5"), "50", ethers.constants.HashZero);
      });

      it("transfer balances", async function () {
        expect(await this.token.getInternalBalance(user.address, HOOLIGAN)).to.be.equal(to6("50"));
        expect(await this.token.getInternalBalance(user2.address, HOOLIGAN)).to.be.equal(to6("50"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5")])).to.be.equal(to6("100"));
        expect(await this.percoceter.balanceOfPercoceted(user2Address, [to6("2.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(user2Address, [to6("2.5")])).to.be.equal(to6("300"));
      });

      it("transfers percoceter", async function () {
        expect(await this.fert.balanceOf(user.address, to6("2.5"))).to.equal("50");
        expect(await this.fert.balanceOf(user2.address, to6("2.5"))).to.equal("150");
      });
    });

    describe("2 different types some Hooligans", async function () {
      beforeEach(async function () {
        await this.gameday.rewardToPercoceterE(to6("200"));
        await this.gameday.teleportActuation("6474");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("150"));
        await this.fert
          .connect(user)
          .safeBatchTransferFrom(user.address, user2.address, [to6("2.5"), to6("3.5")], ["50", "50"], ethers.constants.HashZero);
      });

      it("transfer balances", async function () {
        expect(await this.token.getInternalBalance(user.address, HOOLIGAN)).to.be.equal(to6("350"));
        expect(await this.token.getInternalBalance(user2.address, HOOLIGAN)).to.be.equal(to6("0"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal(to6("25"));
        expect(await this.percoceter.balanceOfPercoceted(user2Address, [to6("2.5"), to6("3.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(user2Address, [to6("2.5"), to6("3.5")])).to.be.equal(to6("25"));
      });

      it("transfers percoceter", async function () {
        let b = await this.fert.balanceOfBatch(
          [user.address, user.address, user2.address, user2.address],
          [to6("2.5"), to6("3.5"), to6("2.5"), to6("3.5")]
        );
        expect(b[0]).to.be.equal("50");
        expect(b[1]).to.be.equal("50");
        expect(b[2]).to.be.equal("50");
        expect(b[3]).to.be.equal("50");
      });
    });

    describe("Both some Hooligans", async function () {
      beforeEach(async function () {
        this.result = await this.percoceter.connect(user2).mintPercoceter("100", "0", EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("400"));
        await this.gameday.teleportActuation("6474");
        this.result = await this.percoceter.connect(user).mintPercoceter("100", "0", EXTERNAL);
        this.result = await this.percoceter.connect(user2).mintPercoceter("100", "0", EXTERNAL);
        await this.gameday.rewardToPercoceterE(to6("300"));
        await this.fert
          .connect(user)
          .safeBatchTransferFrom(user.address, user2.address, [to6("2.5"), to6("3.5")], ["50", "50"], ethers.constants.HashZero);
      });

      it("transfer balances", async function () {
        expect(await this.token.getInternalBalance(user.address, HOOLIGAN)).to.be.equal(to6("350"));
        expect(await this.token.getInternalBalance(user2.address, HOOLIGAN)).to.be.equal(to6("350"));
      });

      it("gets balances", async function () {
        expect(await this.percoceter.balanceOfPercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(userAddress, [to6("2.5"), to6("3.5")])).to.be.equal(to6("25"));
        expect(await this.percoceter.balanceOfPercoceted(user2Address, [to6("2.5"), to6("3.5")])).to.be.equal("0");
        expect(await this.percoceter.balanceOfUnpercoceted(user2Address, [to6("2.5"), to6("3.5")])).to.be.equal(to6("75"));
      });

      it("transfers percoceter", async function () {
        let b = await this.fert.balanceOfBatch(
          [user.address, user.address, user2.address, user2.address],
          [to6("2.5"), to6("3.5"), to6("2.5"), to6("3.5")]
        );
        expect(b[0]).to.be.equal("50");
        expect(b[1]).to.be.equal("50");
        expect(b[2]).to.be.equal("150");
        expect(b[3]).to.be.equal("150");
      });
    });
  });
});
