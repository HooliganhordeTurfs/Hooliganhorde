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
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.hooliganhorde = await getAltHooliganhorde(this.diamond.address);
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

    gameday = await this.gameday.gameday();
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("Unripe Hooligan Removal", async function () {
    describe("All but 1", async function () {
      beforeEach(async function () {
        // 158328 * 0.185564685220298701 ~= 29380.085
        // 158327 * 0.185564685220298701 ~= 29379.899
        // floor(29380.085) - floor(29379.899) = 1
        await this.firm.connect(user).mockUnripeHooliganDeposit(gameday, "158328");
        await this.hooliganhorde.connect(user).withdrawDeposit(UNRIPE_HOOLIGAN, gameday, "158327");
      });
      it("should remove most of the deposit", async function () {
        const deposit = await this.hooliganhorde.connect(user).getDeposit(userAddress, UNRIPE_HOOLIGAN, gameday);
        expect(deposit[0]).to.equal("1");
        expect(deposit[1]).to.equal("1");
      });

      it("removes all horde and prospects", async function () {
        const horde = await this.hooliganhorde.balanceOfHorde(userAddress);
        const prospects = await this.hooliganhorde.balanceOfProspects(userAddress);
        expect(horde).to.equal("10000");
        expect(prospects).to.equal("2");
      });
    });
  });
});
