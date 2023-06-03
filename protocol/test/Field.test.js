// tests are inaccurate, as testing was done on foundry.
// coverage test for field can be check by doing `forge test --match-contract Field`

// const { expect } = require('chai');
// const { deploy } = require('../scripts/deploy.js')
// const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require('./utils/balances.js')
// const { HOOLIGAN } = require('./utils/constants')
// const { to18, to6, toHorde } = require('./utils/helpers.js')
// const { MAX_UINT32 } = require('./utils/constants.js')
// const { takeSnapshot, revertToSnapshot } = require("./utils/snapshot");

// let user, user2, owner;
// let userAddress, ownerAddress, user2Address;

// describe('Field', function () {
//   before(async function () {
//     [owner, user, user2] = await ethers.getSigners();
//     userAddress = user.address;
//     user2Address = user2.address;
//     const contracts = await deploy("Test", false, true);
//     ownerAddress = contracts.account;
//     this.diamond = contracts.hooliganhordeDiamond;
//     this.gameday = await ethers.getContractAt('MockGamedayFacet', this.diamond.address);
//     this.field = await ethers.getContractAt('MockFieldFacet', this.diamond.address);
//     this.tokenFacet = await ethers.getContractAt('TokenFacet', this.diamond.address);
//     this.marketplace = await ethers.getContractAt('MarketplaceFacet', this.diamond.address);
//     this.hooligan = await ethers.getContractAt('Hooligan', HOOLIGAN);

//     await this.hooligan.connect(user).approve(this.field.address, to18('100000000000'));
//     await this.hooligan.connect(user2).approve(this.field.address, to18('100000000000'));
//     await this.hooligan.mint(userAddress, to6('10000'));
//     await this.hooligan.mint(user2Address, to6('10000'));
//   });

//   beforeEach(async function () {
//     snapshotId = await takeSnapshot();
//   });

//   afterEach(async function () {
//     await revertToSnapshot(snapshotId);
//   });

//   describe('Reverts', function () {
//     it('No Rage', async function () {
//       await expect(this.field.connect(user).sow('1', EXTERNAL)).to.be.revertedWith('Field: Sowing below min or 0 casuals.')
//     });

//     it('No Rage', async function () {
//       await this.field.incrementTotalRageE('100')
//       await expect(this.field.connect(user).sowWithMin('1', '3', EXTERNAL)).to.be.revertedWith('Field: Sowing below min or 0 casuals.')
//     });

//     it('No Casuals', async function () {
//       await expect(this.field.connect(user).sowWithMin('1', '0', EXTERNAL)).to.be.revertedWith('Field: Sowing below min or 0 casuals.')
//     });
//   });

//   describe('Sow', async function () {
//     describe('all rage', async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalRageE(to6('100'))
//         this.result = await this.field.connect(user).sow(to6('100'), EXTERNAL)
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9900'))
//         expect(await this.field.turf(userAddress, 0)).to.eq(to6('101'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19900'))
//         expect(await this.field.totalCasuals()).to.eq(to6('101'))
//         expect(await this.field.totalRage()).to.eq('0')
//         expect(await this.field.totalUndraftable()).to.eq(to6('101'))
//         expect(await this.field.casualIndex()).to.eq(to6('101'))
//         expect(await this.field.draftableIndex()).to.eq('0')
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Sow').withArgs(userAddress, '0', to6('100'), to6('101'))
//       })
//     })

//     describe('some rage', async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalRageE(to6('200'))
//         this.result = await this.field.connect(user).sow(to6('100'), EXTERNAL)
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9900'))
//         expect(await this.field.turf(userAddress, 0)).to.eq(to6('101'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19900'))
//         expect(await this.field.totalCasuals()).to.eq(to6('101'))
//         expect(await this.field.totalRage()).to.eq(to6('100'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('101'))
//         expect(await this.field.casualIndex()).to.eq(to6('101'))
//         expect(await this.field.draftableIndex()).to.eq('0')
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Sow').withArgs(userAddress, '0', to6('100'), to6('101'))
//       })
//     })

//     describe('some rage from internal', async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalRageE(to6('200'))
//         await this.tokenFacet.connect(user).transferToken(this.hooligan.address, userAddress, to6('100'), EXTERNAL, INTERNAL);
//         this.result = await this.field.connect(user).sow(to6('100'), INTERNAL)
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9900'))
//         expect(await this.field.turf(userAddress, 0)).to.eq(to6('101'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19900'))
//         expect(await this.field.totalCasuals()).to.eq(to6('101'))
//         expect(await this.field.totalRage()).to.eq(to6('100'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('101'))
//         expect(await this.field.casualIndex()).to.eq(to6('101'))
//         expect(await this.field.draftableIndex()).to.eq('0')
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Sow').withArgs(userAddress, '0', to6('100'), to6('101'))
//       })
//     })

