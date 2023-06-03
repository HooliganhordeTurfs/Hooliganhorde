const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { readPrune, toBN, signFirmDepositTokenPermit, signFirmDepositTokensPermit } = require("../utils");
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

describe("Firm Token", function () {
  before(async function () {
    pru = await readPrune();
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
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

    this.firmToken2 = await FirmToken.deploy("Firm", "FIRM");
    await this.firmToken2.deployed();

    await this.firm.mockWhitelistToken(this.firmToken.address, this.firm.interface.getSighash("mockBDV(uint256 amount)"), "10000", "1");

    await this.gameday.firmActuation(0);
    await this.firmToken.connect(user).approve(this.firm.address, "100000000000");
    await this.firmToken.connect(user2).approve(this.firm.address, "100000000000");
    await this.firmToken.mint(userAddress, "10000");
    await this.firmToken.mint(user2Address, "10000");
    await this.firmToken2.connect(user).approve(this.firm.address, "100000000000");
    await this.firmToken2.mint(userAddress, "10000");

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

  describe("deposit", function () {
    describe("reverts", function () {
      it("reverts if BDV is 0", async function () {
        await expect(this.firm.connect(user).deposit(this.firmToken.address, "0", EXTERNAL)).to.revertedWith(
          "Firm: No Hooligans under Token."
        );
      });

      it("reverts if deposits a non whitelisted token", async function () {
        await expect(this.firm.connect(user).deposit(this.firmToken2.address, "0", EXTERNAL)).to.revertedWith(
          "Diamond: Function does not exist"
        );
      });
    });

    describe("single deposit", function () {
      beforeEach(async function () {
        this.result = await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
      });

      it("properly updates the total balances", async function () {
        expect(await this.firm.getTotalDeposited(this.firmToken.address)).to.eq("1000");
        expect(await this.firm.totalProspects()).to.eq("1000");
        expect(await this.firm.totalHorde()).to.eq("10000000");
      });

      it("properly updates the user balance", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10000000");
      });

      it("properly adds the crate", async function () {
        const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, 2);
        expect(deposit[0]).to.eq("1000");
        expect(deposit[1]).to.eq("1000");
      });

      it("emits Deposit event", async function () {
        await expect(this.result).to.emit(this.firm, "AddDeposit").withArgs(userAddress, this.firmToken.address, 2, "1000", "1000");
      });
    });

    describe("2 deposits same gameday", function () {
      beforeEach(async function () {
        this.result = await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
        this.result = await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
      });

      it("properly updates the total balances", async function () {
        expect(await this.firm.getTotalDeposited(this.firmToken.address)).to.eq("2000");
        expect(await this.firm.totalProspects()).to.eq("2000");
        expect(await this.firm.totalHorde()).to.eq("20000000");
      });

      it("properly updates the user balance", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq("2000");
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq("20000000");
      });

      it("properly adds the crate", async function () {
        const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, 2);
        expect(deposit[0]).to.eq("2000");
        expect(deposit[1]).to.eq("2000");
      });
    });

    describe("2 deposits 2 users", function () {
      beforeEach(async function () {
        this.result = await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
        this.result = await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);
      });

      it("properly updates the total balances", async function () {
        expect(await this.firm.getTotalDeposited(this.firmToken.address)).to.eq("2000");
        expect(await this.firm.totalProspects()).to.eq("2000");
        expect(await this.firm.totalHorde()).to.eq("20000000");
      });

      it("properly updates the user balance", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10000000");
      });
      it("properly updates the user2 balance", async function () {
        expect(await this.firm.balanceOfProspects(user2Address)).to.eq("1000");
        expect(await this.firm.balanceOfHorde(user2Address)).to.eq("10000000");
      });

      it("properly adds the crate", async function () {
        let deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, 2);
        expect(deposit[0]).to.eq("1000");
        expect(deposit[1]).to.eq("1000");
        deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, 2);
        expect(deposit[0]).to.eq("1000");
        expect(deposit[1]).to.eq("1000");
      });
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
    });
    describe("reverts", function () {
      it("reverts if amount is 0", async function () {
        await expect(this.firm.connect(user).withdrawDeposit(this.firmToken.address, "2", "1001")).to.revertedWith(
          "Firm: Crate balance too low."
        );
      });

      it("reverts if deposits + withdrawals is a different length", async function () {
        await expect(this.firm.connect(user).withdrawDeposits(this.firmToken.address, ["2", "3"], ["1001"])).to.revertedWith(
          "Firm: Crates, amounts are diff lengths."
        );
      });
    });

    describe("withdraw token by gameday", async function () {
      describe("withdraw 1 Hooligan crate", async function () {
        beforeEach(async function () {
          this.result = await this.firm.connect(user).withdrawDeposit(this.firmToken.address, 2, "1000");
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(this.firmToken.address)).to.eq("0");
          expect(await this.firm.totalHorde()).to.eq("0");
          expect(await this.firm.totalProspects()).to.eq("0");
          expect(await this.firm.getTotalWithdrawn(this.firmToken.address)).to.eq("1000");
        });
        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
        });

        it("properly removes the deposit", async function () {
          const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, 2);
          expect(deposit[0]).to.eq("0");
          expect(deposit[1]).to.eq("0");
        });

        it("properly adds the withdrawal", async function () {
          expect(await this.firm.getWithdrawal(userAddress, this.firmToken.address, 27)).to.eq("1000");
        });

        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, this.firmToken.address, 2, "1000");
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, this.firmToken.address, 27, "1000");
        });
      });

      describe("withdraw part of a hooligan crate", function () {
        beforeEach(async function () {
          this.result = await this.firm.connect(user).withdrawDeposit(this.firmToken.address, 2, "500");
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(this.firmToken.address)).to.eq("500");
          expect(await this.firm.totalHorde()).to.eq("5000000");
          expect(await this.firm.totalProspects()).to.eq("500");
          expect(await this.firm.getTotalWithdrawn(this.firmToken.address)).to.eq("500");
        });
        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("5000000");
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("500");
        });

        it("properly removes the deposit", async function () {
          const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, 2);
          expect(deposit[0]).to.eq("500");
          expect(deposit[1]).to.eq("500");
        });

        it("properly adds the withdrawal", async function () {
          expect(await this.firm.getWithdrawal(userAddress, this.firmToken.address, 27)).to.eq("500");
        });

        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, this.firmToken.address, 2, "500");
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, this.firmToken.address, 27, "500");
        });
      });
    });

    describe("withdraw token by gamedays", async function () {
      describe("1 full and 1 partial token crates", function () {
        beforeEach(async function () {
          await this.gameday.firmActuation(0);
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
          this.result = await this.firm.connect(user).withdrawDeposits(this.firmToken.address, [2, 3], ["500", "1000"]);
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(this.firmToken.address)).to.eq("500");
          expect(await this.firm.totalHorde()).to.eq("5000500");
          expect(await this.firm.totalProspects()).to.eq("500");
          expect(await this.firm.getTotalWithdrawn(this.firmToken.address)).to.eq("1500");
        });
        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("5000500");
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("500");
        });
        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, this.firmToken.address, 2);
          expect(dep[0]).to.equal("500");
          expect(dep[1]).to.equal("500");
          dep = await this.firm.getDeposit(userAddress, this.firmToken.address, 3);
          expect(dep[0]).to.equal("0");
          expect(dep[1]).to.equal("0");
        });
        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.firmToken.address, [2, 3], ["500", "1000"], "1500");
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, this.firmToken.address, 28, "1500");
        });
      });
      describe("2 token crates", function () {
        beforeEach(async function () {
          await this.gameday.firmActuation(0);
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
          this.result = await this.firm.connect(user).withdrawDeposits(this.firmToken.address, [2, 3], ["1000", "1000"]);
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(this.firmToken.address)).to.eq("0");
          expect(await this.firm.totalHorde()).to.eq("0");
          expect(await this.firm.totalProspects()).to.eq("0");
          expect(await this.firm.getTotalWithdrawn(this.firmToken.address)).to.eq("2000");
        });
        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
        });
        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, this.firmToken.address, 2);
          expect(dep[0]).to.equal("0");
          expect(dep[1]).to.equal("0");
          dep = await this.firm.getDeposit(userAddress, this.firmToken.address, 3);
          expect(dep[0]).to.equal("0");
          expect(dep[1]).to.equal("0");
        });
        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.firmToken.address, [2, 3], ["1000", "1000"], "2000");
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, this.firmToken.address, 28, "2000");
        });
      });
    });
  });

  describe("claim", function () {
    beforeEach(async function () {
      await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
      await this.firm.connect(user).withdrawDeposit(this.firmToken.address, "2", "1000");
      await this.gameday.fastForward(25);
    });

    describe("claim token by gameday", function () {
      beforeEach(async function () {
        const userTokensBefore = await this.firmToken.balanceOf(userAddress);
        this.result = await this.firm.connect(user).claimWithdrawal(this.firmToken.address, 27, EXTERNAL);
        this.deltaHooligans = (await this.firmToken.balanceOf(userAddress)).sub(userTokensBefore);
      });

      it("properly updates the total balances", async function () {
        expect(await this.firm.getTotalWithdrawn(this.firmToken.address)).to.eq("0");
        expect(this.deltaHooligans).to.equal("1000");
      });

      it("properly removes the withdrawal", async function () {
        expect(await this.firm.getWithdrawal(userAddress, this.firmToken.address, 27)).to.eq("0");
      });

      it("emits a claim ", async function () {
        await expect(this.result).to.emit(this.firm, "RemoveWithdrawal").withArgs(userAddress, this.firmToken.address, 27, "1000");
      });
    });

    describe("claim token by gamedays", function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
        await this.firm.connect(user).withdrawDeposit(this.firmToken.address, "27", "1000");
        await this.gameday.fastForward(25);

        const userTokensBefore = await this.firmToken.balanceOf(userAddress);
        this.result = await this.firm.connect(user).claimWithdrawals(this.firmToken.address, [27, 52], EXTERNAL);
        this.deltaHooligans = (await this.firmToken.balanceOf(userAddress)).sub(userTokensBefore);
      });

      it("properly updates the total balances", async function () {
        expect(await this.firm.getTotalWithdrawn(this.firmToken.address)).to.eq("0");
        expect(this.deltaHooligans).to.equal("2000");
      });

      it("properly removes the withdrawal", async function () {
        expect(await this.firm.getWithdrawal(userAddress, this.firmToken.address, 27)).to.eq("0");
      });

      it("emits a claim ", async function () {
        await expect(this.result).to.emit(this.firm, "RemoveWithdrawals").withArgs(userAddress, this.firmToken.address, [27, 52], "2000");
      });
    });
  });

  describe("Curve BDV", async function () {
    before(async function () {
      this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
      await this.threePool.set_virtual_price(ethers.utils.parseEther("1"));
      this.hooliganThreeCurve = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
      await this.hooliganThreeCurve.set_supply(ethers.utils.parseEther("2000000"));
      await this.hooliganThreeCurve.set_A_precise("1000");
      await this.hooliganThreeCurve.set_virtual_price(ethers.utils.parseEther("1"));
      await this.hooliganThreeCurve.set_balances([ethers.utils.parseUnits("1000000", 6), ethers.utils.parseEther("1000000")]);
      await this.hooliganThreeCurve.set_balances([ethers.utils.parseUnits("1200000", 6), ethers.utils.parseEther("1000000")]);
    });

    it("properly checks bdv", async function () {
      this.curveBDV = await ethers.getContractAt("BDVFacet", this.diamond.address);
      expect(await this.curveBDV.curveToBDV(ethers.utils.parseEther("200"))).to.equal(ethers.utils.parseUnits("200", 6));
    });

    it("properly checks bdv", async function () {
      await this.threePool.set_virtual_price(ethers.utils.parseEther("1.02"));
      this.curveBDV = await ethers.getContractAt("BDVFacet", this.diamond.address);
      expect(await this.curveBDV.curveToBDV(ethers.utils.parseEther("2"))).to.equal("1998191");
    });
  });

  describe("Withdraw Unripe Hooligans", async function () {
    describe("Just legacy Hooligan Deposit", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).mockUnripeHooliganDeposit("2", to6("10"));
      });

      it("Check mock works", async function () {
        expect(await this.firm.getTotalDeposited(UNRIPE_HOOLIGAN)).to.eq(to6("10"));
        expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("10")));
        expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("10")));
      });

      it("get Deposit", async function () {
        const deposit = await this.firm.getDeposit(user.address, UNRIPE_HOOLIGAN, "2");
        expect(deposit[0]).to.equal(to6("10"));
        expect(deposit[1]).to.equal(prune(to6("10")));
      });

      it("revert if withdrawn too much", async function () {
        await expect(this.firm.connect(user).withdrawDeposit(UNRIPE_HOOLIGAN, "2", to6("11"))).to.be.revertedWith(
          "Firm: Crate balance too low."
        );
      });

      describe("Withdraw", async function () {
        beforeEach(async function () {
          this.result = await this.firm.connect(user).withdrawDeposit(UNRIPE_HOOLIGAN, "2", to6("1"));
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(UNRIPE_HOOLIGAN)).to.eq(to6("9"));
          expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("9")));
          expect(await this.firm.getTotalWithdrawn(UNRIPE_HOOLIGAN)).to.eq(to6("1"));
        });
        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(pruneToProspects(to6("9")));
        });
        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, UNRIPE_HOOLIGAN, 2);
          expect(dep[0]).to.equal(to6("9"));
          expect(dep[1]).to.equal(prune(to6("9")));
        });
        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_HOOLIGAN, 2, to6("1"));
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, UNRIPE_HOOLIGAN, 27, to6("1"));
        });
      });
    });
    describe("Legacy and new Hooligan Deposit", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(UNRIPE_HOOLIGAN, to6("10"), EXTERNAL);
        await this.firm.connect(user).mockUnripeHooliganDeposit("2", to6("10"));
      });

      it("Check mock works", async function () {
        expect(await this.firm.getTotalDeposited(UNRIPE_HOOLIGAN)).to.eq(to6("20"));
        expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("10")).add(pruneToHorde(to6("10"))));
        expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("10")).add(pruneToProspects(to6("10"))));
      });

      it("get Deposit", async function () {
        const deposit = await this.firm.getDeposit(user.address, UNRIPE_HOOLIGAN, "2");
        expect(deposit[0]).to.equal(to6("20"));
        expect(deposit[1]).to.equal(prune(to6("10")).add(prune(to6("10"))));
      });

      it("revert if withdrawn too much", async function () {
        await expect(this.firm.connect(user).withdrawDeposit(UNRIPE_HOOLIGAN, "2", to6("21"))).to.be.revertedWith(
          "Firm: Crate balance too low."
        );
      });

      describe("Withdraw", async function () {
        beforeEach(async function () {
          this.result = await this.firm.connect(user).withdrawDeposit(UNRIPE_HOOLIGAN, "2", to6("11"));
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(UNRIPE_HOOLIGAN)).to.eq(to6("9"));
          expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("9")));
          expect(await this.firm.getTotalWithdrawn(UNRIPE_HOOLIGAN)).to.eq(to6("11"));
        });
        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(pruneToProspects(to6("9")));
        });
        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, UNRIPE_HOOLIGAN, 2);
          expect(dep[0]).to.equal(to6("9"));
          expect(dep[1]).to.equal(prune(to6("9")));
        });
        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_HOOLIGAN, 2, to6("11"));
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, UNRIPE_HOOLIGAN, 27, to6("11"));
        });
      });
    });
  });

  describe("Withdraw Unripe LP from BDV", async function () {
    describe("Just legacy LP Deposit BDV", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).mockUnripeLPDeposit("0", "2", to18("0.000000083406453"), to6("10"));
      });

      it("Check mock works", async function () {
        expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("10"));
        expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("10")));
        expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("10"), 4));
      });

      it("get Deposit", async function () {
        const deposit = await this.firm.getDeposit(user.address, UNRIPE_LP, "2");
        expect(deposit[0]).to.equal(to6("10"));
        expect(deposit[1]).to.equal(prune(to6("10")));
      });

      it("revert if withdrawn too much", async function () {
        await expect(this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("11"))).to.be.revertedWith("Firm: Crate balance too low.");
      });

      describe("Withdraw", async function () {
        beforeEach(async function () {
          this.result = await this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("1"));
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("9"));
          expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("9"), 4));
          expect(await this.firm.getTotalWithdrawn(UNRIPE_LP)).to.eq(to6("1"));
        });

        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(pruneToProspects(to6("9"), 4));
        });

        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, UNRIPE_LP, 2);
          expect(dep[0]).to.equal(to6("9"));
          expect(dep[1]).to.equal(prune(to6("9")));
        });

        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_LP, 2, to6("1"));
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, UNRIPE_LP, 27, to6("1"));
        });
      });
    });

    describe("Just 3CRV LP Deposit", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).mockUnripeLPDeposit("1", "2", to18("10.08028951"), to6("10"));
      });

      it("Check mock works", async function () {
        expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("10"));
        expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("10")));
        expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("10"), 4));
      });

      it("get Deposit", async function () {
        const deposit = await this.firm.getDeposit(user.address, UNRIPE_LP, "2");
        expect(deposit[0]).to.equal(to6("10"));
        expect(deposit[1]).to.equal(prune(to6("10")));
      });

      it("revert if withdrawn too much", async function () {
        await expect(this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("11"))).to.be.revertedWith("Firm: Crate balance too low.");
      });

      describe("Withdraw", async function () {
        beforeEach(async function () {
          this.result = await this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("1"));
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("9"));
          expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("9"), 4));
          expect(await this.firm.getTotalWithdrawn(UNRIPE_LP)).to.eq(to6("1"));
        });

        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(pruneToProspects(to6("9"), 4));
        });

        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, UNRIPE_LP, 2);
          expect(dep[0]).to.equal(to6("9"));
          expect(dep[1]).to.equal(prune(to6("9")));
        });

        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_LP, 2, to6("1"));
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, UNRIPE_LP, 27, to6("1"));
        });
      });
    });

    describe("Just HOOLIGAN:LUSD LP Deposit", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).mockUnripeLPDeposit("2", "2", to18("10.17182243"), to6("10"));
      });

      it("Check mock works", async function () {
        expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("10"));
        expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("10")));
        expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("10"), 4));
      });

      it("get Deposit", async function () {
        const deposit = await this.firm.getDeposit(user.address, UNRIPE_LP, "2");
        expect(deposit[0]).to.equal(to6("10"));
        expect(deposit[1]).to.equal(prune(to6("10")));
      });

      it("revert if withdrawn too much", async function () {
        await expect(this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("11"))).to.be.revertedWith("Firm: Crate balance too low.");
      });

      describe("Withdraw", async function () {
        beforeEach(async function () {
          this.result = await this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("1"));
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("9"));
          expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("9"), 4));
          expect(await this.firm.getTotalWithdrawn(UNRIPE_LP)).to.eq(to6("1"));
        });

        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(pruneToHorde(to6("9")));
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(pruneToProspects(to6("9"), 4));
        });

        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, UNRIPE_LP, 2);
          expect(dep[0]).to.equal(to6("9"));
          expect(dep[1]).to.equal(prune(to6("9")));
        });

        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_LP, 2, to6("1"));
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, UNRIPE_LP, 27, to6("1"));
        });
      });
    });

    describe("All 4 LP Deposit", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).mockUnripeLPDeposit("0", "2", to18("0.000000020851613"), to6("2.5"));
        await this.firm.connect(user).mockUnripeLPDeposit("1", "2", to18("2.5200723775"), to6("2.5"));
        await this.firm.connect(user).mockUnripeLPDeposit("2", "2", to18("2.5429556075"), to6("2.5"));
        await this.firm.connect(user).deposit(UNRIPE_LP, to6("2.5"), EXTERNAL);
      });

      it("Check mock works", async function () {
        expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("10"));
        expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("2.5")).mul(toBN("4")).sub(toBN("10000")));
        expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("2.5"), 4).mul(toBN("4")).sub(toBN("4")));
      });

      it("get Deposit", async function () {
        const deposit = await this.firm.getDeposit(user.address, UNRIPE_LP, "2");
        expect(deposit[0]).to.equal(to6("10"));
        expect(deposit[1]).to.equal(
          prune(to6("7.5"))
            .add(prune(to6("2.5")))
            .sub(toBN("1"))
        );
      });

      it("revert if withdrawn too much", async function () {
        await expect(this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("11"))).to.be.revertedWith("Firm: Crate balance too low.");
      });

      describe("Withdraw", async function () {
        beforeEach(async function () {
          this.bdvBefore = (await this.firm.getDeposit(user.address, UNRIPE_LP, "2"))[1];
          this.result = await this.firm.connect(user).withdrawDeposit(UNRIPE_LP, "2", to6("9"));
        });

        it("properly updates the total balances", async function () {
          expect(await this.firm.getTotalDeposited(UNRIPE_LP)).to.eq(to6("1"));
          expect(await this.firm.totalHorde()).to.eq(pruneToHorde(to6("1")).sub(toBN("10000")));
          expect(await this.firm.totalProspects()).to.eq(pruneToProspects(to6("1"), 4).sub(toBN("4")));
          expect(await this.firm.getTotalWithdrawn(UNRIPE_LP)).to.eq(to6("9"));
        });

        it("properly updates the user balance", async function () {
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(pruneToHorde(to6("1")).sub(toBN("10000")));
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(pruneToProspects(to6("1"), 4).sub(toBN("4")));
        });

        it("properly removes the crate", async function () {
          let dep = await this.firm.getDeposit(userAddress, UNRIPE_LP, 2);
          bdvAfter = this.bdvBefore.sub(this.bdvBefore.mul("9").div("10"));
          expect(dep[0]).to.equal(to6("1"));
          expect(dep[1]).to.equal(this.bdvBefore.sub(this.bdvBefore.mul("9").div("10")));
        });

        it("emits Remove and Withdrawal event", async function () {
          await expect(this.result).to.emit(this.firm, "RemoveDeposit").withArgs(userAddress, UNRIPE_LP, 2, to6("9"));
          await expect(this.result).to.emit(this.firm, "AddWithdrawal").withArgs(userAddress, UNRIPE_LP, 27, to6("9"));
        });
      });
    });
  });

  describe("Transfer", async function () {
    describe("reverts", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.gameday.firmActuation("0");
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
      });

      it("reverts if the amounts array is empty", async function () {
        await expect(this.firm.connect(user).transferDeposits(userAddress, user2Address, this.firmToken.address, [], [])).to.revertedWith(
          "Firm: amounts array is empty"
        );
      });

      it("reverts if the amount in array is 0", async function () {
        await expect(
          this.firm.connect(user).transferDeposits(userAddress, user2Address, this.firmToken.address, ["2", "3"], ["100", "0"])
        ).to.revertedWith("Firm: amount in array is 0");
      });
    });
    describe("Single", async function () {
      it("returns the correct value", async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        this.result = await this.firm
          .connect(user)
          .callStatic.transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "50");
        expect(this.result).to.be.equal("50");
      });

      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        this.result = await this.firm.connect(user).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "50");
      });

      it("removes the deposit from the sender", async function () {
        const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(userAddress)).to.be.equal("500000");
        expect(await this.firm.balanceOfProspects(userAddress)).to.be.equal("50");
      });

      it("add the deposit to the recipient", async function () {
        const deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(user2Address)).to.be.equal("500000");
        expect(await this.firm.balanceOfProspects(user2Address)).to.be.equal("50");
      });

      it("updates total horde and prospects", async function () {
        expect(await this.firm.totalHorde()).to.be.equal("1000000");
        expect(await this.firm.totalProspects()).to.be.equal("100");
      });
    });

    describe("Single all", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.firm.connect(user).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "100");
      });

      it("removes the deposit from the sender", async function () {
        const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("0");
        expect(deposit[0]).to.equal("0");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(userAddress)).to.be.equal("0");
        expect(await this.firm.balanceOfProspects(userAddress)).to.be.equal("0");
      });

      it("add the deposit to the recipient", async function () {
        const deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("100");
        expect(deposit[0]).to.equal("100");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(user2Address)).to.be.equal("1000000");
        expect(await this.firm.balanceOfProspects(user2Address)).to.be.equal("100");
      });

      it("updates total horde and prospects", async function () {
        expect(await this.firm.totalHorde()).to.be.equal("1000000");
        expect(await this.firm.totalProspects()).to.be.equal("100");
      });
    });

    describe("Multiple", async function () {
      it("returns the correct value", async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.gameday.firmActuation("0");
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        this.result = await this.firm
          .connect(user)
          .callStatic.transferDeposits(userAddress, user2Address, this.firmToken.address, ["2", "3"], ["50", "25"]);
      });

      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.gameday.firmActuation("0");
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        this.result = await this.firm
          .connect(user)
          .transferDeposits(userAddress, user2Address, this.firmToken.address, ["2", "3"], ["50", "25"]);
      });

      it("removes the deposit from the sender", async function () {
        let deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
        deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "3");
        expect(deposit[0]).to.equal("75");
        expect(deposit[0]).to.equal("75");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(userAddress)).to.be.equal("1250050");
        expect(await this.firm.balanceOfProspects(userAddress)).to.be.equal("125");
      });

      it("add the deposit to the recipient", async function () {
        let deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
        deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "3");
        expect(deposit[0]).to.equal("25");
        expect(deposit[0]).to.equal("25");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(user2Address)).to.be.equal("750050");
        expect(await this.firm.balanceOfProspects(user2Address)).to.be.equal("75");
      });

      it("updates total horde and prospects", async function () {
        expect(await this.firm.totalHorde()).to.be.equal("2000100");
        expect(await this.firm.totalProspects()).to.be.equal("200");
      });
    });

    describe("Single with allowance", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.firm.connect(user).approveDeposit(ownerAddress, this.firmToken.address, "100");
        await this.firm.connect(owner).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "50");
      });

      it("removes the deposit from the sender", async function () {
        const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(userAddress)).to.be.equal("500000");
        expect(await this.firm.balanceOfProspects(userAddress)).to.be.equal("50");
      });

      it("add the deposit to the recipient", async function () {
        const deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(user2Address)).to.be.equal("500000");
        expect(await this.firm.balanceOfProspects(user2Address)).to.be.equal("50");
      });

      it("updates total horde and prospects", async function () {
        expect(await this.firm.totalHorde()).to.be.equal("1000000");
        expect(await this.firm.totalProspects()).to.be.equal("100");
      });

      it("properly updates users token allowance", async function () {
        expect(await this.firm.depositAllowance(userAddress, ownerAddress, this.firmToken.address)).to.be.equal("50");
      });
    });

    describe("Single with no allowance", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
      });

      it("reverts with no allowance", async function () {
        await expect(
          this.firm.connect(owner).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "50")
        ).to.revertedWith("Firm: insufficient allowance");
      });
    });

    describe("Single all with allowance", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.firm.connect(user).approveDeposit(ownerAddress, this.firmToken.address, "100");
        await this.firm.connect(owner).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "100");
      });

      it("removes the deposit from the sender", async function () {
        const deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("0");
        expect(deposit[0]).to.equal("0");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(userAddress)).to.be.equal("0");
        expect(await this.firm.balanceOfProspects(userAddress)).to.be.equal("0");
      });

      it("add the deposit to the recipient", async function () {
        const deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("100");
        expect(deposit[0]).to.equal("100");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(user2Address)).to.be.equal("1000000");
        expect(await this.firm.balanceOfProspects(user2Address)).to.be.equal("100");
      });

      it("updates total horde and prospects", async function () {
        expect(await this.firm.totalHorde()).to.be.equal("1000000");
        expect(await this.firm.totalProspects()).to.be.equal("100");
      });

      it("properly updates users token allowance", async function () {
        expect(await this.firm.depositAllowance(userAddress, ownerAddress, this.firmToken.address)).to.be.equal("0");
      });
    });

    describe("Multiple with allowance", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.gameday.firmActuation("0");
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.firm.connect(user).approveDeposit(ownerAddress, this.firmToken.address, "200");
        await this.firm.connect(owner).transferDeposits(userAddress, user2Address, this.firmToken.address, ["2", "3"], ["50", "25"]);
      });

      it("removes the deposit from the sender", async function () {
        let deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
        deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "3");
        expect(deposit[0]).to.equal("75");
        expect(deposit[0]).to.equal("75");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(userAddress)).to.be.equal("1250050");
        expect(await this.firm.balanceOfProspects(userAddress)).to.be.equal("125");
      });

      it("add the deposit to the recipient", async function () {
        let deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
        expect(deposit[0]).to.equal("50");
        expect(deposit[0]).to.equal("50");
        deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "3");
        expect(deposit[0]).to.equal("25");
        expect(deposit[0]).to.equal("25");
      });

      it("updates users horde and prospects", async function () {
        expect(await this.firm.balanceOfHorde(user2Address)).to.be.equal("750050");
        expect(await this.firm.balanceOfProspects(user2Address)).to.be.equal("75");
      });

      it("updates total horde and prospects", async function () {
        expect(await this.firm.totalHorde()).to.be.equal("2000100");
        expect(await this.firm.totalProspects()).to.be.equal("200");
      });

      it("properly updates users token allowance", async function () {
        expect(await this.firm.depositAllowance(userAddress, ownerAddress, this.firmToken.address)).to.be.equal("125");
      });
    });

    describe("Multiple with no allowance", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
        await this.gameday.firmActuation("0");
        await this.firm.connect(user).deposit(this.firmToken.address, "100", EXTERNAL);
      });

      it("reverts with no allowance", async function () {
        await expect(
          this.firm.connect(owner).transferDeposits(userAddress, user2Address, this.firmToken.address, ["2", "3"], ["50", "25"])
        ).to.revertedWith("Firm: insufficient allowance");
      });
    });
  });

  describe("Deposit Approval", async function () {
    describe("approve allowance", async function () {
      beforeEach(async function () {
        this.result = await this.firm.connect(user).approveDeposit(user2Address, this.firmToken.address, "100");
      });

      it("properly updates users token allowance", async function () {
        expect(await this.firm.depositAllowance(userAddress, user2Address, this.firmToken.address)).to.be.equal("100");
      });

      it("emits DepositApproval event", async function () {
        await expect(this.result).to.emit(this.firm, "DepositApproval").withArgs(userAddress, user2Address, this.firmToken.address, "100");
      });
    });

    describe("increase and decrease allowance", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).approveDeposit(user2Address, this.firmToken.address, "100");
      });

      it("properly increase users token allowance", async function () {
        await this.firm.connect(user).increaseDepositAllowance(user2Address, this.firmToken.address, "100");
        expect(await this.firm.depositAllowance(userAddress, user2Address, this.firmToken.address)).to.be.equal("200");
      });

      it("properly decrease users token allowance", async function () {
        await this.firm.connect(user).decreaseDepositAllowance(user2Address, this.firmToken.address, "25");
        expect(await this.firm.depositAllowance(userAddress, user2Address, this.firmToken.address)).to.be.equal("75");
      });

      it("decrease users token allowance below zero", async function () {
        await expect(this.firm.connect(user).decreaseDepositAllowance(user2Address, this.firmToken.address, "101")).to.revertedWith(
          "Firm: decreased allowance below zero"
        );
      });

      it("emits DepositApproval event on increase", async function () {
        const result = await this.firm.connect(user).increaseDepositAllowance(user2Address, this.firmToken.address, "25");
        await expect(result).to.emit(this.firm, "DepositApproval").withArgs(userAddress, user2Address, this.firmToken.address, "125");
      });

      it("emits DepositApproval event on decrease", async function () {
        const result = await this.firm.connect(user).decreaseDepositAllowance(user2Address, this.firmToken.address, "25");
        await expect(result).to.emit(this.firm, "DepositApproval").withArgs(userAddress, user2Address, this.firmToken.address, "75");
      });
    });

    describe("Approve Deposit Permit", async function () {
      describe("reverts", function () {
        it("reverts if depositPermitDomainSeparator is invalid", async function () {
          expect(await this.firm.connect(user).depositPermitDomainSeparator()).to.be.equal(
            "0xf47372c4b0d604ded919ee3604a1b1e88c7cd7d7d2fcfffc36f016e19bede4ef"
          );
        });
      });

      describe("single token permit", async function () {
        describe("reverts", function () {
          it("reverts if permit expired", async function () {
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokenPermit(
              user,
              userAddress,
              user2Address,
              this.firmToken.address,
              "1000",
              nonce,
              1000
            );
            await expect(
              this.firm
                .connect(user)
                .permitDeposit(
                  signature.owner,
                  signature.spender,
                  signature.token,
                  signature.value,
                  signature.deadline,
                  signature.split.v,
                  signature.split.r,
                  signature.split.s
                )
            ).to.be.revertedWith("Firm: permit expired deadline");
          });

          it("reverts if permit invalid signature", async function () {
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokenPermit(user, userAddress, user2Address, this.firmToken.address, "1000", nonce);
            await expect(
              this.firm
                .connect(user)
                .permitDeposit(
                  user2Address,
                  signature.spender,
                  signature.token,
                  signature.value,
                  signature.deadline,
                  signature.split.v,
                  signature.split.r,
                  signature.split.s
                )
            ).to.be.revertedWith("Firm: permit invalid signature");
          });

          it("reverts when transfer too much", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokenPermit(user, userAddress, user2Address, this.firmToken.address, "500", nonce);
            await this.firm
              .connect(user2)
              .permitDeposit(
                signature.owner,
                signature.spender,
                signature.token,
                signature.value,
                signature.deadline,
                signature.split.v,
                signature.split.r,
                signature.split.s
              );

            await expect(
              this.firm.connect(user2).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "1000")
            ).to.be.revertedWith("Firm: insufficient allowance");

            await expect(
              this.firm.connect(user2).transferDeposits(userAddress, user2Address, this.firmToken.address, ["2"], ["1000"])
            ).to.be.revertedWith("Firm: insufficient allowance");
          });
        });

        describe("approve permit", async function () {
          beforeEach(async function () {
            // Create permit
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokenPermit(user, userAddress, user2Address, this.firmToken.address, "1000", nonce);
            this.result = await this.firm
              .connect(user)
              .permitDeposit(
                signature.owner,
                signature.spender,
                signature.token,
                signature.value,
                signature.deadline,
                signature.split.v,
                signature.split.r,
                signature.split.s
              );
          });

          it("allow transfer all deposit", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            await this.firm.connect(user2).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "1000");

            const user1Deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
            expect(user1Deposit[0]).to.equal("0");
            expect(user1Deposit[1]).to.equal("0");

            const user2Deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
            expect(user2Deposit[0]).to.equal("1000");
            expect(user2Deposit[1]).to.equal("1000");
          });

          it("allow transfer all deposits", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            await this.firm.connect(user2).transferDeposits(userAddress, user2Address, this.firmToken.address, ["2"], ["1000"]);

            const user1Deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
            expect(user1Deposit[0]).to.equal("0");
            expect(user1Deposit[1]).to.equal("0");

            const user2Deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
            expect(user2Deposit[0]).to.equal("1000");
            expect(user2Deposit[1]).to.equal("1000");
          });

          it("allow transfer some deposit", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            await this.firm.connect(user2).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "400");

            const user1Deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
            expect(user1Deposit[0]).to.equal("600");
            expect(user1Deposit[1]).to.equal("600");

            const user2Deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
            expect(user2Deposit[0]).to.equal("400");
            expect(user2Deposit[1]).to.equal("400");
          });

          it("properly updates user permit nonce", async function () {
            expect(await this.firm.depositPermitNonces(userAddress)).to.be.equal("1");
          });

          it("properly updates user token allowance", async function () {
            expect(await this.firm.depositAllowance(userAddress, user2Address, this.firmToken.address)).to.be.equal("1000");
          });

          it("emits DepositApproval event", async function () {
            await expect(this.result)
              .to.emit(this.firm, "DepositApproval")
              .withArgs(userAddress, user2Address, this.firmToken.address, "1000");
          });
        });
      });

      describe("multiple tokens permit", async function () {
        describe("reverts", function () {
          it("reverts if permit expired", async function () {
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokensPermit(
              user,
              userAddress,
              user2Address,
              [this.firmToken.address],
              ["1000"],
              nonce,
              1000
            );
            await expect(
              this.firm
                .connect(user)
                .permitDeposits(
                  signature.owner,
                  signature.spender,
                  signature.tokens,
                  signature.values,
                  signature.deadline,
                  signature.split.v,
                  signature.split.r,
                  signature.split.s
                )
            ).to.be.revertedWith("Firm: permit expired deadline");
          });

          it("reverts if permit invalid signature", async function () {
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokensPermit(user, userAddress, user2Address, [this.firmToken.address], ["1000"], nonce);
            await expect(
              this.firm
                .connect(user)
                .permitDeposits(
                  user2Address,
                  signature.spender,
                  signature.tokens,
                  signature.values,
                  signature.deadline,
                  signature.split.v,
                  signature.split.r,
                  signature.split.s
                )
            ).to.be.revertedWith("Firm: permit invalid signature");
          });

          it("reverts when transfer too much", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokensPermit(user, userAddress, user2Address, [this.firmToken.address], ["500"], nonce);
            await this.firm
              .connect(user2)
              .permitDeposits(
                signature.owner,
                signature.spender,
                signature.tokens,
                signature.values,
                signature.deadline,
                signature.split.v,
                signature.split.r,
                signature.split.s
              );

            await expect(
              this.firm.connect(user2).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "1000")
            ).to.be.revertedWith("Firm: insufficient allowance");

            await expect(
              this.firm.connect(user2).transferDeposits(userAddress, user2Address, this.firmToken.address, ["2"], ["1000"])
            ).to.be.revertedWith("Firm: insufficient allowance");
          });
        });

        describe("approve permit", async function () {
          beforeEach(async function () {
            // Create permit
            const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
            const signature = await signFirmDepositTokensPermit(user, userAddress, user2Address, [this.firmToken.address], ["1000"], nonce);
            this.result = await this.firm
              .connect(user)
              .permitDeposits(
                signature.owner,
                signature.spender,
                signature.tokens,
                signature.values,
                signature.deadline,
                signature.split.v,
                signature.split.r,
                signature.split.s
              );
          });

          it("allow transfer all deposit", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            await this.firm.connect(user2).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "1000");

            const user1Deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
            expect(user1Deposit[0]).to.equal("0");
            expect(user1Deposit[1]).to.equal("0");

            const user2Deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
            expect(user2Deposit[0]).to.equal("1000");
            expect(user2Deposit[1]).to.equal("1000");
          });

          it("allow transfer all deposits", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            await this.firm.connect(user2).transferDeposits(userAddress, user2Address, this.firmToken.address, ["2"], ["1000"]);

            const user1Deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
            expect(user1Deposit[0]).to.equal("0");
            expect(user1Deposit[1]).to.equal("0");

            const user2Deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
            expect(user2Deposit[0]).to.equal("1000");
            expect(user2Deposit[1]).to.equal("1000");
          });

          it("allow transfer some deposit", async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            await this.firm.connect(user2).transferDeposit(userAddress, user2Address, this.firmToken.address, "2", "400");

            const user1Deposit = await this.firm.getDeposit(userAddress, this.firmToken.address, "2");
            expect(user1Deposit[0]).to.equal("600");
            expect(user1Deposit[1]).to.equal("600");

            const user2Deposit = await this.firm.getDeposit(user2Address, this.firmToken.address, "2");
            expect(user2Deposit[0]).to.equal("400");
            expect(user2Deposit[1]).to.equal("400");
          });

          it("properly updates user permit nonce", async function () {
            expect(await this.firm.depositPermitNonces(userAddress)).to.be.equal("1");
          });

          it("properly updates user token allowance", async function () {
            expect(await this.firm.depositAllowance(userAddress, user2Address, this.firmToken.address)).to.be.equal("1000");
          });

          it("emits DepositApproval event", async function () {
            await expect(this.result)
              .to.emit(this.firm, "DepositApproval")
              .withArgs(userAddress, user2Address, this.firmToken.address, "1000");
          });
        });
      });
    });
  });
});
