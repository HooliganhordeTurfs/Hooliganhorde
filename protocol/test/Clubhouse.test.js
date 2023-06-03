const { expect } = require("chai");
const { defaultAbiCoder } = require("ethers/lib/utils.js");
const { deploy } = require("../scripts/deploy.js");
const { deployPipeline, impersonatePipeline } = require("../scripts/pipeline.js");
const { deployContract } = require("../scripts/contracts.js");
const { getAltHooliganhorde, getHooligan, getUsdc } = require("../utils/contracts.js");
const { signERC2612Permit } = require("eth-permit");
const { toBN, encodeAdvancedData, signFirmDepositTokenPermit, signFirmDepositTokensPermit, signTokenPermit } = require("../utils/index.js");
const { impersonateSigner } = require("../utils/signer.js");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { HOOLIGAN_3_CURVE, THREE_POOL, THREE_CURVE, STABLE_FACTORY, WETH, HOOLIGAN, PIPELINE } = require("./utils/constants.js");
const { to6, to18 } = require("./utils/helpers.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
const { impersonateClubhouse } = require("../scripts/clubhouse.js");

let user, user2, owner;

describe("Clubhouse", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    const contracts = await deploy("Test", false, true);
    this.hooliganhorde = await getAltHooliganhorde(contracts.hooliganhordeDiamond.address);
    this.mockFirm = await ethers.getContractAt("MockFirmFacet", contracts.hooliganhordeDiamond.address);
    this.hooligan = await getHooligan();
    this.usdc = await getUsdc();
    this.threeCurve = await ethers.getContractAt("MockToken", THREE_CURVE);
    this.threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
    this.hooliganMetapool = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
    this.weth = await ethers.getContractAt("MockWETH", WETH);

    pipeline = await impersonatePipeline();
    this.clubhouse = await impersonateClubhouse();

    this.erc1155 = await (await ethers.getContractFactory("MockERC1155", owner)).deploy("Mock");
    await this.erc1155.connect(user).setApprovalForAll(this.clubhouse.address, true);

    this.erc721 = await (await ethers.getContractFactory("MockERC721", owner)).deploy();

    this.mockContract = await (await ethers.getContractFactory("MockContract", owner)).deploy();
    await this.mockContract.deployed();
    await this.mockContract.setAccount(user2.address);
    const gameday = await ethers.getContractAt("MockGamedayFacet", contracts.hooliganhordeDiamond.address);

    await this.hooligan.mint(user.address, to6("1004"));
    await this.usdc.mint(user.address, to6("1000"));

    await this.hooligan.connect(user).approve(this.hooliganhorde.address, to18("1"));
    await this.usdc.connect(user).approve(this.hooliganhorde.address, to18("1"));

    await this.hooligan.connect(user).approve(this.hooliganhorde.address, "100000000000");
    await this.hooligan.connect(user).approve(this.hooliganMetapool.address, "100000000000");
    await this.hooligan.mint(user.address, to6("10000"));

    await this.threeCurve.mint(user.address, to18("1000"));
    await this.threePool.set_virtual_price(to18("2"));
    await this.threeCurve.connect(user).approve(this.hooliganMetapool.address, to18("100000000000"));

    await this.hooliganMetapool.set_A_precise("1000");
    await this.hooliganMetapool.set_virtual_price(ethers.utils.parseEther("1"));
    await this.hooliganMetapool.connect(user).approve(this.threeCurve.address, to18("100000000000"));
    await this.hooliganMetapool.connect(user).approve(this.hooliganhorde.address, to18("100000000000"));
    await this.threeCurve.connect(user).approve(this.hooliganhorde.address, to18("100000000000"));
    this.result = await this.hooliganhorde
      .connect(user)
      .addLiquidity(HOOLIGAN_3_CURVE, STABLE_FACTORY, [to6("1000"), to18("1000")], to18("2000"), EXTERNAL, EXTERNAL);

    const FirmToken = await ethers.getContractFactory("MockToken");
    this.firmToken = await FirmToken.deploy("Firm", "FIRM");
    await this.firmToken.deployed();
    await this.mockFirm.mockWhitelistToken(
      this.firmToken.address,
      this.mockFirm.interface.getSighash("mockBDV(uint256 amount)"),
      "10000",
      "1"
    );
    await this.firmToken.connect(user).approve(this.hooliganhorde.address, "100000000000");
    await this.firmToken.mint(user.address, to6("2"));

    await this.hooliganhorde.connect(user).deposit(HOOLIGAN, to6("1"), 0);
    await this.hooliganhorde.connect(user).deposit(this.firmToken.address, to6("1"), 0);
    await gameday.firmActuation("0");
    await this.hooliganhorde.connect(user).deposit(HOOLIGAN, to6("1"), 0);
    await this.hooliganhorde.connect(user).transferToken(HOOLIGAN, user.address, to6("1"), EXTERNAL, INTERNAL);
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("Normal Pipe", async function () {
    describe("1 Pipe", async function () {
      beforeEach(async function () {
        const mintHooligans = this.hooligan.interface.encodeFunctionData("mint", [pipeline.address, to6("100")]);
        await this.clubhouse.connect(user).pipe([this.hooligan.address, mintHooligans]);
      });

      it("mints hooligans", async function () {
        expect(await this.hooligan.balanceOf(pipeline.address)).to.be.equal(to6("100"));
      });
    });
  });

  describe("Permit Deposit and Transfer Deposits (multiple gamedays)", async function () {
    beforeEach(async function () {
      const nonce = await this.hooliganhorde.connect(user).depositPermitNonces(user.address);
      const signature = await signFirmDepositTokenPermit(user, user.address, this.clubhouse.address, HOOLIGAN, to6("2"), nonce);
      permit = await this.clubhouse.interface.encodeFunctionData("permitDeposit", [
        signature.owner,
        signature.spender,
        signature.token,
        signature.value,
        signature.deadline,
        signature.split.v,
        signature.split.r,
        signature.split.s
      ]);

      transfer = await this.clubhouse.interface.encodeFunctionData("transferDeposits", [
        user.address,
        PIPELINE,
        HOOLIGAN,
        [1, 2],
        [to6("1"), to6("1")]
      ]);
      await this.clubhouse.connect(user).farm([permit, transfer]);
    });

    it("pipeline has deposits", async function () {
      const deposit = await this.hooliganhorde.getDeposit(PIPELINE, HOOLIGAN, 1);
      expect(deposit[0]).to.be.equal(to6("1"));
      expect(deposit[1]).to.be.equal(to6("1"));
      const deposit2 = await this.hooliganhorde.getDeposit(PIPELINE, HOOLIGAN, 2);
      expect(deposit2[0]).to.be.equal(to6("1"));
      expect(deposit2[1]).to.be.equal(to6("1"));
    });

    it("user does not have deposits", async function () {
      const deposit = await this.hooliganhorde.getDeposit(user.address, HOOLIGAN, 1);
      expect(deposit[0]).to.be.equal(to6("0"));
      expect(deposit[1]).to.be.equal(to6("0"));
      const deposit2 = await this.hooliganhorde.getDeposit(user.address, HOOLIGAN, 2);
      expect(deposit2[0]).to.be.equal(to6("0"));
      expect(deposit2[1]).to.be.equal(to6("0"));
    });
  });

  describe("Permit Deposit and Transfer Deposits (multiple tokens)", async function () {
    beforeEach(async function () {
      const nonce = await this.hooliganhorde.connect(user).depositPermitNonces(user.address);
      const signature = await signFirmDepositTokensPermit(
        user,
        user.address,
        this.clubhouse.address,
        [HOOLIGAN, this.firmToken.address],
        [to6("1"), to6("1")],
        nonce
      );
      permit = await this.clubhouse.interface.encodeFunctionData("permitDeposits", [
        signature.owner,
        signature.spender,
        signature.tokens,
        signature.values,
        signature.deadline,
        signature.split.v,
        signature.split.r,
        signature.split.s
      ]);

      transfer = await this.clubhouse.interface.encodeFunctionData("transferDeposit", [user.address, PIPELINE, HOOLIGAN, 1, to6("1")]);

      transfer2 = await this.clubhouse.interface.encodeFunctionData("transferDeposit", [
        user.address,
        PIPELINE,
        this.firmToken.address,
        1,
        to6("1")
      ]);
      await this.clubhouse.connect(user).farm([permit, transfer, transfer2]);
    });

    it("pipeline has deposits", async function () {
      const deposit = await this.hooliganhorde.getDeposit(PIPELINE, HOOLIGAN, 1);
      expect(deposit[0]).to.be.equal(to6("1"));
      expect(deposit[1]).to.be.equal(to6("1"));
      const deposit2 = await this.hooliganhorde.getDeposit(PIPELINE, this.firmToken.address, 1);
      expect(deposit2[0]).to.be.equal(to6("1"));
      expect(deposit2[1]).to.be.equal(to6("1"));
    });

    it("user does not have deposits", async function () {
      const deposit = await this.hooliganhorde.getDeposit(user.address, HOOLIGAN, 1);
      expect(deposit[0]).to.be.equal(to6("0"));
      expect(deposit[1]).to.be.equal(to6("0"));
      const deposit2 = await this.hooliganhorde.getDeposit(user.address, this.firmToken.address, 1);
      expect(deposit2[0]).to.be.equal(to6("0"));
      expect(deposit2[1]).to.be.equal(to6("0"));
    });
  });

  describe("Deposit Transfer reverts with wrong sender", async function () {
    it("transferDeposit", async function () {
      await expect(
        this.clubhouse.connect(user2).transferDeposit(user.address, PIPELINE, this.firmToken.address, 1, to6("1"))
      ).to.be.revertedWith("invalid sender");
    });

    it("transferDeposits", async function () {
      await expect(
        this.clubhouse.connect(user2).transferDeposits(user.address, PIPELINE, this.firmToken.address, [1], [to6("1")])
      ).to.be.revertedWith("invalid sender");
    });
  });

  it("Reverts if not INTERNAL or EXTERNAL", async function () {
    await expect(this.clubhouse.transferToken(this.firmToken.address, PIPELINE, to6("1"), INTERNAL_TOLERANT, EXTERNAL)).to.be.revertedWith(
      "Mode not supported"
    );
  });

  describe("Permit and Transfer ERC-20 token", async function () {
    beforeEach(async function () {
      const signature = await signERC2612Permit(ethers.provider, this.firmToken.address, user.address, this.clubhouse.address, "10000000");

      permit = this.hooliganhorde.interface.encodeFunctionData("permitERC20", [
        this.firmToken.address,
        signature.owner,
        signature.spender,
        signature.value,
        signature.deadline,
        signature.v,
        signature.r,
        signature.s
      ]);

      transfer = await this.clubhouse.interface.encodeFunctionData("transferToken", [
        this.firmToken.address,
        PIPELINE,
        to6("1"),
        EXTERNAL,
        EXTERNAL
      ]);
      await this.clubhouse.connect(user).farm([permit, transfer]);
    });

    it("transfers token", async function () {
      expect(await this.firmToken.balanceOf(user.address)).to.be.equal(to6("0"));
      expect(await this.firmToken.balanceOf(PIPELINE)).to.be.equal(to6("1"));
    });
  });

  describe("Permit and Transfer ERC-20 token from Farm balances", async function () {
    beforeEach(async function () {
      const nonce = await this.hooliganhorde.tokenPermitNonces(user.address);
      const signature = await signTokenPermit(user, user.address, this.clubhouse.address, HOOLIGAN, to6("1"), nonce);

      permit = this.hooliganhorde.interface.encodeFunctionData("permitToken", [
        signature.owner,
        signature.spender,
        signature.token,
        signature.value,
        signature.deadline,
        signature.split.v,
        signature.split.r,
        signature.split.s
      ]);
      transfer = await this.clubhouse.interface.encodeFunctionData("transferToken", [HOOLIGAN, PIPELINE, to6("1"), INTERNAL, EXTERNAL]);
      await this.clubhouse.connect(user).farm([permit, transfer]);
    });

    it("transfers token", async function () {
      expect(await this.hooliganhorde.getInternalBalance(HOOLIGAN, user.address)).to.be.equal(to6("0"));
      expect(await this.hooligan.balanceOf(PIPELINE)).to.be.equal(to6("1"));
    });
  });

  describe("Transfer ERC-1155", async function () {
    beforeEach(async function () {
      await this.erc1155.mockMint(user.address, "0", "5");
      await this.clubhouse.connect(user).transferERC1155(this.erc1155.address, PIPELINE, "0", "2");
    });

    it("transfers ERC-1155", async function () {
      expect(await this.erc1155.balanceOf(PIPELINE, "0")).to.be.equal("2");
      expect(await this.erc1155.balanceOf(user.address, "0")).to.be.equal("3");
    });
  });

  describe("Batch Transfer ERC-1155", async function () {
    beforeEach(async function () {
      await this.erc1155.mockMint(user.address, "0", "5");
      await this.erc1155.mockMint(user.address, "1", "10");
      await this.clubhouse.connect(user).batchTransferERC1155(this.erc1155.address, PIPELINE, ["0", "1"], ["2", "3"]);
    });

    it("transfers ERC-1155", async function () {
      const balances = await this.erc1155.balanceOfBatch([PIPELINE, PIPELINE, user.address, user.address], ["0", "1", "0", "1"]);
      expect(balances[0]).to.be.equal("2");
      expect(balances[1]).to.be.equal("3");
      expect(balances[2]).to.be.equal("3");
      expect(balances[3]).to.be.equal("7");
    });
  });

  describe("Transfer ERC-721", async function () {
    beforeEach(async function () {
      await this.erc721.mockMint(user.address, "0");
      await this.erc721.connect(user).approve(this.clubhouse.address, "0");
      await this.clubhouse.connect(user).transferERC721(this.erc721.address, PIPELINE, "0");
    });

    it("transfers ERC-721", async function () {
      expect(await this.erc721.ownerOf("0")).to.be.equal(PIPELINE);
    });
  });

  describe("Permit and transfer ERC-721", async function () {
    beforeEach(async function () {
      await this.erc721.mockMint(user.address, "0");
      const permit = this.clubhouse.interface.encodeFunctionData("permitERC721", [
        this.erc721.address,
        this.clubhouse.address,
        "0",
        "0",
        ethers.constants.HashZero
      ]);
      const transfer = this.clubhouse.interface.encodeFunctionData("transferERC721", [this.erc721.address, PIPELINE, "0"]);
      await this.clubhouse.connect(user).farm([permit, transfer]);
    });

    it("transfers ERC-721", async function () {
      expect(await this.erc721.ownerOf("0")).to.be.equal(PIPELINE);
    });
  });
});
