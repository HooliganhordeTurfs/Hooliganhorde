const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { THREE_POOL, HOOLIGAN_3_CURVE, HOOLIGAN } = require("./utils/constants");
const { to6 } = require("./utils/helpers.js");
let user, user2, owner;
let userAddress, ownerAddress, user2Address;

let lastTimestamp;
let timestamp;

function to18(amount) {
  return ethers.utils.parseEther(amount);
}

function toHooligan(amount) {
  return ethers.utils.parseUnits(amount, 6);
}

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

describe("Oracle", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", this.diamond.address);
    this.hooligan = await ethers.getContractAt("MockToken", HOOLIGAN);

    await this.gameday.firmActuation(0);

    lastTimestamp = 1700000000;

    this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
    await this.threePool.set_virtual_price(to18("1"));
    this.hooliganThreeCurve = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
    await this.hooliganThreeCurve.set_supply("100000");
    await this.hooliganThreeCurve.set_A_precise("1000");
    await this.hooliganThreeCurve.set_balances([toHooligan("1000000"), to18("1000000")]);
    await this.hooligan.mint(user2Address, to6("1000000000"));
  });

  beforeEach(async function () {
    await this.gameday.resetState();
    await this.hooliganThreeCurve.set_balances([toHooligan("1000000"), to18("1000000")]);
    await this.gameday.firmActuation(0);
    await this.gameday.teleportActuation("250");
    await resetTime();
    await this.gameday.resetPools([this.hooliganThreeCurve.address]);
    await resetTime();
    await this.gameday.captureE();
  });

  describe("Curve", async function () {
    it("initializes the oracle", async function () {
      const o = await this.gameday.curveOracle();
      expect(o.initialized).to.equal(true);
      expect(o.balances[0]).to.equal(toHooligan("100000001000000"));
      expect(o.balances[1]).to.equal(to18("100000001000000"));
      const block = await ethers.provider.getBlock("latest");
      expect(o.timestamp).to.equal(block.timestamp);
    });

    it("tracks a basic TWAL", async function () {
      this.result = await this.gameday.updateTWAPCurveE();
      await expect(this.result)
        .to.emit(this.gameday, "UpdateTWAPs")
        .withArgs([toHooligan("1000000"), to18("1000000")]);
    });

    it("tracks a TWAL with a change", async function () {
      await advanceTime(900);
      await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
      await advanceTime(900);
      this.result = await this.gameday.updateTWAPCurveE();
      await expect(this.result)
        .to.emit(this.gameday, "UpdateTWAPs")
        .withArgs([ethers.utils.parseUnits("1500000", 6), ethers.utils.parseEther("1000000")]);
    });

    it("2 separate TWAL", async function () {
      await advanceTime(900);
      await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
      await advanceTime(900);
      await this.hooliganThreeCurve.update([toHooligan("1000000"), to18("1000000")]);
      await advanceTime(1800);
      this.result = await this.gameday.updateTWAPCurveE();

      await expect(this.result)
        .to.emit(this.gameday, "UpdateTWAPs")
        .withArgs([ethers.utils.parseUnits("1250000", 6), ethers.utils.parseEther("1000000")]);
      await advanceTime(900);
      await this.hooliganThreeCurve.update([toHooligan("500000"), to18("1000000")]);
      await advanceTime(900);
      this.result = await this.gameday.updateTWAPCurveE();

      await expect(this.result)
        .to.emit(this.gameday, "UpdateTWAPs")
        .withArgs([toHooligan("750000"), to18("1000000")]);
    });

    describe("above Max Delta B", async function () {
      it("tracks a basic Delta B", async function () {
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs("0");
      });

      it("tracks a TWAL with a change", async function () {
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs("-252354675068");
      });

      it("tracks a TWAL during ramping up gameday", async function () {
        await this.gameday.teleportActuation("120");
        await resetTime();
        await this.gameday.captureE();
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs("-252354675068");
        this.result = await this.gameday.updateTWAPCurveE();
      });

      it("tracks a TWAL with a change", async function () {
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs("-252354675068");
      });

      it("tracks a TWAL with a change", async function () {
        await advanceTime(1800);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("2020000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs("3332955488");
      });
    });

    describe("Get Delta B", async function () {
      it("reverts if not a minting pool", async function () {
        await expect(this.gameday.poolDeltaB(HOOLIGAN)).to.be.revertedWith("Oracle: Pool not supported");
      });

      it("tracks a basic Delta B", async function () {
        await advanceTime(900);
        await hre.network.provider.send("evm_mine");
        expect(await this.gameday.poolDeltaB(HOOLIGAN_3_CURVE)).to.equal("0");
        expect(await this.gameday.totalDeltaB()).to.equal("0");
      });

      it("tracks a TWAL with a change", async function () {
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        await hre.network.provider.send("evm_mine");
        expect(await this.gameday.poolDeltaB(HOOLIGAN_3_CURVE)).to.equal("-252354675068");
        expect(await this.gameday.totalDeltaB()).to.equal("-252354675068");
      });
    });

    describe("Below max Delta B", async function () {
      beforeEach(async function () {
        await this.hooligan.connect(user2).burn(await this.hooligan.balanceOf(user2Address));
        await this.hooligan.mint(user2Address, to6("100"));
      });

      it("tracks a basic Delta B", async function () {
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs("0");
      });

      it("tracks a TWAL with a change", async function () {
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs(to6("-1"));
      });

      it("tracks a TWAL during ramping up gameday", async function () {
        await this.hooligan.mint(user2Address, to6("100"));
        await this.gameday.teleportActuation("120");
        await resetTime();
        await this.gameday.captureE();
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs(to6("-2"));
        this.result = await this.gameday.updateTWAPCurveE();
      });

      it("tracks a TWAL with a change", async function () {
        await this.hooligan.mint(user2Address, to6("1000"));
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs(to6("-11"));
      });

      it("tracks a TWAL with a change", async function () {
        await this.hooligan.mint(user2Address, to6("1000"));
        await advanceTime(1800);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("2020000")]);
        await advanceTime(900);
        this.result = await this.gameday.captureCurveE();
        await expect(this.result).to.emit(this.gameday, "DeltaB").withArgs(to6("11"));
      });

      it("tracks a basic Delta B", async function () {
        await advanceTime(900);
        await hre.network.provider.send("evm_mine");
        expect(await this.gameday.poolDeltaB(HOOLIGAN_3_CURVE)).to.equal("0");
        expect(await this.gameday.totalDeltaB()).to.equal("0");
      });

      it("tracks a TWAL with a change", async function () {
        await advanceTime(900);
        await this.hooliganThreeCurve.update([toHooligan("2000000"), to18("1000000")]);
        await advanceTime(900);
        await hre.network.provider.send("evm_mine");
        expect(await this.gameday.poolDeltaB(HOOLIGAN_3_CURVE)).to.equal(to6("-1"));
        expect(await this.gameday.totalDeltaB()).to.equal(to6("-1"));
      });
    });
  });
});
