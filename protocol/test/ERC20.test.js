const { to18, toHooligan } = require("./utils/helpers.js");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { WETH, HOOLIGANHORDE } = require("./utils/constants");
const { signERC2612Permit } = require("eth-permit");
const { expect } = require("chai");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");

let snapshotId;

let userAddress, ownerAddress, user2Address;

describe("ERC-20", function () {
  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [HOOLIGANHORDE]
    });

    [owner, user, user2] = await ethers.getSigners();

    const Hooligan = await ethers.getContractFactory("Hooligan", owner);
    hooligan = await Hooligan.deploy();
    await hooligan.deployed();
    await hooligan.mint(user.address, toHooligan("100"));
    console.log("Hooligan deployed to:", hooligan.address);
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("mint", async function () {
    it("mints if minter", async function () {
      await hooligan.mint(user2.address, toHooligan("100"));
      expect(await hooligan.balanceOf(user2.address)).to.be.equal(toHooligan("100"));
    });

    it("reverts if not minter", async function () {
      await expect(hooligan.connect(user).mint(user2.address, toHooligan("100"))).to.be.revertedWith("!Minter");
    });
  });

  describe("permit", async function () {
    before(async function () {
      // signERC2612Permit: (provider: any, token: string | Domain, owner: string, spender: string, value?: string | number, deadline?: number | undefined, nonce?: number | undefined) => Promise<ERC2612PermitMessage & RSV>;
      result = await signERC2612Permit(ethers.provider, hooligan.address, user.address, owner.address, "10000000");

      fakeResult = await signERC2612Permit(ethers.provider, user.address, user.address, owner.address, "10000000");

      endedResult = await signERC2612Permit(ethers.provider, user.address, user.address, owner.address, "10000000", "1");
    });

    it("revert if fake permit", async function () {
      await expect(
        hooligan
          .connect(user)
          .permit(user.address, owner.address, toHooligan("10"), fakeResult.deadline, fakeResult.v, fakeResult.r, fakeResult.s)
      ).to.be.revertedWith("ERC20Permit: invalid signature");
    });

    it("revert when too much", async function () {
      await hooligan.connect(user).permit(user.address, owner.address, toHooligan("10"), result.deadline, result.v, result.r, result.s);

      await expect(hooligan.connect(owner).transferFrom(user.address, user2.address, toHooligan("20"))).to.be.revertedWith(
        "ERC20: transfer amount exceeds allowance"
      );
    });

    it("revert deadline passed", async function () {
      await expect(
        hooligan
          .connect(user)
          .permit(user.address, owner.address, toHooligan("10"), endedResult.deadline, endedResult.v, endedResult.r, endedResult.s)
      ).to.be.revertedWith("ERC20Permit: expired deadline");
    });

    it("transfers all", async function () {
      await hooligan.connect(user).permit(user.address, owner.address, toHooligan("10"), result.deadline, result.v, result.r, result.s);
      await hooligan.connect(owner).transferFrom(user.address, user2.address, toHooligan("10"));

      expect(await hooligan.balanceOf(user2.address)).to.be.equal(toHooligan("10"));
      expect(await hooligan.balanceOf(user.address)).to.be.equal(toHooligan("90"));
    });

    it("transfers some", async function () {
      await hooligan.connect(user).permit(user.address, owner.address, toHooligan("10"), result.deadline, result.v, result.r, result.s);
      await hooligan.connect(owner).transferFrom(user.address, user2.address, toHooligan("5"));

      expect(await hooligan.balanceOf(user2.address)).to.be.equal(toHooligan("5"));
      expect(await hooligan.balanceOf(user.address)).to.be.equal(toHooligan("95"));
      expect(await hooligan.allowance(user.address, owner.address)).to.be.equal(toHooligan("5"));
    });
  });
});
