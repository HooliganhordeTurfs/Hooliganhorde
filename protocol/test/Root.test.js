const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { readPrune, toBN, signFirmDepositTokenPermit, signFirmDepositTokensPermit, signTokenPermit } = require("../utils");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const {
  HOOLIGAN,
  THREE_POOL,
  HOOLIGAN_3_CURVE,
  UNRIPE_LP,
  UNRIPE_HOOLIGAN,
  THREE_CURVE,
  STABLE_FACTORY,
  ZERO_ADDRESS
} = require("./utils/constants");
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

describe("Root", function () {
  before(async function () {
    pru = await readPrune();
    [owner, user, user2, user3] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    user3Address = user3.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.tokenFacet = await ethers.getContractAt("TokenFacet", this.diamond.address);

    this.firm = await ethers.getContractAt("MockFirmFacet", this.diamond.address);

    this.tokenFacet = await ethers.getContractAt("TokenFacet", this.diamond.address);

    this.unripe = await ethers.getContractAt("MockUnripeFacet", this.diamond.address);

    this.firmToken = await ethers.getContractAt("MockToken", HOOLIGAN);

    const FirmToken = await ethers.getContractFactory("MockToken");

    this.firmToken2 = await FirmToken.deploy("Firm", "FIRM");
    await this.firmToken2.deployed();

    await this.firm.mockWhitelistToken(this.firmToken.address, this.firm.interface.getSighash("mockBDV(uint256 amount)"), "10000", "1");

    const RootToken = await ethers.getContractFactory("Root", {
      signer: owner
    });
    this.rootToken = await upgrades.deployProxy(RootToken, ["Root", "ROOT"], {
      initializer: "initialize"
    });
    await this.firmToken.deployed();

    await this.gameday.firmActuation(0);
    await this.firmToken.connect(user).approve(this.firm.address, to6("100000000000"));
    await this.firmToken.connect(user2).approve(this.firm.address, to6("100000000000"));
    await this.firmToken.connect(user3).approve(this.firm.address, to6("100000000000"));
    await this.firmToken.mint(userAddress, to6("10000"));
    await this.firmToken.mint(user2Address, to6("10000"));
    await this.firmToken.mint(user3Address, to6("10000"));
    await this.firmToken2.connect(user).approve(this.firm.address, "100000000000");
    await this.firmToken2.mint(userAddress, "10000");

    await this.firmToken.connect(owner).approve(this.firm.address, to18("10000"));
    await this.firmToken.mint(ownerAddress, to18("10000"));
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("init", function () {
    it("check if init value set correctly", async function () {
      expect(await this.rootToken.connect(user).HOOLIGANHORDE_ADDRESS()).to.be.equal(this.diamond.address);

      expect(await this.rootToken.connect(user).name()).to.be.equal("Root");

      expect(await this.rootToken.connect(user).symbol()).to.be.equal("ROOT");
    });
  });

  describe("ownership", function () {
    describe("renounce", async function () {
      describe("reverts", async function () {
        it("reverts if not owner try to renounce", async function () {
          await expect(this.rootToken.connect(user).renounceOwnership()).to.revertedWith("Ownable: caller is not the owner");
        });
        it("reverts if owner try to renounce", async function () {
          await expect(this.rootToken.connect(owner).renounceOwnership()).to.revertedWith("Ownable: Can't renounceOwnership here");
        });
      });
    });

    describe("transfer", async function () {
      describe("reverts", async function () {
        it("reverts if not owner", async function () {
          await expect(this.rootToken.connect(user).transferOwnership(user.address)).to.revertedWith("Ownable: caller is not the owner");
        });

        it("reverts if transfer ownership to a zero address", async function () {
          await expect(this.rootToken.connect(owner).transferOwnership(ZERO_ADDRESS)).to.revertedWith(
            "Ownable: Non-zero owner address required"
          );
        });
      });

      describe("transfers owner", async function () {
        beforeEach(async function () {
          await this.rootToken.connect(owner).transferOwnership(user.address);
        });

        it("property update ownerCandidate", async function () {
          expect(await this.rootToken.ownerCandidate()).to.be.eq(user.address);
        });
      });
    });

    describe("claim", async function () {
      describe("reverts", async function () {
        it("reverts if not a candidate", async function () {
          await expect(this.rootToken.connect(user).claimOwnership()).to.revertedWith(
            "Ownable: sender must be ownerCandidate to accept ownership"
          );
        });
      });

      describe("claims ownership", async function () {
        beforeEach(async function () {
          await this.rootToken.connect(owner).transferOwnership(user.address);
          await this.rootToken.connect(user).claimOwnership();
        });
        it("property update ownership", async function () {
          expect(await this.rootToken.owner()).to.be.eq(user.address);
        });
        it("property update ownerCandidate", async function () {
          expect(await this.rootToken.ownerCandidate()).to.be.eq(ZERO_ADDRESS);
        });
      });
    });
  });

  describe("whitelist", async function () {
    describe("reverts", async function () {
      it("reverts if non-owner add token", async function () {
        await expect(this.rootToken.connect(user).addWhitelistToken(this.firmToken.address)).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("reverts if adding zero address token", async function () {
        await expect(this.rootToken.connect(owner).addWhitelistToken(ZERO_ADDRESS)).to.revertedWith("Non-zero token address required");
      });

      it("reverts if removing zero address token", async function () {
        await expect(this.rootToken.connect(owner).removeWhitelistToken(ZERO_ADDRESS)).to.revertedWith("Non-zero token address required");
      });

      it("reverts if non-owner remove token", async function () {
        await expect(this.rootToken.connect(user).removeWhitelistToken(this.firmToken.address)).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });
    describe("add token", async function () {
      beforeEach(async function () {
        this.result = await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);
      });

      it("property add token to whitelist", async function () {
        expect(await this.rootToken.connect(user).whitelisted(this.firmToken.address)).to.be.eq(true);
      });

      it("emits AddWhitelistToken event", async function () {
        await expect(this.result).to.emit(this.rootToken, "AddWhitelistToken").withArgs(this.firmToken.address);
      });
    });

    describe("remove token", async function () {
      beforeEach(async function () {
        await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

        this.result = await this.rootToken.connect(owner).removeWhitelistToken(this.firmToken.address);
      });

      it("property remove token from whitelist", async function () {
        expect(await this.rootToken.connect(user).whitelisted(this.firmToken.address)).to.be.equal(false);
      });

      it("emits RemoveWhitelistToken event", async function () {
        await expect(this.result).to.emit(this.rootToken, "RemoveWhitelistToken").withArgs(this.firmToken.address);
      });
    });
  });

  describe("earn", async function () {
    beforeEach(async function () {
      await this.firm.connect(user).approveDeposit(this.rootToken.address, this.firmToken.address, "1000000");

      await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

      await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

      this.result = await this.rootToken.connect(user).mint(
        [
          {
            token: this.firmToken.address,
            gamedays: ["2"],
            amounts: ["1000"]
          }
        ],
        EXTERNAL,
        1
      );

      await this.gameday.fastForward(48);
      await this.gameday.firmActuation(100);

      await this.rootToken.connect(user).earn();
    });

    it("properly updates underlyingBdv", async function () {
      expect(await this.rootToken.underlyingBdv()).to.eq("1100");
    });

    it("properly updates balances", async function () {
      const deposit = await this.firm.getDeposit(this.rootToken.address, this.firmToken.address, 51);
      expect(deposit[0]).to.eq("100");
      expect(deposit[1]).to.eq("100");
    });
  });

  describe("updateBdv", async function () {
    beforeEach(async function () {
      await this.firm.connect(user).approveDeposit(this.rootToken.address, this.firmToken.address, "1000000");

      await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

      await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

      this.result = await this.rootToken.connect(user).mint(
        [
          {
            token: this.firmToken.address,
            gamedays: ["2"],
            amounts: ["1000"]
          }
        ],
        EXTERNAL,
        1
      );

      await this.gameday.fastForward(48);
      await this.gameday.firmActuation(100);
    });

    describe("reverts", async function () {
      it("reverts if token is a zero address", async function () {
        await expect(this.rootToken.updateBdv(ZERO_ADDRESS, 22)).to.revertedWith("Bdv: Non-zero token address required");
      });
      it("reverts if convert non-deposited gameday", async function () {
        await expect(this.rootToken.updateBdv(this.firmToken.address, 22)).to.revertedWith("Convert: BDV or amount is 0.");
      });
    });

    describe("single convert p = 1", async function () {
      it("properly updates underlyingBdv", async function () {
        await this.rootToken.updateBdv(this.firmToken.address, 2);
        expect(await this.rootToken.underlyingBdv()).to.eq("1000");
      });
    });

    describe("single convert", async function () {
      it("properly updates underlyingBdv", async function () {
        await this.firm.mockWhitelistToken(
          this.firmToken.address,
          this.firm.interface.getSighash("mockBDVIncrease(uint256 amount)"),
          "10000",
          "1"
        );
        await this.rootToken.updateBdv(this.firmToken.address, 2);
        expect(await this.rootToken.underlyingBdv()).to.eq("1500");
      });
    });

    describe("multiple convert", async function () {
      it("properly updates underlyingBdv", async function () {
        await this.firm.mockWhitelistToken(
          this.firmToken.address,
          this.firm.interface.getSighash("mockBDVIncrease(uint256 amount)"),
          "10000",
          "1"
        );
        await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

        this.result = await this.rootToken.connect(user).mint(
          [
            {
              token: this.firmToken.address,
              gamedays: ["51"],
              amounts: ["1000"]
            }
          ],
          EXTERNAL,
          1
        );
        await this.rootToken.updateBdvs([this.firmToken.address], [2, 51]);
        expect(await this.rootToken.underlyingBdv()).to.eq("3000");
      });
    });
  });

  describe("redeem", async function () {
    describe("redeem", async function () {
      describe("reverts", async function () {
        beforeEach(async function () {
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
        });
        it("reverts if token is not whitelisted", async function () {
          await expect(
            this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1000000000
            )
          ).to.revertedWith("Token is not whitelisted");
        });

        it("reverts if contract does not have enough deposit to redeem", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await this.rootToken.connect(user).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ],
            EXTERNAL,
            1,
            this.signature.token,
            this.signature.value,
            this.signature.deadline,
            this.signature.split.v,
            this.signature.split.r,
            this.signature.split.s
          );

          await expect(
            this.rootToken.connect(user2).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["2000"]
                }
              ],
              EXTERNAL,
              1000000000
            )
          ).to.revertedWith("Firm: Crate balance too low.");
        });

        it("reverts if user does not have sufficient balance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await this.rootToken.connect(user).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ],
            EXTERNAL,
            1,
            this.signature.token,
            this.signature.value,
            this.signature.deadline,
            this.signature.split.v,
            this.signature.split.r,
            this.signature.split.s
          );

          await expect(
            this.rootToken.connect(user2).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            )
          ).to.revertedWith("ERC20: burn amount exceeds balance");
        });

        it("reverts if user does not have sufficient balance in farm balance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await this.rootToken.connect(user).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ],
            EXTERNAL,
            1,
            this.signature.token,
            this.signature.value,
            this.signature.deadline,
            this.signature.split.v,
            this.signature.split.r,
            this.signature.split.s
          );

          await expect(
            this.rootToken.connect(user2).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL,
              "100000000000000000"
            )
          ).to.revertedWith("Balance: Insufficient internal balance");
        });

        it("reverts if user does not have sufficient balance in farm balance tolerant", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await this.rootToken.connect(user).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ],
            EXTERNAL,
            1,
            this.signature.token,
            this.signature.value,
            this.signature.deadline,
            this.signature.split.v,
            this.signature.split.r,
            this.signature.split.s
          );

          await expect(
            this.rootToken.connect(user2).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL_TOLERANT,
              "100000000000000000"
            )
          ).to.revertedWith("ERC20: burn amount exceeds balance");
        });

        it("reverts if user does not have sufficient allowance for root contract", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await this.rootToken.connect(user).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ],
            INTERNAL,
            1,
            this.signature.token,
            this.signature.value,
            this.signature.deadline,
            this.signature.split.v,
            this.signature.split.r,
            this.signature.split.s
          );

          await expect(
            this.rootToken.connect(user2).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL_EXTERNAL,
              "100000000000000000"
            )
          ).to.revertedWith("ERC20: burn amount exceeds balance");
        });

        it("reverts if amounts is empty", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          await expect(
            this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: [],
                  amounts: []
                }
              ],
              EXTERNAL,
              1000000000
            )
          ).to.revertedWith("Firm: amounts array is empty");
        });

        it("reverts if redeem shares greater than maxRootsIn", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await this.rootToken.connect(user).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ],
            EXTERNAL,
            1,
            this.signature.token,
            this.signature.value,
            this.signature.deadline,
            this.signature.split.v,
            this.signature.split.r,
            this.signature.split.s
          );

          await expect(
            this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              "900000000000000"
            )
          ).to.revertedWith("Redeem: shares is greater than maxRootsIn");
        });

        it("reverts if redeem more than owned shares", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);
          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );
          await this.rootToken.connect(user).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ],
            EXTERNAL,
            1,
            this.signature.token,
            this.signature.value,
            this.signature.deadline,
            this.signature.split.v,
            this.signature.split.r,
            this.signature.split.s
          );

          await this.gameday.fastForward(100);

          await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

          const nonce2 = await this.firm.connect(user2).depositPermitNonces(user2Address);

          this.signature2 = await signFirmDepositTokenPermit(
            user2,
            user2Address,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce2
          );
          await this.rootToken.connect(user2).mintWithTokenPermit(
            [
              {
                token: this.firmToken.address,
                gamedays: ["102"],
                amounts: ["1000"]
              }
            ],
            EXTERNAL,
            1,
            this.signature2.token,
            this.signature2.value,
            this.signature2.deadline,
            this.signature2.split.v,
            this.signature2.split.r,
            this.signature2.split.s
          );
          await expect(
            this.rootToken.connect(user2).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2", "102"],
                  amounts: ["1000", "1000"]
                }
              ],
              EXTERNAL,
              "90000000000000000"
            )
          ).to.be.revertedWith("ERC20: burn amount exceeds balance");
        });
      });

      describe("start redeem", async function () {
        beforeEach(async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);

          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "50000",
            nonce
          );
          const nonce2 = await this.firm.connect(user2).depositPermitNonces(user2Address);
          this.signature2 = await signFirmDepositTokenPermit(
            user2,
            user2Address,
            this.rootToken.address,
            this.firmToken.address,
            "50000",
            nonce2
          );
          const nonce3 = await this.firm.connect(user3).depositPermitNonces(user3Address);
          this.signature3 = await signFirmDepositTokenPermit(
            user3,
            user3Address,
            this.rootToken.address,
            this.firmToken.address,
            "50000",
            nonce3
          );
        });

        describe("empty redeem no existings deposit", async function () {
          beforeEach(async function () {
            this.result = await this.rootToken.connect(user).redeem([], EXTERNAL, "100000000000000000");
          });

          it("properly updates the root total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("0");
          });

          it("emits Redeem event", async function () {
            await expect(this.result).to.emit(this.rootToken, "Redeem").withArgs(user.address, [], "0", "0", "0", "0");
          });
        });

        describe("redeem original deposit in same gameday and burn token from internal balance", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.tokenFacet.connect(user).approveToken(this.rootToken.address, this.rootToken.address, "1000000000000000");

            await this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10000000");
            expect(await this.tokenFacet.getInternalBalance(userAddress, this.rootToken.address)).to.eq("0");
          });
        });

        describe("redeem original deposit in same gameday and burn token from internal balance with permit", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            const nonce = await this.tokenFacet.connect(user).tokenPermitNonces(userAddress);

            const sig = await signTokenPermit(user, userAddress, this.rootToken.address, this.rootToken.address, "1000000000000000", nonce);

            await this.rootToken.connect(user).redeemWithFarmBalancePermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL,
              "100000000000000000",
              sig.token,
              sig.value,
              sig.deadline,
              sig.split.v,
              sig.split.r,
              sig.split.s
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10000000");
            expect(await this.tokenFacet.getInternalBalance(userAddress, this.rootToken.address)).to.eq("0");
          });
        });

        describe("redeem original deposit in same gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10000000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("0");
          });
        });

        describe("redeem original deposit at later gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.gameday.fastForward(10);

            await this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10010000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("0");
          });
        });

        describe("2 users 2 mints earliest first redeem earliest all", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.gameday.fastForward(100);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user2).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["102"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature2.token,
              this.signature2.value,
              this.signature2.deadline,
              this.signature2.split.v,
              this.signature2.split.r,
              this.signature2.split.s
            );

            await this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("990099009900991");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10100000");
            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");

            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("990099009900990");
          });
        });

        describe("2 users 2 mints. user 2 redeem own deposit", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user2).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature2.token,
              this.signature2.value,
              this.signature2.deadline,
              this.signature2.split.v,
              this.signature2.split.r,
              this.signature2.split.s
            );

            await this.rootToken.connect(user2).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("10000000");

            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("0");
          });
        });

        describe("2 mints earliest first redeem all", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.gameday.fastForward(100);

            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["102"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1
            );

            await this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2", "102"],
                  amounts: ["1000", "1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("20100000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("0");
          });
        });

        describe("2 mints earliest last redeem earliest all", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(100);
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["102"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1
            );

            await this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("995024875621891");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10100000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("995024875621891");
          });
        });

        describe("2 mints earliest last redeem all", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(100);

            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
            await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["102"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );

            await this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1
            );

            await this.rootToken.connect(user).redeem(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2", "102"],
                  amounts: ["1000", "1000"]
                }
              ],
              EXTERNAL,
              "100000000000000000"
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("20100000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("0");
          });
        });
      });
    });
  });

  describe("mint", async function () {
    describe("mints", async function () {
      describe("reverts", async function () {
        beforeEach(async function () {
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
        });
        it("reverts if token is not whitelisted", async function () {
          await expect(
            this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1
            )
          ).to.revertedWith("Token is not whitelisted");
        });

        it("reverts if insufficient balance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          await this.firm.connect(user).approveDeposit(this.rootToken.address, this.firmToken.address, "5000");

          await expect(
            this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["2000"]
                }
              ],
              EXTERNAL,
              1
            )
          ).to.revertedWith("Firm: Crate balance too low.");
        });

        it("reverts if insufficient allowance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          await expect(
            this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1
            )
          ).to.revertedWith("Firm: insufficient allowance");
        });

        it("reverts if amounts is empty", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          await expect(
            this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: [],
                  amounts: []
                }
              ],
              EXTERNAL,
              1
            )
          ).to.revertedWith("Firm: amounts array is empty");
        });

        it("reverts if mint shares is less than minRootsOut", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          await this.firm.connect(user).approveDeposit(this.rootToken.address, this.firmToken.address, "5000");

          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

          await expect(this.rootToken.connect(user).mint([], EXTERNAL, 1000000000000001)).to.revertedWith(
            "Mint: shares is less than minRootsOut"
          );
        });
      });

      describe("start", async function () {
        beforeEach(async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          await this.firm.connect(user).approveDeposit(this.rootToken.address, this.firmToken.address, "5000");

          await this.firm.connect(user2).approveDeposit(this.rootToken.address, this.firmToken.address, "5000");

          await this.firm.connect(user3).approveDeposit(this.rootToken.address, this.firmToken.address, "5000");
        });

        describe("empty mint", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.result = await this.rootToken.connect(user).mint([], EXTERNAL, 0);
          });

          it("properly updates the root total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10000000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("0");
          });

          it("emits Mint event", async function () {
            await expect(this.result).to.emit(this.rootToken, "Mint").withArgs(user.address, [], "0", "0", "0", "0");
          });
        });

        describe("mint with a single gameday with INTERNAL from mode", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              INTERNAL,
              1
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.tokenFacet.getInternalBalance(userAddress, this.rootToken.address)).to.eq("1000000000000000");
          });
        });

        describe("mint with a single gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");
          });
        });

        describe("mint with multiple same gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2", "2"],
                amounts: ["400", "500"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(this.deposits, EXTERNAL, 1);
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("900");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("9000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("900000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("900");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("100");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("1000000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("900000000000000");
          });
        });

        describe("mint with multiple different gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(5);

            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2", "7"],
                amounts: ["500", "500"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(this.deposits, EXTERNAL, 1);
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10002500");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000250000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10002500");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000250000000000");
          });
        });

        describe("2 users mint with same gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(this.deposits1, EXTERNAL, 1);

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken.connect(user2).mint(this.deposits2, EXTERNAL, 1);
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");
          });
        });

        describe("2 users mint with different gameday earliest first", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(this.deposits1, EXTERNAL, 1);

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken.connect(user2).mint(this.deposits2, EXTERNAL, 1);
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20010000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000999999999999");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1001000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("999999999999999");
          });
        });

        describe("2 users mint with different gameday earliest last", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken.connect(user2).mint(this.deposits2, EXTERNAL, 1);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(this.deposits1, EXTERNAL, 1);
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20010000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");
          });
        });

        describe("3 users mint with different gameday earliest last", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user3).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits3 = [
              {
                token: this.firmToken.address,
                gamedays: ["22"],
                amounts: ["1000"]
              }
            ];
            this.result3 = await this.rootToken.connect(user3).mint(this.deposits3, EXTERNAL, 1);

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken.connect(user2).mint(this.deposits2, EXTERNAL, 1);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(this.deposits1, EXTERNAL, 1);
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("3000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("30030000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("3000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("3000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user3Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user3Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user3Address)).to.eq("1000000000000000");
          });
        });

        describe("3 users mint with different gameday earliest first", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user3).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mint(this.deposits1, EXTERNAL, 1);

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken.connect(user2).mint(this.deposits2, EXTERNAL, 1);

            this.deposits3 = [
              {
                token: this.firmToken.address,
                gamedays: ["22"],
                amounts: ["1000"]
              }
            ];
            this.result3 = await this.rootToken.connect(user3).mint(this.deposits3, EXTERNAL, 1);
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("3000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("30030000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("3002999999999998");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("3000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1002000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000999999999999");

            expect(await this.firm.balanceOfProspects(user3Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user3Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user3Address)).to.eq("999999999999999");
          });
        });
      });
    });

    describe("deposits with token permit", async function () {
      describe("reverts", async function () {
        beforeEach(async function () {
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);
        });
        it("reverts if token is not whitelisted", async function () {
          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Token is not whitelisted");
        });

        it("reverts if insufficient balance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "2000",
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["2000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: Crate balance too low.");
        });

        it("reverts if insufficient allowance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "500",
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: insufficient allowance");
        });

        it("reverts if amounts is empty", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "500",
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: [],
                  amounts: []
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: amounts array is empty");
        });

        it("reverts if invalid permit", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokenPermit(user, userAddress, user2Address, this.firmToken.address, "1000", nonce);

          await expect(
            this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: permit invalid signature");
        });

        it("reverts if deadline expired", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);

          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce,
            100
          );

          await expect(
            this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: permit expired deadline");
        });

        it("reverts if deposit is empty", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);

          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "1000",
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: [],
                  amounts: []
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: amounts array is empty");
        });
      });
      describe("start", async function () {
        beforeEach(async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);

          this.signature = await signFirmDepositTokenPermit(
            user,
            userAddress,
            this.rootToken.address,
            this.firmToken.address,
            "5000",
            nonce
          );
          const nonce2 = await this.firm.connect(user2).depositPermitNonces(user2Address);
          this.signature2 = await signFirmDepositTokenPermit(
            user2,
            user2Address,
            this.rootToken.address,
            this.firmToken.address,
            "5000",
            nonce2
          );
          const nonce3 = await this.firm.connect(user3).depositPermitNonces(user3Address);
          this.signature3 = await signFirmDepositTokenPermit(
            user3,
            user3Address,
            this.rootToken.address,
            this.firmToken.address,
            "5000",
            nonce3
          );
        });

        describe("mint with a single gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mintWithTokenPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.token,
              this.signature.value,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");
          });
        });

        describe("mint with multiple same gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposit = {
              token: this.firmToken.address,
              gamedays: ["2", "2"],
              amounts: ["400", "500"]
            };
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokenPermit(
                [this.deposit],
                EXTERNAL,
                1,
                this.signature.token,
                this.signature.value,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("900");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("9000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("900000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("900");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("100");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("1000000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("900000000000000");
          });
        });

        describe("mint with multiple different gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(5);

            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposit = {
              token: this.firmToken.address,
              gamedays: ["2", "7"],
              amounts: ["500", "500"]
            };
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokenPermit(
                [this.deposit],
                EXTERNAL,
                1,
                this.signature.token,
                this.signature.value,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10002500");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000250000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10002500");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000250000000000");
          });
        });

        describe("2 users mint with same gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposit1 = {
              token: this.firmToken.address,
              gamedays: ["2"],
              amounts: ["1000"]
            };

            this.result = await this.rootToken
              .connect(user)
              .mintWithTokenPermit(
                [this.deposit1],
                EXTERNAL,
                1,
                this.signature.token,
                this.signature.value,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );

            this.deposit2 = {
              token: this.firmToken.address,
              gamedays: ["2"],
              amounts: ["1000"]
            };
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokenPermit(
                [this.deposit2],
                EXTERNAL,
                1,
                this.signature2.token,
                this.signature2.value,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");
          });
        });

        describe("2 users mint with different gameday earliest first", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposit1 = {
              token: this.firmToken.address,
              gamedays: ["2"],
              amounts: ["1000"]
            };
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokenPermit(
                [this.deposit1],
                EXTERNAL,
                1,
                this.signature.token,
                this.signature.value,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );

            this.deposit2 = {
              token: this.firmToken.address,
              gamedays: ["12"],
              amounts: ["1000"]
            };
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokenPermit(
                [this.deposit2],
                EXTERNAL,
                1,
                this.signature2.token,
                this.signature2.value,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20010000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000999999999999");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1001000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("999999999999999");
          });
        });

        describe("2 users mint with different gameday earliest last", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposit2 = {
              token: this.firmToken.address,
              gamedays: ["12"],
              amounts: ["1000"]
            };
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokenPermit(
                [this.deposit2],
                EXTERNAL,
                1,
                this.signature2.token,
                this.signature2.value,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );
            this.deposit1 = {
              token: this.firmToken.address,
              gamedays: ["2"],
              amounts: ["1000"]
            };
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokenPermit(
                [this.deposit1],
                EXTERNAL,
                1,
                this.signature.token,
                this.signature.value,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20010000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");
          });
        });

        describe("3 users mint with different gameday earliest last", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user3).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposit3 = {
              token: this.firmToken.address,
              gamedays: ["22"],
              amounts: ["1000"]
            };
            this.result3 = await this.rootToken
              .connect(user3)
              .mintWithTokenPermit(
                [this.deposit3],
                EXTERNAL,
                1,
                this.signature3.token,
                this.signature3.value,
                this.signature3.deadline,
                this.signature3.split.v,
                this.signature3.split.r,
                this.signature3.split.s
              );

            this.deposit2 = {
              token: this.firmToken.address,
              gamedays: ["12"],
              amounts: ["1000"]
            };
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokenPermit(
                [this.deposit2],
                EXTERNAL,
                1,
                this.signature2.token,
                this.signature2.value,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );

            this.deposit1 = {
              token: this.firmToken.address,
              gamedays: ["2"],
              amounts: ["1000"]
            };
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokenPermit(
                [this.deposit1],
                EXTERNAL,
                1,
                this.signature.token,
                this.signature.value,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("3000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("30030000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("3000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("3000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user3Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user3Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user3Address)).to.eq("1000000000000000");
          });
        });

        describe("3 users mint with different gameday earliest first", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user3).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposit1 = {
              token: this.firmToken.address,
              gamedays: ["2"],
              amounts: ["1000"]
            };
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokenPermit(
                [this.deposit1],
                EXTERNAL,
                1,
                this.signature.token,
                this.signature.value,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );

            this.deposit2 = {
              token: this.firmToken.address,
              gamedays: ["12"],
              amounts: ["1000"]
            };
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokenPermit(
                [this.deposit2],
                EXTERNAL,
                1,
                this.signature2.token,
                this.signature2.value,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );

            this.deposit3 = {
              token: this.firmToken.address,
              gamedays: ["22"],
              amounts: ["1000"]
            };
            this.result3 = await this.rootToken
              .connect(user3)
              .mintWithTokenPermit(
                [this.deposit3],
                EXTERNAL,
                1,
                this.signature3.token,
                this.signature3.value,
                this.signature3.deadline,
                this.signature3.split.v,
                this.signature3.split.r,
                this.signature3.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("3000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("30030000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("3002999999999998");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("3000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1002000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000999999999999");

            expect(await this.firm.balanceOfProspects(user3Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user3Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user3Address)).to.eq("999999999999999");
          });
        });
      });
    });

    describe("mint with tokens permit", async function () {
      describe("reverts", async function () {
        it("reverts if token is not whitelisted", async function () {
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);

          this.signature = await signFirmDepositTokensPermit(
            user,
            userAddress,
            this.rootToken.address,
            [this.firmToken.address],
            ["1000"],
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Token is not whitelisted");
        });

        it("reverts if insufficient balance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokensPermit(
            user,
            userAddress,
            this.rootToken.address,
            [this.firmToken.address],
            ["2000"],
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["2000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: Crate balance too low.");
        });

        it("reverts if insufficient allowance", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);
          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokensPermit(
            user,
            userAddress,
            this.rootToken.address,
            [this.firmToken.address],
            ["500"],
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: insufficient allowance");
        });

        it("reverts if amounts is empty", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokensPermit(
            user,
            userAddress,
            this.rootToken.address,
            [this.firmToken.address],
            ["500"],
            nonce
          );

          await expect(
            this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: [],
                  amounts: []
                }
              ],
              EXTERNAL,
              1,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: amounts array is empty");
        });

        it("reverts if invalid permit", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokensPermit(user, userAddress, user2Address, [this.firmToken.address], ["1000"], nonce);

          await expect(
            this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: permit invalid signature");
        });

        it("reverts if deadline expired", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);

          this.signature = await signFirmDepositTokensPermit(
            user,
            userAddress,
            this.rootToken.address,
            [this.firmToken.address],
            ["1000"],
            nonce,
            100
          );

          await expect(
            this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Firm: permit expired deadline");
        });

        it("reverts if mint shares is less than minRootsOut", async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokensPermit(
            user,
            userAddress,
            this.rootToken.address,
            [this.firmToken.address],
            ["5000"],
            nonce
          );

          await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

          await expect(
            this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000"]
                }
              ],
              EXTERNAL,
              1000000000000001,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            )
          ).to.revertedWith("Mint: shares is less than minRootsOut");
        });
      });

      describe("start", async function () {
        beforeEach(async function () {
          await this.rootToken.connect(owner).addWhitelistToken(this.firmToken.address);

          const nonce = await this.firm.connect(user).depositPermitNonces(userAddress);
          this.signature = await signFirmDepositTokensPermit(
            user,
            userAddress,
            this.rootToken.address,
            [this.firmToken.address],
            ["5000000000"],
            nonce
          );
          const nonce2 = await this.firm.connect(user2).depositPermitNonces(user2Address);
          this.signature2 = await signFirmDepositTokensPermit(
            user2,
            user2Address,
            this.rootToken.address,
            [this.firmToken.address],
            ["5000"],
            nonce2
          );
          const nonce3 = await this.firm.connect(user3).depositPermitNonces(user3Address);
          this.signature3 = await signFirmDepositTokensPermit(
            user3,
            user3Address,
            this.rootToken.address,
            [this.firmToken.address],
            ["5000"],
            nonce3
          );
        });

        describe("empty mint", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                [],
                EXTERNAL,
                0,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the root total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("0");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("0");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("0");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10000000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("0");
          });

          it("emits Mint event", async function () {
            await expect(this.result).to.emit(this.rootToken, "Mint").withArgs(user.address, [], "0", "0", "0", "0");
          });
        });

        describe("mint with a single gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000000000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000000000"]
              }
            ];
            this.result = await this.rootToken.connect(user).mintWithTokensPermit(
              [
                {
                  token: this.firmToken.address,
                  gamedays: ["2"],
                  amounts: ["1000000000"]
                }
              ],
              EXTERNAL,
              1,
              this.signature.tokens,
              this.signature.values,
              this.signature.deadline,
              this.signature.split.v,
              this.signature.split.r,
              this.signature.split.s
            );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000000000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10000000000000");
          });

          it("properly updates the bdvPerRoot", async function () {
            expect(await this.rootToken.bdvPerRoot()).to.eq("1000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000000000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000000000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000000000");
          });
        });

        describe("mint with multiple same gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2", "2"],
                amounts: ["400", "500"]
              }
            ];
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                this.deposits,
                EXTERNAL,
                1,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("900");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("9000000");
          });

          it("properly updates the bdvPerRoot", async function () {
            expect(await this.rootToken.bdvPerRoot()).to.eq("1000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("900000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("900");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("100");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("1000000");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("900000000000000");
          });
        });

        describe("mint with multiple different gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(5);

            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits = [
              {
                token: this.firmToken.address,
                gamedays: ["2", "7"],
                amounts: ["500", "500"]
              }
            ];
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                this.deposits,
                EXTERNAL,
                1,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("10002500");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("1000250000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("1000");
          });

          it("properly updates the user balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("1000");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("10002500");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000250000000000");
          });
        });

        describe("2 users mint with same gameday", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                this.deposits1,
                EXTERNAL,
                1,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokensPermit(
                this.deposits2,
                EXTERNAL,
                1,
                this.signature2.tokens,
                this.signature2.values,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20000000");
          });

          it("properly updates the bdvPerRoot", async function () {
            expect(await this.rootToken.bdvPerRoot()).to.eq("1000000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");
          });
        });

        describe("2 users mint with different gameday earliest first", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                this.deposits1,
                EXTERNAL,
                1,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokensPermit(
                this.deposits2,
                EXTERNAL,
                1,
                this.signature2.tokens,
                this.signature2.values,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20010000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000999999999999");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1001000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("999999999999999");
          });
        });

        describe("2 users mint with different gameday earliest last", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokensPermit(
                this.deposits2,
                EXTERNAL,
                1,
                this.signature2.tokens,
                this.signature2.values,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );
            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                this.deposits1,
                EXTERNAL,
                1,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("2000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("20010000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("2000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("2000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");
          });
        });

        describe("3 users mint with different gameday earliest last", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user3).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits3 = [
              {
                token: this.firmToken.address,
                gamedays: ["22"],
                amounts: ["1000"]
              }
            ];
            this.result3 = await this.rootToken
              .connect(user3)
              .mintWithTokensPermit(
                this.deposits3,
                EXTERNAL,
                1,
                this.signature3.tokens,
                this.signature3.values,
                this.signature3.deadline,
                this.signature3.split.v,
                this.signature3.split.r,
                this.signature3.split.s
              );

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokensPermit(
                this.deposits2,
                EXTERNAL,
                1,
                this.signature2.tokens,
                this.signature2.values,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                this.deposits1,
                EXTERNAL,
                1,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("3000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("30030000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("3000000000000000");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("3000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000000000000000");

            expect(await this.firm.balanceOfProspects(user3Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user3Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user3Address)).to.eq("1000000000000000");
          });
        });

        describe("3 users mint with different gameday earliest first", async function () {
          beforeEach(async function () {
            await this.firm.connect(user).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user2).deposit(this.firmToken.address, "1000", EXTERNAL);

            await this.gameday.fastForward(10);

            await this.firm.connect(user3).deposit(this.firmToken.address, "1000", EXTERNAL);

            this.deposits1 = [
              {
                token: this.firmToken.address,
                gamedays: ["2"],
                amounts: ["1000"]
              }
            ];
            this.result = await this.rootToken
              .connect(user)
              .mintWithTokensPermit(
                this.deposits1,
                EXTERNAL,
                1,
                this.signature.tokens,
                this.signature.values,
                this.signature.deadline,
                this.signature.split.v,
                this.signature.split.r,
                this.signature.split.s
              );

            this.deposits2 = [
              {
                token: this.firmToken.address,
                gamedays: ["12"],
                amounts: ["1000"]
              }
            ];
            this.result2 = await this.rootToken
              .connect(user2)
              .mintWithTokensPermit(
                this.deposits2,
                EXTERNAL,
                1,
                this.signature2.tokens,
                this.signature2.values,
                this.signature2.deadline,
                this.signature2.split.v,
                this.signature2.split.r,
                this.signature2.split.s
              );

            this.deposits3 = [
              {
                token: this.firmToken.address,
                gamedays: ["22"],
                amounts: ["1000"]
              }
            ];
            this.result3 = await this.rootToken
              .connect(user3)
              .mintWithTokensPermit(
                this.deposits3,
                EXTERNAL,
                1,
                this.signature3.tokens,
                this.signature3.values,
                this.signature3.deadline,
                this.signature3.split.v,
                this.signature3.split.r,
                this.signature3.split.s
              );
          });

          it("properly updates the total balances on root", async function () {
            expect(await this.firm.balanceOfProspects(this.rootToken.address)).to.eq("3000");
            expect(await this.firm.balanceOfHorde(this.rootToken.address)).to.eq("30030000");
          });

          it("correctly update total supply", async function () {
            expect(await this.rootToken.totalSupply()).to.be.eq("3002999999999998");
          });

          it("correctly update underlyingBdv", async function () {
            expect(await this.rootToken.underlyingBdv()).to.be.eq("3000");
          });

          it("properly updates the users balance", async function () {
            expect(await this.firm.balanceOfProspects(userAddress)).to.eq("0");
            expect(await this.firm.balanceOfHorde(userAddress)).to.eq("0");
            expect(await this.rootToken.balanceOf(userAddress)).to.eq("1002000000000000");

            expect(await this.firm.balanceOfProspects(user2Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user2Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user2Address)).to.eq("1000999999999999");

            expect(await this.firm.balanceOfProspects(user3Address)).to.eq("0");
            expect(await this.firm.balanceOfHorde(user3Address)).to.eq("0");
            expect(await this.rootToken.balanceOf(user3Address)).to.eq("999999999999999");
          });
        });
      });
    });
  });
});