//     describe('some rage from internal tolerant', async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalRageE(to6('200'))
//         await this.tokenFacet.connect(user).transferToken(this.hooligan.address, userAddress, to6('50'), EXTERNAL, INTERNAL);
//         this.result = await this.field.connect(user).sow(to6('100'), INTERNAL_TOLERANT)
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9950'))
//         expect(await this.field.turf(userAddress, 0)).to.eq(to6('50.5'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19950'))
//         expect(await this.field.totalCasuals()).to.eq(to6('50.5'))
//         expect(await this.field.totalRage()).to.eq(to6('150'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('50.5'))
//         expect(await this.field.casualIndex()).to.eq(to6('50.5'))
//         expect(await this.field.draftableIndex()).to.eq('0')
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Sow').withArgs(userAddress, '0', to6('50'), to6('50.5'))
//       })
//     })

//     describe('with min', async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalRageE(to6('100'))
//         this.result = await this.field.connect(user).sowWithMin(to6('200'), to6('100'), EXTERNAL)
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9900'))
//         expect(await this.field.turf(userAddress, 0)).to.eq(to6('101'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19900'))
//         expect(await this.field.totalCasuals()).to.eq(to6('101'))
//         expect(await this.field.totalRage()).to.eq(to6('0'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('101'))
//         expect(await this.field.casualIndex()).to.eq(to6('101'))
//         expect(await this.field.draftableIndex()).to.eq('0')
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Sow').withArgs(userAddress, '0', to6('100'), to6('101'))
//       })
//     })

//     describe('with min, but enough rage', async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalRageE(to6('200'))
//         this.result = await this.field.connect(user).sowWithMin(to6('100'), to6('50'), EXTERNAL)
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9900'))
//         expect(await this.field.turf(userAddress, 0)).to.eq(to6('101'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19900'))
//         expect(await this.field.totalCasuals()).to.eq(to6('101'))
//         expect(await this.field.totalRage()).to.eq(to6('100'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('101'))
//         expect(await this.field.casualIndex()).to.eq(to6('101'))
//         expect(await this.field.draftableIndex()).to.eq('0')
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Sow').withArgs(userAddress, '0', to6('100'), to6('101'))
//       })
//     })

//     describe('second turf', async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalRageE(to6('200'))
//         this.result = await this.field.connect(user2).sow(to6('100'), EXTERNAL)
//         this.result = await this.field.connect(user).sow(to6('100'), EXTERNAL)
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9900'))
//         expect(await this.field.turf(userAddress, to6('101'))).to.eq(to6('101'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19800'))
//         expect(await this.field.totalCasuals()).to.eq(to6('202'))
//         expect(await this.field.totalRage()).to.eq(to6('0'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('202'))
//         expect(await this.field.casualIndex()).to.eq(to6('202'))
//         expect(await this.field.draftableIndex()).to.eq('0')
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Sow').withArgs(userAddress, to6('101'), to6('100'), to6('101'))
//       })
//     })
//   })

//   describe("complex DPD", async function () {
//     it("Does not set thisSowTime if Rage > 1", async function () {
//       this.gameday.setRageE(to6('3'));
//       await this.field.connect(user).sow(to6('1'), EXTERNAL)
//       const weather = await this.gameday.weather()
//       expect(weather.thisSowTime).to.be.equal(parseInt(MAX_UINT32))
//     })

//     it("Does set thisSowTime if Rage = 1", async function () {
//       this.gameday.setRageE(to6('1'));
//       await this.field.connect(user).sow(to6('1'), EXTERNAL)
//       const weather = await this.gameday.weather()
//       expect(weather.thisSowTime).to.be.not.equal(parseInt(MAX_UINT32))
//     })

//     it("Does set thisSowTime if Rage < 1", async function () {
//       this.gameday.setRageE(to6('1.5'));
//       await this.field.connect(user).sow(to6('1'), EXTERNAL)
//       const weather = await this.gameday.weather()
//       expect(weather.thisSowTime).to.be.not.equal(parseInt(MAX_UINT32))
//     })

