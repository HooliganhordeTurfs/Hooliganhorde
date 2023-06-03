const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { getAltHooliganhorde, getHooligan, getUsdc } = require("../utils/contracts.js");
const { signERC2612Permit } = require("eth-permit");
const { HOOLIGAN_3_CURVE, THREE_POOL, THREE_CURVE, PIPELINE, HOOLIGANHORDE } = require("./utils/constants.js");
const { to6, to18 } = require("./utils/helpers.js");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");

let user, user2, owner;

describe("External Token", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    const contracts = await deploy("Test", false, true);
    this.hooliganhorde = await getAltHooliganhorde(contracts.hooliganhordeDiamond.address);

    const Token = await ethers.getContractFactory("MockToken");
    this.token = await Token.deploy("Firm", "FIRM");
    await this.token.deployed();

    this.erc1155 = await (await ethers.getContractFactory("MockERC1155", owner)).deploy("Mock");
    await this.erc1155.connect(user).setApprovalForAll(this.hooliganhorde.address, true);

    this.erc721 = await (await ethers.getContractFactory("MockERC721", owner)).deploy();
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("Permit ERC-20 token", async function () {
    it("legit", async function () {
      result = await signERC2612Permit(ethers.provider, this.token.address, user.address, HOOLIGANHORDE, "10000000");

      await this.hooliganhorde
        .connect(user)
        .permitERC20(this.token.address, user.address, HOOLIGANHORDE, to6("10"), result.deadline, result.v, result.r, result.s);
    });
    expect(await this.token.allowance(user.address, HOOLIGANHORDE)).to.be.equal(to6("10"));

    it("fake", async function () {
      fakeResult = await signERC2612Permit(ethers.provider, user.address, user.address, owner.address, "10000000");

      await expect(
        this.hooliganhorde
          .connect(user)
          .permitERC20(
            this.hooligan.address,
            user.address,
            HOOLIGANHORDE,
            toHooligan("10"),
            fakeResult.deadline,
            fakeResult.v,
            fakeResult.r,
            fakeResult.s
          )
      ).to.be.revertedWith("ERC20Permit: invalid signature");
    });

    it("revert deadline passed", async function () {
      endedResult = await signERC2612Permit(ethers.provider, this.token.address, user.address, HOOLIGANHORDE, "10000000", "1");

      await expect(
        this.hooliganhorde
          .connect(user)
          .permitERC20(
            this.hooligan.address,
            user.address,
            HOOLIGANHORDE,
            toHooligan("10"),
            endedResult.deadline,
            endedResult.v,
            endedResult.r,
            endedResult.s
          )
      ).to.be.revertedWith("ERC20Permit: expired deadline");
    });
  });

  describe("Transfer ERC-1155", async function () {
    beforeEach(async function () {
      await this.erc1155.mockMint(user.address, "0", "5");
      await this.hooliganhorde.connect(user).transferERC1155(this.erc1155.address, PIPELINE, "0", "2");
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
      await this.hooliganhorde.connect(user).batchTransferERC1155(this.erc1155.address, PIPELINE, ["0", "1"], ["2", "3"]);
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
      await this.erc721.connect(user).approve(this.hooliganhorde.address, "0");
      await this.hooliganhorde.connect(user).transferERC721(this.erc721.address, PIPELINE, "0");
    });

    it("transfers ERC-721", async function () {
      expect(await this.erc721.ownerOf("0")).to.be.equal(PIPELINE);
    });
  });

  describe("Permit and transfer ERC-721", async function () {
    beforeEach(async function () {
      await this.erc721.mockMint(user.address, "0");
      const permit = this.hooliganhorde.interface.encodeFunctionData("permitERC721", [
        this.erc721.address,
        this.hooliganhorde.address,
        "0",
        "0",
        ethers.constants.HashZero
      ]);
      const transfer = this.hooliganhorde.interface.encodeFunctionData("transferERC721", [this.erc721.address, PIPELINE, "0"]);
      await this.hooliganhorde.connect(user).farm([permit, transfer]);
    });

    it("transfers ERC-721", async function () {
      expect(await this.erc721.ownerOf("0")).to.be.equal(PIPELINE);
    });
  });
});
