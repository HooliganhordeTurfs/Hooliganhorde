const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./utils/balances.js");
const { Fixed, Dynamic } = require("./utils/priceTypes.js");
const { interpolatePoints } = require("./utils/interpolater.js");
const {
  getNumPieces,
  evaluatePolynomial,
  evaluatePolynomialIntegration,
  getAmountOrder,
  getValueArray
} = require("./utils/libPolynomialHelpers.js");

const { expect, use } = require("chai");
const { waffleChai } = require("@ethereum-waffle/chai");
use(waffleChai);
const { deploy } = require("../scripts/deploy.js");
const { HOOLIGAN, ZERO_ADDRESS } = require("./utils/constants");
const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");
const { ethers } = require("hardhat");

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
let user, user2, owner;
let userAddress, ownerAddress, user2Address;
let snapshotId;

describe("Marketplace", function () {
  let contracts;
  let provider;
  before(async function () {
    contracts = await deploy("Test", false, true);
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    provider = ethers.getDefaultProvider();

    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.field = await ethers.getContractAt("MockFieldFacet", this.diamond.address);
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.marketplace = await ethers.getContractAt("MockMarketplaceFacet", this.diamond.address);
    this.token = await ethers.getContractAt("TokenFacet", this.diamond.address);
    this.hooligan = await ethers.getContractAt("MockToken", HOOLIGAN);

    await this.hooligan.mint(userAddress, "500000");
    await this.hooligan.mint(user2Address, "500000");

    await this.gameday.firmActuation(0);

    await this.hooligan.connect(user).approve(this.field.address, "100000000000");
    await this.hooligan.connect(user2).approve(this.field.address, "100000000000");

    await this.field.incrementTotalRageE("100000");
    await this.gameday.setYieldE("0");
    await this.field.connect(user).sow("1000", "0", EXTERNAL);
    await this.field.connect(user2).sow("1000", "0", EXTERNAL);
  });

  const getHash = async function (tx) {
    let receipt = await tx.wait();
    var args = (receipt.events?.filter((x) => {
      return x.event == "CasualListingCreated";
    }))[0]?.args;
    if (args.pricingType == Dynamic) {
      return ethers.utils.solidityKeccak256(
        ["uint256", "uint256", "uint24", "uint256", "uint256", "bool", "bytes"],
        [
          args.start,
          args.amount,
          args.pricePerCasual,
          args.maxDraftableIndex,
          args.minFillAmount,
          args.mode == EXTERNAL,
          args.pricingFunction
        ]
      );
    } else if (args.minFillAmount > 0) {
      return ethers.utils.solidityKeccak256(
        ["uint256", "uint256", "uint24", "uint256", "uint256", "bool"],
        [args.start, args.amount, args.pricePerCasual, args.maxDraftableIndex, args.minFillAmount, args.mode == EXTERNAL]
      );
    } else {
      return ethers.utils.solidityKeccak256(
        ["uint256", "uint256", "uint24", "uint256", "bool"],
        [args.start, args.amount, args.pricePerCasual, args.maxDraftableIndex, args.mode == EXTERNAL]
      );
    }
  };

  const getHashFromDynamicListing = function (l) {
    //listing input must contain 'minFillAmount' param
    l[5] = l[5] == EXTERNAL;
    return ethers.utils.solidityKeccak256(["uint256", "uint256", "uint24", "uint256", "uint256", "bool", "bytes"], l);
  };

  const getHashFromListing = function (l) {
    //listing input must contain 'minFillAmount' param

    l[5] = l[5] == EXTERNAL;
    if (l[4] > 0) {
      return ethers.utils.solidityKeccak256(["uint256", "uint256", "uint24", "uint256", "uint256", "bool"], l);
    } else {
      l.splice(4, 1);
      return ethers.utils.solidityKeccak256(["uint256", "uint256", "uint24", "uint256", "bool"], l);
    }
  };

  const getOrderId = async function (tx) {
    let receipt = await tx.wait();
    let idx = (receipt.events?.filter((x) => {
      return x.event == "CasualOrderCreated";
    }))[0].args.id;
    return idx;
  };

  const staticset_16Pieces_500000 = {
    xs: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000],
    ys: [500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000]
  };

  const staticset_64Pieces_500000 = {
    xs: [
      0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000,
      21000, 22000, 23000, 24000, 25000, 26000, 27000, 28000, 29000, 30000, 31000, 32000, 33000, 34000, 35000, 36000, 37000, 38000, 39000,
      40000, 41000, 42000, 43000, 44000, 45000, 46000, 47000, 48000, 49000, 50000, 51000, 52000, 53000, 54000, 55000, 56000, 57000, 58000,
      59000, 60000, 61000, 62000, 63000
    ],
    ys: [
      500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000,
      500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000,
      500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000,
      500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000
    ]
  };

  const staticset_4Pieces_100000 = {
    xs: [0, 5000, 6000, 7000],
    ys: [100000, 100000, 100000, 100000]
  };

  const set_16Pieces = {
    xs: [100, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000],
    ys: [900000, 900000, 900000, 900000, 900000, 800000, 800000, 800000, 800000, 775000, 750000, 725000, 700000, 675000, 650000, 625000]
  };

  const set_13Pieces = {
    xs: [1000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 18000, 20000],
    ys: [1000000, 990000, 980000, 950000, 890000, 790000, 680000, 670000, 660000, 570000, 470000, 450000, 430000]
  };

  const hugeValueSet_13Pieces = {
    xs: [
      10000000000000, 50000000000000, 60000000000000, 70000000000000, 80000000000000, 90000000000000, 100000000000000, 110000000000000,
      120000000000000, 130000000000000, 140000000000000, 180000000000000, 200000000000000
    ],
    ys: [1000000, 990000, 980000, 950000, 890000, 790000, 680000, 670000, 660000, 570000, 470000, 450000, 430000]
  };

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  describe("Functions", async function () {
    describe("Piece Index Search", async function () {
      describe("4 Piece Index Search", async function () {
        beforeEach(async function () {
          this.f = interpolatePoints([100, 200, 300, 400], [0, 0, 0, 0]);
        });
        it("correctly finds interval at 0", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "0", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(0);
        });

        it("finds interval between breakpoints", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "150", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(0);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "250", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(1);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "350", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(2);
        });
        it("finds interval at breakpoints", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "100", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(0);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "200", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(1);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "300", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(2);
        });
        it("finds interval at end", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "400", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(2);
        });
        it("finds interval past end", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "401", getNumPieces(this.f.breakpoints, 4) - 1)
          ).to.be.equal(2);
        });
      });

      describe("16 Piece Index Search", async function () {
        beforeEach(async function () {
          this.f = interpolatePoints(set_16Pieces.xs, set_16Pieces.ys);
        });
        it("correctly finds interval at 0", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "0", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(0);
        });

        it("finds interval between breakpoints", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "250", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(1);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "420", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(2);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "2900", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(14);
        });
        it("finds interval at breakpoints", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "200", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(1);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "400", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(2);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "2600", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(13);
        });
        it("finds interval at end", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "3000", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(14);
        });
        it("finds interval past end", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "3001", getNumPieces(this.f.breakpoints, 16) - 1)
          ).to.be.equal(14);
        });
      });

      describe("64 Piece Index Search", async function () {
        beforeEach(async function () {
          this.f = interpolatePoints(staticset_64Pieces_500000.xs, staticset_64Pieces_500000.ys);
        });
        it("correctly finds interval at 0", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "0", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(0);
        });

        it("finds interval between breakpoints", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "1250", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(1);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "2420", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(2);
          expect(
            await this.marketplace
              .connect(user)
              .findPiecewiseIndex(this.f.packedFunction, "45500", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(45);
        });
        it("finds interval at breakpoints", async function () {
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "1000", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(1);
          expect(
            await this.marketplace.connect(user).findPiecewiseIndex(this.f.packedFunction, "2000", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(2);
          expect(
            await this.marketplace
              .connect(user)
              .findPiecewiseIndex(this.f.packedFunction, "13000", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(13);
        });
        it("finds interval at end", async function () {
          expect(
            await this.marketplace
              .connect(user)
              .findPiecewiseIndex(this.f.packedFunction, "63000", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(62);
        });
        it("finds interval past end", async function () {
          expect(
            await this.marketplace
              .connect(user)
              .findPiecewiseIndex(this.f.packedFunction, "63001", getNumPieces(this.f.breakpoints, 64) - 1)
          ).to.be.equal(62);
        });
      });
    });

    describe("Polynomial Evaluation", async function () {
      describe("Evaluate Normal Values", async function () {
        describe("evaluation at piecewise breakpoints", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(set_13Pieces.xs, set_13Pieces.ys);
          });

          it("first breakpoint", async function () {
            const x = 1000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              set_13Pieces.ys[0]
            );
          });

          it("second breakpoint", async function () {
            const x = 5000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              set_13Pieces.ys[1]
            );
          });

          it("second last breakpoint", async function () {
            var x = 18000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              set_13Pieces.ys[11]
            );
          });

          it("last breakpoint", async function () {
            const x = 20000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              set_13Pieces.ys[12]
            );
          });
        });
        describe("evaluation between piecewise breakpoints", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(set_13Pieces.xs, set_13Pieces.ys);
          });
          it("within first interval", async function () {
            const x = 2500;
            const pieceIndex = 0;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
          it("within second interval", async function () {
            const x = 5750;
            const pieceIndex = 1;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
          it("within second last interval", async function () {
            const x = 14999;
            const pieceIndex = 10;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
          it("within last interval", async function () {
            const x = 19410;
            const pieceIndex = 11;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
        });
      });

      describe("Evaluate Huge Values", async function () {
        describe("evaluation at piecewise breakpoints", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(hugeValueSet_13Pieces.xs, hugeValueSet_13Pieces.ys);
          });

          it("correctly evaluates at first breakpoint", async function () {
            const x = 10000000000000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              hugeValueSet_13Pieces.ys[0]
            );
          });

          it("correctly evaluates at second breakpoint", async function () {
            const x = 50000000000000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              hugeValueSet_13Pieces.ys[1]
            );
          });

          it("correctly evaluates at second last breakpoint", async function () {
            const x = 180000000000000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              hugeValueSet_13Pieces.ys[11]
            );
          });

          it("correctly evaluates at last breakpoint", async function () {
            const x = 200000000000000;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              hugeValueSet_13Pieces.ys[12]
            );
          });
        });
        describe("evaluation in between piecewise breakpoints", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(hugeValueSet_13Pieces.xs, hugeValueSet_13Pieces.ys);
          });
          it("correctly evaluates within first interval", async function () {
            const x = 14567200000500;
            const pieceIndex = 0;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
          it("correctly evaluates within second interval", async function () {
            const x = 59555200441200;
            const pieceIndex = 1;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
          it("correctly evaluates within second last interval", async function () {
            const x = 140567200000500;
            const pieceIndex = 10;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
          it("correctly evaluates within last interval", async function () {
            const x = 185069299999500;
            const pieceIndex = 11;
            expect(await this.marketplace.connect(user).evaluatePolynomialPiecewise(this.f.packedFunction, x)).to.be.equal(
              evaluatePolynomial(this.f, x, pieceIndex)
            );
          });
        });
      });
    });

    describe("Polynomial Integral Evaluation", async function () {
      describe("Integrate Normal Values", async function () {
        describe("correctly evaluates a single polynomial integration", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(set_13Pieces.xs, set_13Pieces.ys);
          });

          it("first interval", async function () {
            const start = 1000;
            const end = 4000;
            const pieceIndex = 0;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });

          it("second interval", async function () {
            const start = 5200;
            const end = 5999;
            const pieceIndex = 1;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });

          it("second last interval", async function () {
            const start = 14500;
            const end = 16603;
            const pieceIndex = 10;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });
          it("last interval", async function () {
            const start = 18100;
            const end = 19004;
            const pieceIndex = 11;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });
        });
      });

      describe("Integrate Huge Values", async function () {
        describe("correctly evaluates a single polynomial integration", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(hugeValueSet_13Pieces.xs, hugeValueSet_13Pieces.ys);
          });

          it("first interval", async function () {
            const start = 10000000000000;
            const end = 12000000000000;
            const pieceIndex = 0;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });

          it("second interval", async function () {
            const start = 55000000000000;
            const end = 58000000000000;
            const pieceIndex = 1;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });

          it("second last interval", async function () {
            const start = 145000000000000;
            const end = 178000000000016;
            const pieceIndex = 10;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });
          it("last interval", async function () {
            const start = 180000000000000;
            const end = 195999999999990; //this overflows easily
            const pieceIndex = 11;
            expect(
              await this.marketplace.connect(user).evaluatePolynomialIntegrationPiecewise(this.f.packedFunction, start, end)
            ).to.be.equal(evaluatePolynomialIntegration(this.f, start, end, pieceIndex));
          });
        });
      });
    });

    describe("Piecewise Polynomial Integral Evaluation", async function () {
      describe("Integrate Normal Values", async function () {
        describe("correctly evaluates a polynomial integration over two pieces", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(set_13Pieces.xs, set_13Pieces.ys);
          });

          it("first to second interval", async function () {
            const startPlaceInLine = 1000;
            const amountCasualsFromOrder = 4500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("second to third interval", async function () {
            const startPlaceInLine = 5000;
            const amountCasualsFromOrder = 1500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("fourth to fifth interval", async function () {
            const startPlaceInLine = 7000;
            const amountCasualsFromOrder = 1500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("eleventh to twelfth interval", async function () {
            const startPlaceInLine = 14000;
            const amountCasualsFromOrder = 4500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("twelfth to past last interval", async function () {
            const startPlaceInLine = 18000;
            const amountCasualsFromOrder = 4500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });
        });

        describe("correctly evaluates a polynomial integration over multiple pieces", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(set_13Pieces.xs, set_13Pieces.ys);
          });

          it("first to third interval", async function () {
            const startPlaceInLine = 1000;
            const amountCasualsFromOrder = 5500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("second to fourth interval", async function () {
            const startPlaceInLine = 5000;
            const amountCasualsFromOrder = 2500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("fourth to sixth interval", async function () {
            const startPlaceInLine = 7000;
            const amountCasualsFromOrder = 2500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("tenth to twelfth interval", async function () {
            const startPlaceInLine = 13000;
            const amountCasualsFromOrder = 5500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("eleventh to past last interval", async function () {
            const startPlaceInLine = 14000;
            const amountCasualsFromOrder = 8500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });
        });

        describe("correctly evaluates a polynomial integration over all pieces", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(set_13Pieces.xs, set_13Pieces.ys);
          });

          it("first to last interval", async function () {
            const startPlaceInLine = 1000;
            const amountCasualsFromOrder = 18500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("first to past last interval", async function () {
            const startPlaceInLine = 1000;
            const amountCasualsFromOrder = 19500;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });
        });
      });

      describe("Huge Values", async function () {
        describe("correctly evaluates a polynomial integration over two pieces", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(hugeValueSet_13Pieces.xs, hugeValueSet_13Pieces.ys);
          });

          it("first to second interval", async function () {
            const startPlaceInLine = 10000000000000;
            const amountCasualsFromOrder = 45000000000000;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("second to third interval", async function () {
            const startPlaceInLine = 50000000000000;
            const amountCasualsFromOrder = 15000000000000;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("eleventh to twelfth interval", async function () {
            const startPlaceInLine = 130000000000000;
            const amountCasualsFromOrder = 15000000000000;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });
        });

        describe("correctly evaluates a polynomial integration over multiple pieces", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(hugeValueSet_13Pieces.xs, hugeValueSet_13Pieces.ys);
          });

          it("first to third interval", async function () {
            const startPlaceInLine = 10000000000000;
            const amountCasualsFromOrder = 55000000000000;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("third to fifth interval", async function () {
            const startPlaceInLine = 60000000000000;
            const amountCasualsFromOrder = 25000000000000;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });

          it("eleventh to last interval", async function () {
            const startPlaceInLine = 130000000000000;
            const amountCasualsFromOrder = 55000000000000;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });
        });

        describe("correctly evaluates a polynomial integration over all pieces", async function () {
          beforeEach(async function () {
            this.f = interpolatePoints(hugeValueSet_13Pieces.xs, hugeValueSet_13Pieces.ys);
          });

          it("first to last interval", async function () {
            const startPlaceInLine = 10000000000000;
            const amountCasualsFromOrder = 185000000000000;
            const orderHooliganAmount = getAmountOrder(this.f, startPlaceInLine, amountCasualsFromOrder);
            expect(
              await this.marketplace
                .connect(user)
                .getAmountHooligansToFillOrderV2(startPlaceInLine, amountCasualsFromOrder, this.f.packedFunction)
            ).to.be.equal(orderHooliganAmount);
          });
        });
      });
    });
  });

  describe("Casual Listings", async function () {
    describe("Fixed Price", async function () {
      describe("Create", async function () {
        it("Fails to List Unowned Turf", async function () {
          await expect(
            this.marketplace.connect(user).createCasualListing("5000", "0", "1000", "100000", "0", "0", INTERNAL)
          ).to.be.revertedWith("Marketplace: Invalid Turf/Amount.");
        });

        it("Fails if already expired", async function () {
          await this.field.incrementTotalDraftableE("2000");
          await expect(
            this.marketplace.connect(user).createCasualListing("0", "0", "500", "100000", "0", "0", INTERNAL)
          ).to.be.revertedWith("Marketplace: Expired.");
        });

        it("Fails if amount is 0", async function () {
          await expect(
            this.marketplace.connect(user2).createCasualListing("1000", "0", "0", "100000", "0", "0", INTERNAL)
          ).to.be.revertedWith("Marketplace: Invalid Turf/Amount.");
        });

        it("fails if price is 0", async function () {
          await expect(
            this.marketplace.connect(user2).createCasualListing("1000", "0", "1000", "0", "0", "0", INTERNAL)
          ).to.be.revertedWith("Marketplace: Casual price must be greater than 0.");
        });

        it("Fails if start + amount too large", async function () {
          await expect(
            this.marketplace.connect(user2).createCasualListing("1000", "500", "1000", "100000", "0", "0", INTERNAL)
          ).to.be.revertedWith("Marketplace: Invalid Turf/Amount.");
        });

        describe("List full turf", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", EXTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, "0", "0", "1000", 500000, "0", "0", "0x", 0, Fixed);
          });
        });

        describe("List full turf with minimum amount", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "100", EXTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, "0", "0", "1000", 500000, "0", "100", "0x", 0, Fixed);
          });
        });

        describe("List partial turf", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace.connect(user).createCasualListing("0", "0", "100", "100000", "0", "0", EXTERNAL);
            this.result = await this.marketplace.connect(user).createCasualListing("0", "0", "500", "500000", "0", "0", EXTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 0, "500", 500000, 0, "0", "0x", 0, Fixed);
          });
        });

        describe("List partial turf from middle", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace.connect(user).createCasualListing("0", "500", "500", "500000", "2000", "0", INTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 500, "500", 500000, 2000, "0", "0x", 1, Fixed);
          });
        });

        describe("Relist turf from middle", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace.connect(user).createCasualListing("0", "0", "500", "500000", "0", "0", INTERNAL);
            this.result = await this.marketplace.connect(user).createCasualListing("0", "500", "100", "500000", "2000", "0", INTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, 0);
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 500, "100", 500000, 2000, "0", "0x", 1, Fixed);
          });
        });

        describe("Relist turf from middle with minimum amount", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace.connect(user).createCasualListing("0", "0", "500", "500000", "0", "100", INTERNAL);
            this.result = await this.marketplace.connect(user).createCasualListing("0", "500", "100", "500000", "2000", "100", INTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, 0);
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 500, "100", 500000, 2000, "100", "0x", 1, Fixed);
          });
        });
      });

      describe("Fill", async function () {
        describe("revert", async function () {
          beforeEach(async function () {
            await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "10", EXTERNAL);
            this.listing = [userAddress, "0", "0", "1000", 500000, "0", "10", EXTERNAL];
          });

          it("Fill Listing non-listed Index Fails", async function () {
            let brokenListing = this.listing;
            brokenListing[1] = "1";
            await expect(this.marketplace.connect(user).fillCasualListing(brokenListing, 500, EXTERNAL)).to.be.revertedWith(
              "Marketplace: Listing does not exist."
            );
          });

          it("Fill Listing wrong start Index Fails", async function () {
            let brokenListing = this.listing;
            brokenListing[2] = "1";
            await expect(this.marketplace.connect(user).fillCasualListing(brokenListing, 500, EXTERNAL)).to.be.revertedWith(
              "Marketplace: Listing does not exist."
            );
          });

          it("Fill Listing wrong price Fails", async function () {
            let brokenListing = this.listing;
            brokenListing[4] = "100001";
            await expect(this.marketplace.connect(user).fillCasualListing(brokenListing, 500, EXTERNAL)).to.be.revertedWith(
              "Marketplace: Listing does not exist."
            );
          });

          it("Fill Listing after expired", async function () {
            await this.field.incrementTotalDraftableE("2000");
            await expect(this.marketplace.connect(user2).fillCasualListing(this.listing, 500, EXTERNAL)).to.be.revertedWith(
              "Marketplace: Listing has expired."
            );
          });

          it("Fill Listing not enough casuals in turf", async function () {
            await expect(this.marketplace.connect(user2).fillCasualListing(this.listing, 501, EXTERNAL)).to.be.revertedWith(
              "Marketplace: Not enough casuals in Listing."
            );
          });

          it("Fill Listing not enough casuals in listing", async function () {
            const l = [userAddress, "0", "0", "500", "500000", "0", "0", INTERNAL];
            await this.marketplace.connect(user).createCasualListing("0", "0", "500", "500000", "0", "0", INTERNAL);
            await expect(this.marketplace.connect(user2).fillCasualListing(l, 500, EXTERNAL)).to.be.revertedWith(
              "Marketplace: Not enough casuals in Listing."
            );
          });

          it("Fails if filling under minimum amount of Casuals", async function () {
            await expect(this.marketplace.connect(user2).fillCasualListing(this.listing, "1", EXTERNAL)).to.be.revertedWith(
              "Marketplace: Fill must be >= minimum amount."
            );
          });
        });

        describe("Fill listing", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "0", "1000", "500000", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", EXTERNAL);
            this.amountHooligansBuyingWith = 500;

            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace.connect(user2).fillCasualListing(this.listing, this.amountHooligansBuyingWith, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(this.amountHooligansBuyingWith);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(0);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(0)).to.equal(ZERO_HASH);
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("1000");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("0");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 0, "1000", "500");
          });
        });

        describe("Fill partial listing", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "0", "1000", "500000", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", EXTERNAL);
            this.amountHooligansBuyingWith = 250;

            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace.connect(user2).fillCasualListing(this.listing, this.amountHooligansBuyingWith, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(this.amountHooligansBuyingWith);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(0);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(0)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(500)).to.equal(
              getHashFromListing(["0", "500", this.listing[4], this.listing[5], this.listing[6], this.listing[7]])
            );
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("0");
            expect((await this.field.turf(userAddress, 500)).toString()).to.equal("500");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 0, "500", "250");
          });
        });

        describe("Fill partial listing of a partial listing multiple fills", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "500", "500", "500000", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListing("0", "500", "500", "500000", "0", "0", EXTERNAL);
            this.amountHooligansBuyingWith = 100;

            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace.connect(user2).fillCasualListing(this.listing, this.amountHooligansBuyingWith, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(this.amountHooligansBuyingWith);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(0);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(0)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(700)).to.equal(
              getHashFromListing(["0", "300", this.listing[4], this.listing[5], this.listing[6], this.listing[7]])
            );
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 500)).toString()).to.equal("200");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 700)).toString()).to.equal("300");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 500, "200", "100");
          });
        });

        describe("Fill partial listing of a listing created by partial fill", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "500", "500", "500000", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListing("0", "500", "500", "500000", "0", "0", EXTERNAL);
            this.amountHooligansBuyingWith = 100;

            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace.connect(user2).fillCasualListing(this.listing, this.amountHooligansBuyingWith, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.listing = [userAddress, "700", "0", "300", "500000", "0", "0", EXTERNAL];

            this.result = await this.marketplace.connect(user2).fillCasualListing(this.listing, 100, EXTERNAL);
          });
          it("turfs correctly transfer", async function () {
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 700)).toString()).to.equal("0");
            expect((await this.field.turf(userAddress, 900)).toString()).to.equal("100");

            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("0");
            expect((await this.field.turf(user2Address, 500)).toString()).to.equal("200");
            expect((await this.field.turf(user2Address, 700)).toString()).to.equal("200");
            expect((await this.field.turf(user2Address, 900)).toString()).to.equal("0");
          });

          it("listing updates", async function () {
            expect(await this.marketplace.casualListing(700)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(900)).to.equal(
              getHashFromListing(["0", "100", this.listing[4], this.listing[5], this.listing[6], this.listing[7]])
            );
          });
        });

        describe("Fill partial listing to wallet", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "0", "1000", "500000", "0", "0", INTERNAL];
            await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", INTERNAL);
            this.amountHooligansBuyingWith = 250;

            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace.connect(user2).fillCasualListing(this.listing, this.amountHooligansBuyingWith, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(0);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(this.amountHooligansBuyingWith);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(700)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(500)).to.equal(
              getHashFromListing(["0", "500", this.listing[4], this.listing[5], this.listing[6], this.listing[7]])
            );
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("0");
            expect((await this.field.turf(userAddress, 500)).toString()).to.equal("500");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 0, "500", "250");
          });
        });
      });

      describe("Cancel", async function () {
        it("Re-list turf cancels and re-lists", async function () {
          result = await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", EXTERNAL);
          expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(result));
          result = await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "200000", "2000", "0", INTERNAL);
          await expect(result)
            .to.emit(this.marketplace, "CasualListingCreated")
            .withArgs(userAddress, "0", 0, 1000, 200000, 2000, "0", "0x", 1, Fixed);
          await expect(result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, "0");
          expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(result));
        });

        it("Reverts on Cancel Listing, not owned by user", async function () {
          await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", EXTERNAL);
          await expect(this.marketplace.connect(user2).cancelCasualListing("0")).to.be.revertedWith(
            "Marketplace: Listing not owned by sender."
          );
        });

        it("Cancels Listing, Emits Listing Cancelled Event", async function () {
          result = await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "2000", "0", EXTERNAL);
          expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(result));
          result = await this.marketplace.connect(user).cancelCasualListing("0");
          expect(await this.marketplace.casualListing(0)).to.be.equal(ZERO_HASH);
          expect(result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, "0");
        });
      });
    });
    describe("Dynamic Price", async function () {
      beforeEach(async function () {
        this.f = interpolatePoints(staticset_16Pieces_500000.xs, staticset_16Pieces_500000.ys);
      });
      describe("Create", async function () {
        it("Fails to List Unowned Turf", async function () {
          await expect(
            this.marketplace.connect(user).createCasualListingV2("5000", "0", "1000", "0", "0", this.f.packedFunction, INTERNAL)
          ).to.be.revertedWith("Marketplace: Invalid Turf/Amount.");
        });

        it("Fails if already expired", async function () {
          await this.field.incrementTotalDraftableE("2000");
          await expect(
            this.marketplace.connect(user).createCasualListingV2("0", "0", "500", "0", "0", this.f.packedFunction, INTERNAL)
          ).to.be.revertedWith("Marketplace: Expired.");
        });

        it("Fails if amount is 0", async function () {
          await expect(
            this.marketplace.connect(user2).createCasualListingV2("1000", "0", "0", "0", "0", this.f.packedFunction, INTERNAL)
          ).to.be.revertedWith("Marketplace: Invalid Turf/Amount.");
        });

        it("Fails if start + amount too large", async function () {
          await expect(
            this.marketplace.connect(user2).createCasualListingV2("1000", "500", "1000", "0", "0", this.f.packedFunction, INTERNAL)
          ).to.be.revertedWith("Marketplace: Invalid Turf/Amount.");
        });

        it("Fails if function is invalid length", async function () {
          let brokenFunction = this.f.packedFunction.slice(0, -2);
          await expect(
            this.marketplace.connect(user).createCasualListingV2("0", "0", "1000", "0", "0", brokenFunction, INTERNAL)
          ).to.be.revertedWith("Marketplace: Invalid pricing function.");
        });

        describe("List full turf", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace
              .connect(user)
              .createCasualListingV2("0", "0", "1000", "0", "0", this.f.packedFunction, EXTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 0, "1000", 0, 0, "0", this.f.packedFunction, 0, Dynamic);
          });
        });

        describe("List partial turf", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace
              .connect(user)
              .createCasualListingV2("0", "0", "100", "0", "0", this.f.packedFunction, EXTERNAL);
            this.result = await this.marketplace
              .connect(user)
              .createCasualListingV2("0", "0", "500", "0", "0", this.f.packedFunction, EXTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 0, "500", 0, 0, "0", this.f.packedFunction, 0, Dynamic);
          });
        });

        describe("List partial turf from middle", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace
              .connect(user)
              .createCasualListingV2("0", "500", "500", "2000", "0", this.f.packedFunction, INTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 500, "500", 0, 2000, "0", this.f.packedFunction, 1, Dynamic);
          });
        });

        describe("Relist turf from middle", async function () {
          beforeEach(async function () {
            this.result = await this.marketplace
              .connect(user)
              .createCasualListingV2("0", "0", "500", "0", "0", this.f.packedFunction, INTERNAL);
            this.result = await this.marketplace
              .connect(user)
              .createCasualListingV2("0", "500", "100", "2000", "0", this.f.packedFunction, INTERNAL);
          });

          it("Lists Turf properly", async function () {
            expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(this.result));
          });

          it("Emits event", async function () {
            await expect(this.result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, 0);
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingCreated")
              .withArgs(userAddress, 0, 500, "100", 0, 2000, "0", this.f.packedFunction, 1, Dynamic);
          });
        });
      });

      describe("Fill", async function () {
        describe("revert", async function () {
          beforeEach(async function () {
            await this.marketplace.connect(user).createCasualListingV2("0", "0", "1000", "0", "0", this.f.packedFunction, EXTERNAL);
            this.listing = [userAddress, "0", "0", "1000", 0, "0", "0", EXTERNAL];
          });

          it("Fill Listing non-listed Index Fails", async function () {
            let brokenListing = this.listing;
            brokenListing[1] = "1";
            await expect(
              this.marketplace.connect(user).fillCasualListingV2(brokenListing, 1000, this.f.packedFunction, EXTERNAL)
            ).to.be.revertedWith("Marketplace: Listing does not exist.");
          });

          it("Fill Listing wrong start Index Fails", async function () {
            let brokenListing = this.listing;
            brokenListing[2] = "1";
            await expect(
              this.marketplace.connect(user).fillCasualListingV2(brokenListing, 1000, this.f.packedFunction, EXTERNAL)
            ).to.be.revertedWith("Marketplace: Listing does not exist.");
          });

          it("Fill Listing wrong price Fails", async function () {
            let brokenListing = this.listing;
            brokenListing[4] = "100001";
            await expect(
              this.marketplace.connect(user).fillCasualListingV2(brokenListing, 1000, this.f.packedFunction, EXTERNAL)
            ).to.be.revertedWith("Marketplace: Listing does not exist.");
          });

          it("Fill Listing after expired", async function () {
            await this.field.incrementTotalDraftableE("2000");
            await expect(
              this.marketplace.connect(user2).fillCasualListingV2(this.listing, 1000, this.f.packedFunction, EXTERNAL)
            ).to.be.revertedWith("Marketplace: Listing has expired.");
          });

          it("Fill Listing not enough casuals in turf", async function () {
            await expect(
              this.marketplace.connect(user2).fillCasualListingV2(this.listing, 1500, this.f.packedFunction, EXTERNAL)
            ).to.be.revertedWith("Marketplace: Not enough casuals in Listing.");
          });

          it("Fill Listing not enough casuals in listing", async function () {
            const l = [userAddress, "0", "0", "500", "0", "0", "0", INTERNAL];
            await this.marketplace.connect(user).createCasualListingV2("0", "0", "500", "0", "0", this.f.packedFunction, INTERNAL);
            await expect(this.marketplace.connect(user2).fillCasualListingV2(l, 1000, this.f.packedFunction, EXTERNAL)).to.be.revertedWith(
              "Marketplace: Not enough casuals in Listing."
            );
          });
        });

        describe("Fill listing", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "0", "1000", "0", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListingV2("0", "0", "1000", "0", "0", this.f.packedFunction, EXTERNAL);
            this.amountHooligansBuyingWith = 500;
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace
              .connect(user2)
              .fillCasualListingV2(this.listing, this.amountHooligansBuyingWith, this.f.packedFunction, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(this.amountHooligansBuyingWith);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(0);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(0)).to.equal(ZERO_HASH);
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("1000");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("0");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 0, "1000", "500");
          });
        });

        describe("Fill partial listing", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "0", "1000", "0", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListingV2("0", "0", "1000", "0", "0", this.f.packedFunction, EXTERNAL);
            this.amountHooligansBuyingWith = 250;
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace
              .connect(user2)
              .fillCasualListingV2(this.listing, this.amountHooligansBuyingWith, this.f.packedFunction, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(this.amountHooligansBuyingWith);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(0);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(0)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(500)).to.equal(
              getHashFromDynamicListing([
                "0",
                "500",
                this.listing[4],
                this.listing[5],
                this.listing[6],
                this.listing[7],
                this.f.packedFunction
              ])
            );
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("0");
            expect((await this.field.turf(userAddress, 500)).toString()).to.equal("500");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 0, "500", "250");
          });
        });

        describe("Fill partial listing of a partial listing multiple fills", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "500", "500", "0", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListingV2("0", "500", "500", "0", "0", this.f.packedFunction, EXTERNAL);
            this.amountHooligansBuyingWith = 100;

            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace
              .connect(user2)
              .fillCasualListingV2(this.listing, this.amountHooligansBuyingWith, this.f.packedFunction, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(this.amountHooligansBuyingWith);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(0);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(0)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(700)).to.equal(
              getHashFromDynamicListing([
                "0",
                "300",
                this.listing[4],
                this.listing[5],
                this.listing[6],
                this.listing[7],
                this.f.packedFunction
              ])
            );
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 500)).toString()).to.equal("200");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 700)).toString()).to.equal("300");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 500, "200", "100");
          });
        });

        describe("Fill partial listing of a listing created by partial fill", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "500", "500", "0", "0", "0", EXTERNAL];
            await this.marketplace.connect(user).createCasualListingV2("0", "500", "500", "0", "0", this.f.packedFunction, EXTERNAL);
            this.amountHooligansBuyingWith = 100;

            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace
              .connect(user2)
              .fillCasualListingV2(this.listing, this.amountHooligansBuyingWith, this.f.packedFunction, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.listing = [userAddress, "700", "0", "300", "0", "0", "0", EXTERNAL];

            this.result = await this.marketplace.connect(user2).fillCasualListingV2(this.listing, 100, this.f.packedFunction, EXTERNAL);
          });
          it("turfs correctly transfer", async function () {
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 700)).toString()).to.equal("0");
            expect((await this.field.turf(userAddress, 900)).toString()).to.equal("100");

            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("0");
            expect((await this.field.turf(user2Address, 500)).toString()).to.equal("200");
            expect((await this.field.turf(user2Address, 700)).toString()).to.equal("200");
            expect((await this.field.turf(user2Address, 900)).toString()).to.equal("0");
          });

          it("listing updates", async function () {
            expect(await this.marketplace.casualListing(700)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(900)).to.equal(
              getHashFromDynamicListing([
                "0",
                "100",
                this.listing[4],
                this.listing[5],
                this.listing[6],
                this.listing[7],
                this.f.packedFunction
              ])
            );
          });
        });

        describe("Fill partial listing to wallet", async function () {
          beforeEach(async function () {
            this.listing = [userAddress, "0", "0", "1000", "0", "0", "0", INTERNAL];
            await this.marketplace.connect(user).createCasualListingV2("0", "0", "1000", "0", "0", this.f.packedFunction, INTERNAL);
            this.amountHooligansBuyingWith = 250;
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);

            this.result = await this.marketplace
              .connect(user2)
              .fillCasualListingV2(this.listing, this.amountHooligansBuyingWith, this.f.packedFunction, EXTERNAL);

            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalance.sub(this.user2HooliganBalanceAfter)).to.equal(this.amountHooligansBuyingWith);
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal(0);
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal(this.amountHooligansBuyingWith);
          });

          it("Deletes Casual Listing", async function () {
            expect(await this.marketplace.casualListing(700)).to.equal(ZERO_HASH);
            expect(await this.marketplace.casualListing(500)).to.equal(
              getHashFromDynamicListing([
                "0",
                "500",
                this.listing[4],
                this.listing[5],
                this.listing[6],
                this.listing[7],
                this.f.packedFunction
              ])
            );
          });

          it("transfer casual listing", async function () {
            expect((await this.field.turf(user2Address, 0)).toString()).to.equal("500");
            expect((await this.field.turf(userAddress, 0)).toString()).to.equal("0");
            expect((await this.field.turf(userAddress, 500)).toString()).to.equal("500");
          });

          it("emits event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualListingFilled")
              .withArgs(userAddress, user2Address, 0, 0, "500", "250");
          });
        });
      });
      describe("Cancel", async function () {
        it("Re-list turf cancels and re-lists", async function () {
          result = await this.marketplace.connect(user).createCasualListingV2("0", "0", "1000", "0", "0", this.f.packedFunction, EXTERNAL);
          expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(result));
          result = await this.marketplace
            .connect(user)
            .createCasualListingV2("0", "0", "1000", "2000", "0", this.f.packedFunction, INTERNAL);
          await expect(result)
            .to.emit(this.marketplace, "CasualListingCreated")
            .withArgs(userAddress, "0", 0, 1000, 0, 2000, "0", this.f.packedFunction, 1, Dynamic);
          await expect(result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, "0");
          expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(result));
        });

        it("Reverts on Cancel Listing, not owned by user", async function () {
          await this.marketplace.connect(user).createCasualListingV2("0", "0", "1000", "0", "0", this.f.packedFunction, EXTERNAL);
          await expect(this.marketplace.connect(user2).cancelCasualListing("0")).to.be.revertedWith(
            "Marketplace: Listing not owned by sender."
          );
        });

        it("Cancels Listing, Emits Listing Cancelled Event", async function () {
          result = await this.marketplace
            .connect(user)
            .createCasualListingV2("0", "0", "1000", "2000", "0", this.f.packedFunction, EXTERNAL);
          expect(await this.marketplace.casualListing(0)).to.be.equal(await getHash(result));
          result = await this.marketplace.connect(user).cancelCasualListing("0");
          expect(await this.marketplace.casualListing(0)).to.be.equal(ZERO_HASH);
          expect(result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, "0");
        });
      });
    });
  });

  describe("Casual Order", async function () {
    describe("Fixed Price", async function () {
      describe("Create", async function () {
        describe("revert", async function () {
          it("Reverts if price is 0", async function () {
            await expect(this.marketplace.connect(user2).createCasualOrder("100", "0", "100000", "0", EXTERNAL)).to.be.revertedWith(
              "Marketplace: Casual price must be greater than 0."
            );
          });
          it("Reverts if amount is 0", async function () {
            await expect(this.marketplace.connect(user2).createCasualOrder("0", "100000", "100000", "0", EXTERNAL)).to.be.revertedWith(
              "Marketplace: Order amount must be > 0."
            );
          });
        });

        describe("create order", async function () {
          beforeEach(async function () {
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.result = await this.marketplace.connect(user).createCasualOrder("500", "100000", "1000", "0", EXTERNAL);
            this.id = await getOrderId(this.result);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.hooliganhordeHooliganBalanceAfter.sub(this.hooliganhordeHooliganBalance)).to.equal("500");
            expect(this.userHooliganBalance.sub(this.userHooliganBalanceAfter)).to.equal("500");
          });

          it("Creates the order", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("500");
            expect(await this.marketplace.casualOrder(userAddress, "100000", "1000", "0")).to.equal("500");
          });

          it("emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderCreated")
              .withArgs(userAddress, this.id, "500", 100000, "1000", "0", "0x", Fixed);
          });

          it("cancels old order, replacing with new order", async function () {
            let newOrder = await this.marketplace.connect(user).createCasualOrder("100", "100000", "1000", "0", EXTERNAL);
            expect(newOrder).to.emit(this.marketplace, "CasualOrderCancelled").withArgs(userAddress, this.id);
            expect(await this.marketplace.casualOrder(userAddress, "100000", "1000", "0")).to.equal("100");
          });
        });

        describe("create order with min amount", async function () {
          beforeEach(async function () {
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.result = await this.marketplace.connect(user).createCasualOrder("500", "100000", "1000", "100", EXTERNAL);
            this.id = await getOrderId(this.result);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.hooliganhordeHooliganBalanceAfter.sub(this.hooliganhordeHooliganBalance)).to.equal("500");
            expect(this.userHooliganBalance.sub(this.userHooliganBalanceAfter)).to.equal("500");
          });

          it("Creates the order", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("500");
            expect(await this.marketplace.casualOrder(userAddress, "100000", "1000", "100")).to.equal("500");
          });

          it("emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderCreated")
              .withArgs(userAddress, this.id, "500", 100000, "1000", "100", "0x", Fixed);
          });
        });
      });

      describe("Fill", async function () {
        beforeEach(async function () {
          this.result = await this.marketplace.connect(user).createCasualOrder("50", "100000", "2500", "10", EXTERNAL);
          this.id = await getOrderId(this.result);
          this.order = [userAddress, "100000", "2500", "10"];
        });

        describe("revert", async function () {
          it("owner does not own turf", async function () {
            await expect(this.marketplace.fillCasualOrder(this.order, 0, 0, 500, INTERNAL)).to.revertedWith("Marketplace: Invalid Turf.");
          });

          it("turf amount too large", async function () {
            await expect(this.marketplace.connect(user2).fillCasualOrder(this.order, 1000, 700, 500, INTERNAL)).to.be.revertedWith(
              "Marketplace: Invalid Turf."
            );
          });

          it("turf amount too large", async function () {
            await this.field.connect(user2).sow("1200", "0", EXTERNAL);
            await expect(this.marketplace.connect(user2).fillCasualOrder(this.order, 2000, 700, 500, INTERNAL)).to.be.revertedWith(
              "Marketplace: Turf too far in line."
            );
          });

          it("sell too much", async function () {
            await expect(this.marketplace.connect(user2).fillCasualOrder(this.order, 1000, 0, 1000, INTERNAL)).to.revertedWith(
              "Marketplace: Not enough hooligans in order."
            );
          });

          it("under minimum amount of casuals", async function () {
            await expect(this.marketplace.connect(user2).fillCasualOrder(this.order, 1000, 0, 1, INTERNAL)).to.revertedWith(
              "Marketplace: Fill must be >= minimum amount."
            );
          });
        });

        describe("Full order", async function () {
          beforeEach(async function () {
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace.connect(user2).fillCasualOrder(this.order, 1000, 0, 500, EXTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal("50");
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal("50");
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal(0);
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(0);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1000)).to.be.equal(500);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("Emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 0, 500, 50);
          });
        });

        describe("Partial fill order", async function () {
          beforeEach(async function () {
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace.connect(user2).fillCasualOrder(this.order, 1000, 250, 250, EXTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal("25");
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal("25");
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal(0);
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(250);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1250)).to.be.equal(250);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("25");
          });

          it("Emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 250, 250, 25);
          });
        });

        describe("Full order to wallet", async function () {
          beforeEach(async function () {
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace.connect(user2).fillCasualOrder(this.order, 1000, 0, 500, INTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal(0);
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal(0);
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal("50");
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(0);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1000)).to.be.equal(500);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("Emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 0, 500, 50);
          });
        });

        describe("Full order with active listing", async function () {
          beforeEach(async function () {
            await this.marketplace.connect(user2).createCasualListing("1000", "500", "500", "50000", "5000", "0", EXTERNAL);
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace.connect(user2).fillCasualOrder(this.order, 1000, 0, 500, INTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal(0);
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal(0);
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal("50");
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(0);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1000)).to.be.equal(500);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("deletes the listing", async function () {
            expect(await this.marketplace.casualListing("1000")).to.equal(ZERO_HASH);
          });

          it("Emits an event", async function () {
            expect(this.result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(user2Address, "1000");
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 0, 500, 50);
          });
        });
      });

      describe("Cancel", async function () {
        beforeEach(async function () {
          this.result = await this.marketplace.connect(user).createCasualOrder("500", "100000", "1000", "0", EXTERNAL);
          this.id = await getOrderId(this.result);
        });

        describe("Cancel owner", async function () {
          beforeEach(async function () {
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.result = await this.marketplace.connect(user).cancelCasualOrder("100000", "1000", "0", EXTERNAL);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
          });

          it("deletes the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("transfer hooligans", async function () {
            expect(this.hooliganhordeHooliganBalance.sub(this.hooliganhordeHooliganBalanceAfter)).to.equal("500");
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal("500");
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal("0");
          });

          it("Emits an event", async function () {
            expect(this.result).to.emit(this.marketplace, "CasualOrderCancelled").withArgs(userAddress, this.id);
          });
        });

        describe("Cancel to wrapped", async function () {
          beforeEach(async function () {
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.result = await this.marketplace.connect(user).cancelCasualOrder("100000", "1000", "0", INTERNAL);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
          });

          it("deletes the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("transfer hooligans", async function () {
            expect(this.hooliganhordeHooliganBalance.sub(this.hooliganhordeHooliganBalanceAfter)).to.equal("0");
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal("0");
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal("500");
          });

          it("Emits an event", async function () {
            expect(this.result).to.emit(this.marketplace, "CasualOrderCancelled").withArgs(userAddress, this.id);
          });
        });
      });
    });

    describe("Dynamic Price", async function () {
      beforeEach(async function () {
        this.f = interpolatePoints(staticset_4Pieces_100000.xs, staticset_4Pieces_100000.ys);
      });
      describe("Create", async function () {
        describe("revert", async function () {
          it("Reverts if amount is 0", async function () {
            await expect(
              this.marketplace.connect(user2).createCasualOrderV2("0", "1000", "0", this.f.packedFunction, EXTERNAL)
            ).to.be.revertedWith("Marketplace: Order amount must be > 0.");
          });

          it("Reverts with invalid function", async function () {
            let brokenFunction = this.f.packedFunction.slice(0, -2);
            await expect(
              this.marketplace.connect(user2).createCasualOrderV2("500", "1000", "0", brokenFunction, EXTERNAL)
            ).to.be.revertedWith("Marketplace: Invalid pricing function.");
          });
        });

        describe("create order", async function () {
          beforeEach(async function () {
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.result = await this.marketplace.connect(user).createCasualOrderV2("500", "1000", "0", this.f.packedFunction, EXTERNAL);
            this.id = await getOrderId(this.result);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.hooliganhordeHooliganBalanceAfter.sub(this.hooliganhordeHooliganBalance)).to.equal("500");
            expect(this.userHooliganBalance.sub(this.userHooliganBalanceAfter)).to.equal("500");
          });

          it("Creates the order", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("500");
            expect(await this.marketplace.casualOrderV2(userAddress, "1000", "0", this.f.packedFunction)).to.equal("500");
          });

          it("emits an event", async function () {
            await expect(this.result)
              .to.emit(this.marketplace, "CasualOrderCreated")
              .withArgs(userAddress, this.id, "500", 0, "1000", "0", this.f.packedFunction, Dynamic);
          });
          it("cancels old order, replacing with new order", async function () {
            let newOrder = await this.marketplace.connect(user).createCasualOrderV2("100", "1000", "0", this.f.packedFunction, EXTERNAL);
            expect(newOrder).to.emit(this.marketplace, "CasualOrderCancelled").withArgs(userAddress, this.id);
            expect(await this.marketplace.casualOrderV2(userAddress, "1000", "0", this.f.packedFunction)).to.equal("100");
          });
        });
      });

      describe("Fill", async function () {
        beforeEach(async function () {
          this.result = await this.marketplace.connect(user).createCasualOrderV2("50", "2500", "0", this.f.packedFunction, EXTERNAL);
          this.id = await getOrderId(this.result);
          this.order = [userAddress, "0", "2500", "0"];
        });

        describe("revert", async function () {
          it("owner does not own turf", async function () {
            await expect(this.marketplace.fillCasualOrderV2(this.order, 0, 0, 500, this.f.packedFunction, INTERNAL)).to.revertedWith(
              "Marketplace: Invalid Turf."
            );
          });

          it("turf amount too large", async function () {
            await expect(
              this.marketplace.connect(user2).fillCasualOrderV2(this.order, 1000, 700, 500, this.f.packedFunction, INTERNAL)
            ).to.be.revertedWith("Marketplace: Invalid Turf.");
          });

          it("turf amount too large", async function () {
            await this.field.connect(user2).sow("1200", "0", EXTERNAL);
            await expect(
              this.marketplace.connect(user2).fillCasualOrderV2(this.order, 2000, 700, 500, this.f.packedFunction, INTERNAL)
            ).to.be.revertedWith("Marketplace: Turf too far in line.");
          });

          it("sell too much", async function () {
            await expect(
              this.marketplace.connect(user2).fillCasualOrderV2(this.order, 1000, 0, 1000, this.f.packedFunction, INTERNAL)
            ).to.revertedWith("Marketplace: Not enough hooligans in order.");
          });
        });

        describe("Full order", async function () {
          beforeEach(async function () {
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace
              .connect(user2)
              .fillCasualOrderV2(this.order, 1000, 0, 500, this.f.packedFunction, EXTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal("50");
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal("50");
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal(0);
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(0);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1000)).to.be.equal(500);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("Emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 0, 500, 50);
          });
        });

        describe("Partial fill order", async function () {
          beforeEach(async function () {
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace
              .connect(user2)
              .fillCasualOrderV2(this.order, 1000, 250, 250, this.f.packedFunction, EXTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal("25");
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal("25");
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal(0);
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(250);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1250)).to.be.equal(250);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("25");
          });

          it("Emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 250, 250, 25);
          });
        });

        describe("Full order to wallet", async function () {
          beforeEach(async function () {
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace
              .connect(user2)
              .fillCasualOrderV2(this.order, 1000, 0, 500, this.f.packedFunction, INTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal(0);
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal(0);
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal("50");
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(0);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1000)).to.be.equal(500);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("Emits an event", async function () {
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 0, 500, 50);
          });
        });

        describe("Full order with active listing", async function () {
          beforeEach(async function () {
            await this.marketplace.connect(user2).createCasualListingV2("1000", "0", "500", "5000", "0", this.f.packedFunction, EXTERNAL);
            this.hooliganhordeBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalance = await this.hooligan.balanceOf(user2Address);
            this.result = await this.marketplace
              .connect(user2)
              .fillCasualOrderV2(this.order, 1000, 0, 500, this.f.packedFunction, INTERNAL);
            this.hooliganhordeBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
            this.user2HooliganBalanceAfter = await this.hooligan.balanceOf(user2Address);
          });

          it("Transfer Hooligans properly", async function () {
            expect(this.user2HooliganBalanceAfter.sub(this.user2HooliganBalance)).to.equal(0);
            expect(this.hooliganhordeBalance.sub(this.hooliganhordeBalanceAfter)).to.equal(0);
            expect(await this.token.getInternalBalance(user2.address, this.hooligan.address)).to.equal("50");
          });

          it("transfer the turf", async function () {
            expect(await this.field.turf(user2Address, 1000)).to.be.equal(0);
            expect(await this.field.turf(user2Address, 1500)).to.be.equal(500);
            expect(await this.field.turf(userAddress, 1000)).to.be.equal(500);
          });

          it("Updates the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("deletes the listing", async function () {
            expect(await this.marketplace.casualListing("1000")).to.equal(ZERO_HASH);
          });

          it("Emits an event", async function () {
            expect(this.result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(user2Address, "1000");
            expect(this.result)
              .to.emit(this.marketplace, "CasualOrderFilled")
              .withArgs(user2Address, userAddress, this.id, 1000, 0, 500, 50);
          });
        });
      });

      describe("Cancel", async function () {
        beforeEach(async function () {
          this.result = await this.marketplace.connect(user).createCasualOrderV2("500", "1000", "0", this.f.packedFunction, EXTERNAL);
          this.id = await getOrderId(this.result);
        });

        describe("Cancel owner", async function () {
          beforeEach(async function () {
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.result = await this.marketplace.connect(user).cancelCasualOrderV2("1000", "0", this.f.packedFunction, EXTERNAL);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
          });

          it("deletes the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("transfer hooligans", async function () {
            expect(this.hooliganhordeHooliganBalance.sub(this.hooliganhordeHooliganBalanceAfter)).to.equal("500");
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal("500");
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal("0");
          });

          it("Emits an event", async function () {
            expect(this.result).to.emit(this.marketplace, "CasualOrderCancelled").withArgs(userAddress, this.id);
          });
        });

        describe("Cancel to wrapped", async function () {
          beforeEach(async function () {
            this.userHooliganBalance = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalance = await this.hooligan.balanceOf(this.marketplace.address);
            this.result = await this.marketplace.connect(user).cancelCasualOrderV2("1000", "0", this.f.packedFunction, INTERNAL);
            this.userHooliganBalanceAfter = await this.hooligan.balanceOf(userAddress);
            this.hooliganhordeHooliganBalanceAfter = await this.hooligan.balanceOf(this.marketplace.address);
          });

          it("deletes the offer", async function () {
            expect(await this.marketplace.casualOrderById(this.id)).to.equal("0");
          });

          it("transfer hooligans", async function () {
            expect(this.hooliganhordeHooliganBalance.sub(this.hooliganhordeHooliganBalanceAfter)).to.equal("0");
            expect(this.userHooliganBalanceAfter.sub(this.userHooliganBalance)).to.equal("0");
            expect(await this.token.getInternalBalance(user.address, this.hooligan.address)).to.equal("500");
          });

          it("Emits an event", async function () {
            expect(this.result).to.emit(this.marketplace, "CasualOrderCancelled").withArgs(userAddress, this.id);
          });
        });
      });
    });

    describe("Turf Transfer", async function () {
      describe("reverts", async function () {
        it("doesn't sent to 0 address", async function () {
          await expect(this.marketplace.connect(user).transferTurf(userAddress, ZERO_ADDRESS, "0", "0", "100")).to.be.revertedWith(
            "Field: Transfer to/from 0 address."
          );
        });

        it("Turf not owned by user.", async function () {
          await expect(this.marketplace.connect(user2).transferTurf(user2Address, userAddress, "0", "0", "100")).to.be.revertedWith(
            "Field: Turf not owned by user."
          );
        });

        it("Allowance is 0 not owned by user.", async function () {
          await expect(this.marketplace.connect(user2).transferTurf(userAddress, user2Address, "0", "0", "100")).to.be.revertedWith(
            "Field: Insufficient approval."
          );
        });

        it("Casual Range invalid", async function () {
          await expect(this.marketplace.connect(user).transferTurf(userAddress, userAddress, "0", "150", "100")).to.be.revertedWith(
            "Field: Casual range invalid."
          );
        });

        it("transfers to self", async function () {
          await expect(this.marketplace.connect(user).transferTurf(userAddress, userAddress, "0", "0", "100")).to.be.revertedWith(
            "Field: Cannot transfer Casuals to oneself."
          );
        });
      });

      describe("transfers beginning of turf", async function () {
        beforeEach(async function () {
          this.result = await this.marketplace.connect(user).transferTurf(userAddress, user2Address, "0", "0", "100");
        });

        it("transfers the turf", async function () {
          expect(await this.field.turf(user2Address, "0")).to.be.equal("100");
          expect(await this.field.turf(userAddress, "0")).to.be.equal("0");
          expect(await this.field.turf(userAddress, "100")).to.be.equal("900");
        });

        it("emits turf transfer the turf", async function () {
          await expect(this.result).to.emit(this.marketplace, "TurfTransfer").withArgs(userAddress, user2Address, "0", "100");
        });
      });

      describe("transfers with allowance", async function () {
        beforeEach(async function () {
          await expect(this.marketplace.connect(user).approveCasuals(user2Address, "100"));
          this.result = await this.marketplace.connect(user2).transferTurf(userAddress, user2Address, "0", "0", "100");
        });

        it("transfers the turf", async function () {
          expect(await this.field.turf(user2Address, "0")).to.be.equal("100");
          expect(await this.field.turf(userAddress, "0")).to.be.equal("0");
          expect(await this.field.turf(userAddress, "100")).to.be.equal("900");
          expect(await this.marketplace.allowanceCasuals(userAddress, user2Address)).to.be.equal("0");
        });

        it("emits turf transfer the turf", async function () {
          await expect(this.result).to.emit(this.marketplace, "TurfTransfer").withArgs(userAddress, user2Address, "0", "100");
        });
      });

      describe("transfers with existing casual listing", async function () {
        beforeEach(async function () {
          await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", EXTERNAL);
          this.result = await this.marketplace.connect(user).transferTurf(userAddress, user2Address, "0", "0", "100");
        });

        it("transfers the turf", async function () {
          expect(await this.field.turf(user2Address, "0")).to.be.equal("100");
          expect(await this.field.turf(userAddress, "0")).to.be.equal("0");
          expect(await this.field.turf(userAddress, "100")).to.be.equal("900");
          expect(await this.marketplace.casualListing("0")).to.be.equal(
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("emits turf transfer the turf", async function () {
          await expect(this.result).to.emit(this.marketplace, "TurfTransfer").withArgs(userAddress, user2Address, "0", "100");
          await expect(this.result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, "0");
        });
      });

      describe("transfers with existing casual listing from other", async function () {
        beforeEach(async function () {
          await this.marketplace.connect(user).createCasualListing("0", "0", "1000", "500000", "0", "0", EXTERNAL);
          this.result = await expect(this.marketplace.connect(user).approveCasuals(user2Address, "100"));
          this.result = await this.marketplace.connect(user2).transferTurf(userAddress, user2Address, "0", "0", "100");
        });

        it("transfers the turf", async function () {
          expect(await this.field.turf(user2Address, "0")).to.be.equal("100");
          expect(await this.field.turf(userAddress, "0")).to.be.equal("0");
          expect(await this.field.turf(userAddress, "100")).to.be.equal("900");
          expect(await this.marketplace.casualListing("0")).to.be.equal(
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("removes the listing", async function () {
          expect(await this.marketplace.casualListing("0")).to.be.equal(ZERO_HASH);
        });

        it("emits events", async function () {
          await expect(this.result).to.emit(this.marketplace, "TurfTransfer").withArgs(userAddress, user2Address, "0", "100");
          await expect(this.result).to.emit(this.marketplace, "CasualListingCancelled").withArgs(userAddress, "0");
        });
      });
    });
  });
});