//     it("Does not set thisSowTime if Rage already < 1", async function () {
//       this.gameday.setRageE(to6('1.5'));
//       await this.field.connect(user).sow(to6('1'), EXTERNAL)
//       const weather = await this.gameday.weather()
//       await this.field.connect(user).sow(to6('0.5'), EXTERNAL)
//       const weather2 = await this.gameday.weather()
//       expect(weather2.thisSowTime).to.be.equal(weather.thisSowTime)
//     })
//   })

//   describe("Draft", async function () {
//     beforeEach(async function () {
//       await this.field.incrementTotalRageE(to6('200'))
//       await this.field.connect(user).sow(to6('100'), EXTERNAL)
//       await this.field.connect(user2).sow(to6('100'), EXTERNAL)
//     })

//     describe('Revert', async function () {
//       it('reverts if turf not owned', async function () {
//         await this.field.incrementTotalDraftableE(to6('101'))
//         await expect(this.field.connect(user2).draft(['0'], EXTERNAL)).to.be.revertedWith('Field: Turf is empty.')
//       })

//       it('reverts if turf draftable', async function () {
//         await expect(this.field.connect(user).draft(['0'], EXTERNAL)).to.be.revertedWith('Field: Turf not Draftable.')
//       })
//     })

//     describe("Full", async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalDraftableE(to6('101'))
//         this.result = await this.field.connect(user).draft(['0'], EXTERNAL);
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('10001'))
//         expect(await this.field.turf(userAddress, to6('0'))).to.eq(to6('0'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19901'))
//         expect(await this.field.totalCasuals()).to.eq(to6('101'))
//         expect(await this.field.totalRage()).to.eq(to6('0'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('101'))
//         expect(await this.field.totalDraftable()).to.eq(to6('0'))
//         expect(await this.field.draftableIndex()).to.eq(to6('101'))
//         expect(await this.field.totalDrafted()).to.eq(to6('101'))
//         expect(await this.field.casualIndex()).to.eq(to6('202'))
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Draft').withArgs(userAddress, ['0'], to6('101'))
//       })
//     })

//     describe("Partial", async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalDraftableE(to6('50'))
//         this.result = await this.field.connect(user).draft(['0'], EXTERNAL);
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('9950'))
//         expect(await this.field.turf(userAddress, to6('0'))).to.eq(to6('0'))
//         expect(await this.field.turf(userAddress, to6('50'))).to.eq(to6('51'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19850'))
//         expect(await this.field.totalCasuals()).to.eq(to6('152'))
//         expect(await this.field.totalRage()).to.eq(to6('0'))
//         expect(await this.field.totalDraftable()).to.eq(to6('0'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('152'))
//         expect(await this.field.draftableIndex()).to.eq(to6('50'))
//         expect(await this.field.totalDrafted()).to.eq(to6('50'))
//         expect(await this.field.casualIndex()).to.eq(to6('202'))
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Draft').withArgs(userAddress, ['0'], to6('50'))
//       })
//     })

//     describe("Full With Listing", async function () {
//       beforeEach(async function () {
//         await this.field.incrementTotalDraftableE(to6('101'))
//         this.result = await this.marketplace.connect(user).createCasualListing('0', '0', '500', '500000', to6('200'), EXTERNAL);
//         this.result = await this.field.connect(user).draft(['0'], EXTERNAL);
//       })

//       it('updates user\'s balance', async function () {
//         expect(await this.hooligan.balanceOf(userAddress)).to.eq(to6('10001'))
//         expect(await this.field.turf(userAddress, to6('0'))).to.eq(to6('0'))
//       })

//       it('updates total balance', async function () {
//         expect(await this.hooligan.balanceOf(this.field.address)).to.eq('0')
//         expect(await this.hooligan.totalSupply()).to.eq(to6('19901'))
//         expect(await this.field.totalCasuals()).to.eq(to6('101'))
//         expect(await this.field.totalRage()).to.eq(to6('0'))
//         expect(await this.field.totalUndraftable()).to.eq(to6('101'))
//         expect(await this.field.totalDraftable()).to.eq(to6('0'))
//         expect(await this.field.draftableIndex()).to.eq(to6('101'))
//         expect(await this.field.totalDrafted()).to.eq(to6('101'))
//         expect(await this.field.casualIndex()).to.eq(to6('202'))
//       })

//       it('deletes', async function () {
//         expect(await this.marketplace.casualListing(0)).to.be.equal(ethers.constants.HashZero)
//       })

//       it('emits Sow event', async function () {
//         await expect(this.result).to.emit(this.field, 'Draft').withArgs(userAddress, ['0'], to6('101'))
//       })
//     })
//   })
// });
