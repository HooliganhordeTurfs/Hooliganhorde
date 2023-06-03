const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { HOOLIGAN, THREE_CURVE, THREE_POOL, HOOLIGAN_3_CURVE, UNRIPE_HOOLIGAN, UNRIPE_LP } = require("./utils/constants");
const { ConvertEncoder } = require("./utils/encoder.js");
const { to6, to18, toHooligan, toHorde } = require("./utils/helpers.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
const ZERO_BYTES = ethers.utils.formatBytes32String("0x0");
let user, user2, owner;
let userAddress, ownerAddress, user2Address;

describe("Unripe Convert", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", this.diamond.address);
    this.firm = await ethers.getContractAt("FirmFacet", this.diamond.address);
    this.convert = await ethers.getContractAt("ConvertFacet", this.diamond.address);
    this.hooligan = await ethers.getContractAt("MockToken", HOOLIGAN);
    this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
    this.threeCurve = await ethers.getContractAt("MockToken", THREE_CURVE);
    this.hooliganMetapool = await ethers.getContractAt("IMockCurvePool", HOOLIGAN_3_CURVE);

    await this.threeCurve.mint(userAddress, to18("100000"));
    await this.threePool.set_virtual_price(to18("1"));
    await this.threeCurve.connect(user).approve(this.hooliganMetapool.address, to18("100000000000"));

    await this.hooliganMetapool.connect(user).approve(this.threeCurve.address, to18("100000000000"));
    await this.hooliganMetapool.connect(user).approve(this.firm.address, to18("100000000000"));

    await this.gameday.firmActuation(0);
    await this.hooligan.mint(userAddress, toHooligan("1000000000"));
    await this.hooligan.mint(user2Address, toHooligan("1000000000"));
    await this.hooligan.connect(user).approve(this.hooliganMetapool.address, to18("100000000000"));
    await this.hooligan.connect(user2).approve(this.hooliganMetapool.address, to18("100000000000"));
    await this.hooligan.connect(user).approve(this.firm.address, "100000000000");
    await this.hooligan.connect(user2).approve(this.firm.address, "100000000000");
    await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("1000"), to18("1000")], to18("2000"));
    await this.hooliganMetapool.connect(user).transfer(ownerAddress, to18("1000"));

    this.unripe = await ethers.getContractAt("MockUnripeFacet", this.diamond.address);
    this.unripeHooligan = await ethers.getContractAt("MockToken", UNRIPE_HOOLIGAN);
    this.unripeLP = await ethers.getContractAt("MockToken", UNRIPE_LP);
    this.percoceter = await ethers.getContractAt("MockPercoceterFacet", this.diamond.address);
    await this.unripeHooligan.mint(userAddress, to6("10000"));
    await this.unripeLP.mint(userAddress, to6("9422.960000"));
    await this.unripeHooligan.connect(user).approve(this.diamond.address, to18("100000000"));
    await this.unripeLP.connect(user).approve(this.diamond.address, to18("100000000"));
    await this.percoceter.setPercoceterE(true, to6("10000"));
    await this.unripe.addUnripeToken(UNRIPE_HOOLIGAN, HOOLIGAN, ZERO_BYTES);
    await this.unripe.addUnripeToken(UNRIPE_LP, HOOLIGAN_3_CURVE, ZERO_BYTES);
    await this.hooligan.mint(ownerAddress, to6("5000"));
    await this.hooligan.approve(this.diamond.address, to6("5000"));
    await this.hooliganMetapool.approve(this.diamond.address, to18("10000"));
    await this.percoceter.setPenaltyParams(to6("500"), "0");
    await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("1000"));
    await this.unripe.connect(owner).addUnderlying(UNRIPE_LP, to18("942.2960000"));
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("calclates hooligans to peg", async function () {
    it("p > 1", async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      expect(await this.convert.getMaxAmountIn(UNRIPE_HOOLIGAN, UNRIPE_LP)).to.be.equal(to6("2000"));
    });

    it("p = 1", async function () {
      expect(await this.convert.getMaxAmountIn(UNRIPE_HOOLIGAN, UNRIPE_LP)).to.be.equal("0");
    });

    it("p < 1", async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
      expect(await this.convert.getMaxAmountIn(UNRIPE_HOOLIGAN, UNRIPE_LP)).to.be.equal("0");
    });
  });

  describe("calclates lp to peg", async function () {
    it("p > 1", async function () {
      await this.hooliganMetapool.connect(user2).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
      expect(await this.convert.getMaxAmountIn(UNRIPE_LP, UNRIPE_HOOLIGAN)).to.be.within(to6("1990"), to6("2000"));
    });

    it("p = 1", async function () {
      expect(await this.convert.getMaxAmountIn(UNRIPE_LP, UNRIPE_HOOLIGAN)).to.be.equal("0");
    });

    it("p < 1", async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      expect(await this.convert.getMaxAmountIn(UNRIPE_LP, UNRIPE_HOOLIGAN)).to.be.equal("0");
    });
  });

  describe("convert hooligans to lp", async function () {
    describe("revert", async function () {
      it("not enough LP", async function () {
        await this.firm.connect(user).deposit(this.unripeHooligan.address, to6("200"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("20")], to18("15"));
        await expect(
          this.convert.connect(user).convert(ConvertEncoder.convertUnripeHooligansToLP(to6("200"), to6("200.1")), ["2"], [to6("200")])
        ).to.be.revertedWith("Curve: Not enough LP");
      });

      it("p >= 1", async function () {
        await this.firm.connect(user).deposit(this.unripeHooligan.address, to6("200"), EXTERNAL);
        await expect(
          this.convert.connect(user).convert(ConvertEncoder.convertUnripeHooligansToLP(to6("200"), to6("190")), ["1"], ["1000"])
        ).to.be.revertedWith("Convert: P must be >= 1.");
      });
    });

    describe("basic", function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.unripeHooligan.address, to6("2000"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
        this.result = await this.convert
          .connect(user)
          .convert(ConvertEncoder.convertUnripeHooligansToLP(to6("1000"), to6("1000")), ["2"], [to6("2000")]);
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to6("1000"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq("1006344767");
        expect(await this.firm.totalProspects()).to.eq(toHooligan("600"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("200"));
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("600"));
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("200"));
      });

      it("properly updates user deposits", async function () {
        expect((await this.firm.getDeposit(userAddress, this.unripeHooligan.address, 2))[0]).to.eq(to6("1000"));
        const deposit = await this.firm.getDeposit(userAddress, this.unripeLP.address, 2);
        expect(deposit[0]).to.eq("1006344767");
        expect(deposit[1]).to.eq(toHooligan("100"));
      });

      it("emits events", async function () {
        await expect(this.result)
          .to.emit(this.firm, "RemoveDeposits")
          .withArgs(userAddress, this.unripeHooligan.address, [2], [to6("1000")], to6("1000"));
        await expect(this.result)
          .to.emit(this.firm, "AddDeposit")
          .withArgs(userAddress, this.unripeLP.address, 2, "1006344767", toHooligan("100"));
      });
    });

    describe("multiple crates", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.unripeHooligan.address, to6("1000"), EXTERNAL);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.firm.connect(user).deposit(this.unripeHooligan.address, to6("1000"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
        this.result = await this.convert
          .connect(user)
          .convert(ConvertEncoder.convertUnripeHooligansToLP(to6("2500"), to6("1900")), ["2", "6"], [to6("1000"), to6("1000")]);
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to18("0"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq("2008324306");
        expect(await this.firm.totalProspects()).to.eq(toHooligan("800"));
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("200.08"));
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("800"));
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("200.08"));
      });

      it("properly updates user deposits", async function () {
        expect((await this.firm.getDeposit(userAddress, this.unripeHooligan.address, 2))[0]).to.eq(toHooligan("0"));
        expect((await this.firm.getDeposit(userAddress, this.unripeHooligan.address, 6))[0]).to.eq(toHooligan("0"));
        const deposit = await this.firm.getDeposit(userAddress, this.unripeLP.address, 5);
        expect(deposit[0]).to.eq("2008324306");
        expect(deposit[1]).to.eq(toHooligan("200"));
      });

      it("emits events", async function () {
        await expect(this.result)
          .to.emit(this.firm, "RemoveDeposits")
          .withArgs(userAddress, this.unripeHooligan.address, [2, 6], [to6("1000"), to6("1000")], to6("2000"));
        await expect(this.result)
          .to.emit(this.firm, "AddDeposit")
          .withArgs(userAddress, this.unripeLP.address, 5, "2008324306", toHooligan("200"));
      });
    });

    describe("hooligan more vested", async function () {
      beforeEach(async function () {
        await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("1000"));
        await this.firm.connect(user).deposit(this.unripeHooligan.address, to6("2000"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
        this.result = await this.convert
          .connect(user)
          .convert(ConvertEncoder.convertUnripeHooligansToLP(to6("500"), to6("500")), ["2"], [to6("500")]);
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to6("1500"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq("503172383");
        expect(await this.firm.totalProspects()).to.eq(toHooligan("1000"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("400"));
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("1000"));
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("400"));
      });

      it("properly updates user deposits", async function () {
        expect((await this.firm.getDeposit(userAddress, this.unripeHooligan.address, 2))[0]).to.eq(to6("1500"));
        const deposit = await this.firm.getDeposit(userAddress, this.unripeLP.address, 2);
        expect(deposit[0]).to.eq("503172383");
        expect(deposit[1]).to.eq(toHooligan("100"));
      });

      it("emits events", async function () {
        await expect(this.result)
          .to.emit(this.firm, "RemoveDeposits")
          .withArgs(userAddress, this.unripeHooligan.address, [2], [to6("500")], to6("500"));
        await expect(this.result)
          .to.emit(this.firm, "AddDeposit")
          .withArgs(userAddress, this.unripeLP.address, 2, "503172383", toHooligan("100"));
      });
    });

    describe("lp more vested", async function () {
      beforeEach(async function () {
        await this.unripe.connect(user).addUnderlyingWithRecap(UNRIPE_LP, to18("942.2960000"));
        await this.firm.connect(user).deposit(this.unripeHooligan.address, to6("2000"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
        this.result = await this.convert
          .connect(user)
          .convert(ConvertEncoder.convertUnripeHooligansToLP(to6("500"), to6("500")), ["2"], [to6("500")]);
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to6("1500"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq("503761210");
        expect(await this.firm.totalProspects()).to.eq("689368856");
        expect(await this.firm.totalHorde()).to.eq("2473422140000");
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq("689368856");
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq("2473422140000");
      });

      it("properly updates user deposits", async function () {
        expect((await this.firm.getDeposit(userAddress, this.unripeHooligan.address, 2))[0]).to.eq(to6("1500"));
        const deposit = await this.firm.getDeposit(userAddress, this.unripeLP.address, 2);
        expect(deposit[0]).to.eq("503761210");
        expect(deposit[1]).to.eq("97342214");
      });

      it("emits events", async function () {
        await expect(this.result)
          .to.emit(this.firm, "RemoveDeposits")
          .withArgs(userAddress, this.unripeHooligan.address, [2], [to6("500")], to6("500"));
        await expect(this.result).to.emit(this.firm, "AddDeposit").withArgs(userAddress, this.unripeLP.address, 2, "503761210", "97342214");
      });
    });
  });

  describe("convert lp to hooligans", async function () {
    describe("revert", async function () {
      it("not enough Hooligans", async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.unripeLP.address, to6("1000"), EXTERNAL);
        await expect(
          this.convert.connect(user).convert(ConvertEncoder.convertUnripeLPToHooligans(to6("2000"), to6("2500")), ["2"], [to6("2000")])
        ).to.be.revertedWith("Curve: Insufficient Output");
      });

      it("p >= 1", async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("1")], to18("0.5"));
        await this.firm.connect(user).deposit(this.unripeLP.address, to6("1000"), EXTERNAL);
        await expect(
          this.convert.connect(user).convert(ConvertEncoder.convertUnripeLPToHooligans(to6("2000"), to6("2500")), ["2"], [to6("2000")])
        ).to.be.revertedWith("Convert: P must be < 1.");
      });
    });

    describe("below max", function () {
      beforeEach(async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.unripeLP.address, to6("1000"), EXTERNAL);
        this.result = await this.convert
          .connect(user)
          .convert(ConvertEncoder.convertUnripeLPToHooligans(to6("1000"), to6("990")), ["2"], [to6("1000")]);
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to6("1006.18167"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq(to6("0"));
        expect(await this.firm.totalProspects()).to.eq(to6("201.236334"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("100.618167"));
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("201.236334"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("100.618167"));
      });
    });

    describe("multiple crates", function () {
      beforeEach(async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.unripeLP.address, to6("500"), EXTERNAL);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.firm.connect(user).deposit(this.unripeLP.address, to6("500"), EXTERNAL);
        this.result = await this.convert
          .connect(user)
          .convert(
            ConvertEncoder.convertUnripeLPToHooligans(to6("1000"), to6("990"), this.unripeLP.address),
            ["2", "4"],
            [to6("500"), to6("500")]
          );
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to6("1006.18167"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq(to6("0"));
        expect(await this.firm.totalProspects()).to.eq("201236334");
        expect(await this.firm.totalHorde()).to.eq(toHorde("100.6382906334"));
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq("201236334");
        expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("100.6382906334"));
      });

      it("properly updates user deposits", async function () {
        expect((await this.firm.getDeposit(userAddress, this.unripeHooligan.address, 3))[0]).to.eq(to6("1006.18167"));
        const deposit = await this.firm.getDeposit(userAddress, this.unripeLP.address, 2);
        expect(deposit[0]).to.eq(to6("0"));
        expect(deposit[1]).to.eq(toHooligan("0"));
      });

      it("emits events", async function () {
        await expect(this.result)
          .to.emit(this.firm, "RemoveDeposits")
          .withArgs(userAddress, this.unripeLP.address, [2, 4], [to6("500"), to6("500")], to6("1000"));
        await expect(this.result)
          .to.emit(this.firm, "AddDeposit")
          .withArgs(userAddress, this.unripeHooligan.address, 3, to6("1006.18167"), to6("100.618167"));
      });
    });

    describe("hooligan over vested", function () {
      beforeEach(async function () {
        await this.unripe.connect(owner).addUnderlying(UNRIPE_HOOLIGAN, to6("1000"));
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.unripeLP.address, to6("1000"), EXTERNAL);
        this.result = await this.convert
          .connect(user)
          .convert(ConvertEncoder.convertUnripeLPToHooligans(to6("1000"), to6("1000")), ["2"], [to6("1000")]);
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to6("1006.18167"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq(to6("0"));
        expect(await this.firm.totalProspects()).to.eq(to6("384.075704"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("192.037852"));
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("384.075704"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("192.037852"));
      });
    });

    describe("hooligan under vested", function () {
      beforeEach(async function () {
        await this.unripe.connect(user).addUnderlyingWithRecap(UNRIPE_LP, to18("942.2960000"));
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.unripeLP.address, to6("1000"), EXTERNAL);
        this.result = await this.convert
          .connect(user)
          .convert(ConvertEncoder.convertUnripeLPToHooligans(to6("500"), to6("500")), ["2"], [to6("1000")]);
      });

      it("properly updates total values", async function () {
        expect(await this.firm.getTotalDeposited(this.unripeHooligan.address)).to.eq(to6("503.090835"));
        expect(await this.firm.getTotalDeposited(this.unripeLP.address)).to.eq(to6("500"));
        expect(await this.firm.totalProspects()).to.eq(to6("600"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("200"));
      });

      it("properly updates user values", async function () {
        expect(await this.firm.balanceOfProspects(userAddress)).to.eq(to6("600"));
        expect(await this.firm.totalHorde()).to.eq(toHorde("200"));
      });
    });
  });
});
