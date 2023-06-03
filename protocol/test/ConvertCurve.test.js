const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { HOOLIGAN, THREE_CURVE, THREE_POOL, HOOLIGAN_3_CURVE } = require("./utils/constants");
const { ConvertEncoder } = require("./utils/encoder.js");
const { to18, toHooligan, toHorde, to6 } = require("./utils/helpers.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
let user, user2, owner;
let userAddress, ownerAddress, user2Address;

describe("Curve Convert", function () {
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

    await this.hooliganMetapool.set_A_precise("1000");
    await this.hooliganMetapool.set_virtual_price(ethers.utils.parseEther("1"));
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
      expect(await this.convert.getMaxAmountIn(this.hooligan.address, this.hooliganMetapool.address)).to.be.equal(
        ethers.utils.parseUnits("200", 6)
      );
    });

    it("p = 1", async function () {
      expect(await this.convert.getMaxAmountIn(this.hooligan.address, this.hooliganMetapool.address)).to.be.equal("0");
    });

    it("p < 1", async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
      expect(await this.convert.getMaxAmountIn(this.hooligan.address, this.hooliganMetapool.address)).to.be.equal("0");
    });
  });

  describe("calclates lp to peg", async function () {
    it("p > 1", async function () {
      await this.hooliganMetapool.connect(user2).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
      expect(await this.convert.getMaxAmountIn(this.hooliganMetapool.address, this.hooligan.address)).to.be.equal("199185758314813528598");
    });

    it("p = 1", async function () {
      expect(await this.convert.getMaxAmountIn(this.hooliganMetapool.address, this.hooligan.address)).to.be.equal("0");
    });

    it("p < 1", async function () {
      await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      expect(await this.convert.getMaxAmountIn(this.hooliganMetapool.address, this.hooligan.address)).to.be.equal("0");
    });
  });

  describe("convert hooligans to lp", async function () {
    describe("revert", async function () {
      it("not enough LP", async function () {
        await this.firm.connect(user).deposit(this.hooligan.address, toHooligan("200"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
        await expect(
          this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertHooligansToCurveLP(toHooligan("200"), to18("201"), this.hooliganMetapool.address),
              ["2"],
              [toHooligan("200")]
            )
        ).to.be.revertedWith("Curve: Not enough LP");
      });

      it("p >= 1", async function () {
        await this.firm.connect(user).deposit(this.hooligan.address, "1000", EXTERNAL);
        await expect(
          this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertHooligansToCurveLP(toHooligan("200"), to18("190"), this.hooliganMetapool.address),
              ["1"],
              ["1000"]
            )
        ).to.be.revertedWith("Convert: P must be >= 1.");
      });
    });

    describe("below max", async function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.hooligan.address, toHooligan("200"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      });

      it("it gets amount out", async function () {
        expect(await this.convert.getAmountOut(HOOLIGAN, HOOLIGAN_3_CURVE, toHooligan("100"))).to.be.equal("100634476734756985505");
      });

      it("returns correct values", async function () {
        this.result = await this.convert
          .connect(user)
          .callStatic.convert(
            ConvertEncoder.convertHooligansToCurveLP(toHooligan("100"), to18("99"), this.hooliganMetapool.address),
            ["2"],
            [toHooligan("100")]
          );
        expect(this.result.toGameday).to.be.equal(2);
        expect(this.result.fromAmount).to.be.equal(to6("100"));
        expect(this.result.toAmount).to.be.equal("100634476734756985505");
        expect(this.result.fromBdv).to.be.equal(to6("100"));
        expect(this.result.toBdv).to.be.equal(to6("100"));
      });

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertHooligansToCurveLP(toHooligan("100"), to18("99"), this.hooliganMetapool.address),
              ["2"],
              [toHooligan("100")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq(toHooligan("100"));
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq("100634476734756985505");
          expect(await this.firm.totalProspects()).to.eq(toHooligan("600"));
          expect(await this.firm.totalHorde()).to.eq(toHorde("200"));
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("600"));
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("200"));
        });

        it("properly updates user deposits", async function () {
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 2))[0]).to.eq(toHooligan("100"));
          const deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 2);
          expect(deposit[0]).to.eq("100634476734756985505");
          expect(deposit[1]).to.eq(toHooligan("100"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooligan.address, [2], [toHooligan("100")], toHooligan("100"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooliganMetapool.address, 2, "100634476734756985505", toHooligan("100"));
        });
      });
    });

    describe("above max", function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.hooligan.address, toHooligan("300"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      });

      it("it gets amount out", async function () {
        expect(await this.convert.getAmountOut(HOOLIGAN, HOOLIGAN_3_CURVE, toHooligan("200"))).to.be.equal("200832430692705624354");
      });

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertHooligansToCurveLP(toHooligan("250"), to18("190"), this.hooliganMetapool.address),
              ["2"],
              [toHooligan("250")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq(toHooligan("100"));
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq("200832430692705624354");
          expect(await this.firm.totalProspects()).to.eq(toHooligan("1000"));
          expect(await this.firm.totalHorde()).to.eq(toHorde("300"));
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("1000"));
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("300"));
        });

        it("properly updates user deposits", async function () {
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 2))[0]).to.eq(toHooligan("100"));
          const deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 2);
          expect(deposit[0]).to.eq("200832430692705624354");
          expect(deposit[1]).to.eq(toHooligan("200"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooligan.address, [2], [toHooligan("200")], toHooligan("200"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooliganMetapool.address, 2, "200832430692705624354", toHooligan("200"));
        });
      });
    });

    describe("after one gameday", function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.hooligan.address, toHooligan("200"), EXTERNAL);
        await this.gameday.firmActuation(0);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      });

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertHooligansToCurveLP(toHooligan("250"), to18("190"), this.hooliganMetapool.address),
              ["2"],
              [toHooligan("250")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq(toHooligan("0"));
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq("200832430692705624354");
          expect(await this.firm.totalProspects()).to.eq(toHooligan("800"));
          expect(await this.firm.totalHorde()).to.eq(toHorde("200"));
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("800"));
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("200"));
        });

        it("properly updates user deposits", async function () {
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 2))[0]).to.eq(toHooligan("0"));
          const deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 3);
          expect(deposit[0]).to.eq("200832430692705624354");
          expect(deposit[1]).to.eq(toHooligan("200"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooligan.address, [2], [toHooligan("200")], toHooligan("200"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooliganMetapool.address, 3, "200832430692705624354", toHooligan("200"));
        });
      });
    });

    describe("after multiple gameday", function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.hooligan.address, toHooligan("200"), EXTERNAL);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      });

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertHooligansToCurveLP(toHooligan("250"), to18("190"), this.hooliganMetapool.address),
              ["2"],
              [toHooligan("250")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq(toHooligan("0"));
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq("200832430692705624354");
          expect(await this.firm.totalProspects()).to.eq(toHooligan("800"));
          expect(await this.firm.totalHorde()).to.eq(toHorde("200.08"));
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("800"));
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("200.08"));
        });

        it("properly updates user deposits", async function () {
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 2))[0]).to.eq(toHooligan("0"));
          const deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 3);
          expect(deposit[0]).to.eq("200832430692705624354");
          expect(deposit[1]).to.eq(toHooligan("200"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooligan.address, [2], [toHooligan("200")], toHooligan("200"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooliganMetapool.address, 3, "200832430692705624354", toHooligan("200"));
        });
      });
    });

    describe("multiple crates", function () {
      beforeEach(async function () {
        await this.firm.connect(user).deposit(this.hooligan.address, toHooligan("100"), EXTERNAL);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.gameday.firmActuation(0);
        await this.firm.connect(user).deposit(this.hooligan.address, toHooligan("100"), EXTERNAL);
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("200")], to18("150"));
      });

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertHooligansToCurveLP(toHooligan("250"), to18("190"), this.hooliganMetapool.address),
              ["2", "6"],
              [toHooligan("100"), toHooligan("100")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq(toHooligan("0"));
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq("200832430692705624354");
          expect(await this.firm.totalProspects()).to.eq(toHooligan("800"));
          expect(await this.firm.totalHorde()).to.eq(toHorde("200.08"));
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq(toHooligan("800"));
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq(toHorde("200.08"));
        });

        it("properly updates user deposits", async function () {
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 2))[0]).to.eq(toHooligan("0"));
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 6))[0]).to.eq(toHooligan("0"));
          const deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 5);
          expect(deposit[0]).to.eq("200832430692705624354");
          expect(deposit[1]).to.eq(toHooligan("200"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooligan.address, [2, 6], [toHooligan("100"), toHooligan("100")], toHooligan("200"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooliganMetapool.address, 5, "200832430692705624354", toHooligan("200"));
        });
      });
    });
  });

  describe("convert lp to hooligans", async function () {
    describe("revert", async function () {
      it("not enough Hooligans", async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.hooliganMetapool.address, to18("1000"), EXTERNAL);

        await expect(
          this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertCurveLPToHooligans(to18("200"), toHooligan("250"), this.hooliganMetapool.address),
              ["2"],
              [to18("200")]
            )
        ).to.be.revertedWith("Curve: Insufficient Output");
      });

      it("p < 1", async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("0"), to18("1")], to18("0.5"));
        await this.firm.connect(user).deposit(this.hooliganMetapool.address, to18("1000"), EXTERNAL);
        await expect(
          this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertCurveLPToHooligans(to18("200"), toHooligan("190"), this.hooliganMetapool.address),
              ["1"],
              ["1000"]
            )
        ).to.be.revertedWith("Convert: P must be < 1.");
      });
    });

    describe("below max", function () {
      beforeEach(async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.hooliganMetapool.address, to18("1000"), EXTERNAL);
      });

      it("it gets amount out", async function () {
        expect(await this.convert.getAmountOut(HOOLIGAN_3_CURVE, HOOLIGAN, to18("100"))).to.be.equal("100618167");
      });

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertCurveLPToHooligans(to18("100"), toHooligan("99"), this.hooliganMetapool.address),
              ["2"],
              [to18("100")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq("100618167");
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq(to18("900"));
          expect(await this.firm.totalProspects()).to.eq("3801236334");
          expect(await this.firm.totalHorde()).to.eq("10006181670000");
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("3801236334");
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10006181670000");
        });

        it("properly updates user deposits", async function () {
          let deposit = await this.firm.getDeposit(userAddress, this.hooligan.address, 2);
          expect(deposit[0]).to.eq(toHooligan("100.618167"));
          expect(deposit[1]).to.eq(toHooligan("100.618167"));
          deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 2);
          expect(deposit[0]).to.eq(to18("900"));
          expect(deposit[1]).to.eq(toHooligan("900"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooliganMetapool.address, [2], [to18("100")], to18("100"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooligan.address, 2, "100618167", "100618167");
        });
      });
    });

    describe("above max", function () {
      beforeEach(async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.hooliganMetapool.address, to18("1000"), EXTERNAL);
      });

      it("it gets amount out", async function () {
        expect(await this.convert.getAmountOut(HOOLIGAN_3_CURVE, HOOLIGAN, "199185758314813528598")).to.be.equal("200018189");
      });

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertCurveLPToHooligans(to18("300"), toHooligan("150"), this.hooliganMetapool.address),
              ["2"],
              [to18("300")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq("200018189");
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq("800814241685186471402");
          expect(await this.firm.totalProspects()).to.eq("3603293346");
          expect(await this.firm.totalHorde()).to.eq("10008324310000");
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("3603293346");
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10008324310000");
        });

        it("properly updates user deposits", async function () {
          let deposit = await this.firm.getDeposit(userAddress, this.hooligan.address, 2);
          expect(deposit[0]).to.eq("200018189");
          expect(deposit[1]).to.eq("200018189");
          deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 2);
          expect(deposit[0]).to.eq("800814241685186471402");
          expect(deposit[1]).to.eq("800814242");
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooliganMetapool.address, [2], ["199185758314813528598"], "199185758314813528598");
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooligan.address, 2, "200018189", "200018189");
        });
      });
    });

    describe("after 1 gameday", function () {
      beforeEach(async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.hooliganMetapool.address, to18("1000"), EXTERNAL);
        await this.gameday.firmActuation(0);
      });

      it("it gets amount out", async function () {});

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertCurveLPToHooligans(to18("100"), toHooligan("99"), this.hooliganMetapool.address),
              ["2"],
              [to18("100")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq("100618167");
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq(to18("900"));
          expect(await this.firm.totalProspects()).to.eq("3801236334");
          expect(await this.firm.totalHorde()).to.eq("10009982906334");
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("3801236334");
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10009982906334");
        });

        it("properly updates user deposits", async function () {
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 2))[0]).to.eq("100618167");
          const deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 2);
          expect(deposit[0]).to.eq(to18("900"));
          expect(deposit[1]).to.eq(toHooligan("900"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooliganMetapool.address, [2], [to18("100")], to18("100"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooligan.address, 2, "100618167", "100618167");
        });
      });
    });

    describe("multiple crates", function () {
      beforeEach(async function () {
        await this.hooliganMetapool.connect(user).add_liquidity([toHooligan("200"), to18("0")], to18("150"));
        await this.firm.connect(user).deposit(this.hooliganMetapool.address, to18("500"), EXTERNAL);
        await this.gameday.firmActuation(0);
        await this.firm.connect(user).deposit(this.hooliganMetapool.address, to18("500"), EXTERNAL);
      });

      it("it gets amount out", async function () {});

      describe("it converts", async function () {
        beforeEach(async function () {
          this.result = await this.convert
            .connect(user)
            .convert(
              ConvertEncoder.convertCurveLPToHooligans(to18("100"), toHooligan("99"), this.hooliganMetapool.address),
              ["2", "3"],
              [to18("50"), to18("50")]
            );
        });

        it("properly updates total values", async function () {
          expect(await this.firm.getTotalDeposited(this.hooligan.address)).to.eq("100618167");
          expect(await this.firm.getTotalDeposited(this.hooliganMetapool.address)).to.eq(to18("900"));
          expect(await this.firm.totalProspects()).to.eq("3801236334");
          expect(await this.firm.totalHorde()).to.eq("10007981670000");
        });

        it("properly updates user values", async function () {
          expect(await this.firm.balanceOfProspects(userAddress)).to.eq("3801236334");
          expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10007981670000");
        });

        it("properly updates user deposits", async function () {
          expect((await this.firm.getDeposit(userAddress, this.hooligan.address, 3))[0]).to.eq("100618167");
          const deposit = await this.firm.getDeposit(userAddress, this.hooliganMetapool.address, 2);
          expect(deposit[0]).to.eq(to18("450"));
          expect(deposit[1]).to.eq(toHooligan("450"));
        });

        it("emits events", async function () {
          await expect(this.result)
            .to.emit(this.firm, "RemoveDeposits")
            .withArgs(userAddress, this.hooliganMetapool.address, [2, 3], [to18("50"), to18("50")], to18("100"));
          await expect(this.result)
            .to.emit(this.firm, "AddDeposit")
            .withArgs(userAddress, this.hooligan.address, 3, "100618167", "100618167");
        });
      });
    });
  });
});
