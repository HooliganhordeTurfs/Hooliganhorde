const { expect } = require("chai");
const { deploy } = require("../scripts/deploy.js");
const { parseJson } = require("./utils/helpers.js");
const { MAX_UINT32 } = require("./utils/constants.js");
const { HOOLIGAN } = require("./utils/constants");

// // Set the test data
const [columns, tests] = parseJson("./coverage_data/weather.json");
var numberTests = tests.length;
var startTest = 0;

describe("Complex Weather", function () {
  before(async function () {
    [owner, user, user2] = await ethers.getSigners();
    userAddress = user.address;
    user2Address = user2.address;
    const contracts = await deploy("Test", false, true);
    ownerAddress = contracts.account;
    this.diamond = contracts.hooliganhordeDiamond;
    this.gameday = await ethers.getContractAt("MockGamedayFacet", this.diamond.address);
    this.field = await ethers.getContractAt("MockFieldFacet", this.diamond.address);
    this.hooligan = await ethers.getContractAt("MockToken", HOOLIGAN);
  });

  [...Array(numberTests).keys()]
    .map((i) => i + startTest)
    .forEach(function (v) {
      const testStr = "Test #";
      describe(testStr.concat(v), function () {
        before(async function () {
          this.testData = {};
          columns.forEach((key, i) => (this.testData[key] = tests[v][i]));
          await this.gameday.setYieldE(this.testData.startingWeather);
          this.hooligan.connect(user).burn(await this.hooligan.balanceOf(userAddress));
          this.drage = this.testData.lastRage;
          this.startRage = this.testData.startingRage;
          this.endRage = this.testData.endingRage;
          this.price = this.testData.priceAvg;
          this.casuals = this.testData.undraftableCasuals;
          await this.hooligan.mint(userAddress, this.testData.totalOutstandingHooligans);
          await this.gameday.setLastSowTimeE(this.testData.lastSowTime);
          await this.gameday.setNextSowTimeE(this.testData.thisSowTime);
          this.result = await this.gameday.stepWeatherWithParams(
            this.casuals,
            this.drage,
            this.startRage - this.endRage,
            this.endRage,
            this.price,
            this.testData.wasRaining,
            this.testData.rainHorde
          );
        });
        it("Checks New Weather", async function () {
          expect(await this.gameday.getT()).to.eq(this.testData.newWeather);
        });
        it("Emits The Correct Case Weather", async function () {
          if (this.testData.totalOutstandingHooligans !== 0)
            await expect(this.result)
              .to.emit(this.gameday, "WeatherChange")
              .withArgs(await this.gameday.gameday(), this.testData.Code, this.testData.newWeather - this.testData.startingWeather);
        });
      });
    });

  describe("Extreme Weather", async function () {
    before(async function () {
      await this.gameday.setLastDRageE("100000");
      await this.hooligan.mint(userAddress, "1000000000");
      await this.field.incrementTotalCasualsE("100000000000");
    });

    beforeEach(async function () {
      await this.gameday.setYieldE("10");
    });

    it("thisSowTime immediately", async function () {
      await this.gameday.setLastSowTimeE("1");
      await this.gameday.setNextSowTimeE("10");
      await this.gameday.stepWeatherE(ethers.utils.parseEther("1"), "1");
      const weather = await this.gameday.weather();
      expect(weather.t).to.equal(7);
      expect(weather.thisSowTime).to.equal(parseInt(MAX_UINT32));
      expect(weather.lastSowTime).to.equal(10);
    });

    it("lastSowTime max", async function () {
      await this.gameday.setLastSowTimeE(MAX_UINT32);
      await this.gameday.setNextSowTimeE("1000");
      await this.gameday.stepWeatherE(ethers.utils.parseEther("1"), "1");
      const weather = await this.gameday.weather();
      expect(weather.t).to.equal(7);
      expect(weather.thisSowTime).to.equal(parseInt(MAX_UINT32));
      expect(weather.lastSowTime).to.equal(1000);
    });

    it("lastSowTime max", async function () {
      await this.gameday.setLastSowTimeE("1061");
      await this.gameday.setNextSowTimeE("1000");
      await this.gameday.stepWeatherE(ethers.utils.parseEther("1"), "1");
      const weather = await this.gameday.weather();
      expect(weather.t).to.equal(7);
      expect(weather.thisSowTime).to.equal(parseInt(MAX_UINT32));
      expect(weather.lastSowTime).to.equal(1000);
    });

    it("lastSowTime max", async function () {
      await this.gameday.setLastSowTimeE("1060");
      await this.gameday.setNextSowTimeE("1000");
      await this.gameday.stepWeatherE(ethers.utils.parseEther("1"), "1");
      const weather = await this.gameday.weather();
      expect(weather.t).to.equal(9);
      expect(weather.thisSowTime).to.equal(parseInt(MAX_UINT32));
      expect(weather.lastSowTime).to.equal(1000);
    });

    it("lastSowTime max", async function () {
      await this.gameday.setLastSowTimeE("940");
      await this.gameday.setNextSowTimeE("1000");
      await this.gameday.stepWeatherE(ethers.utils.parseEther("1"), "1");
      const weather = await this.gameday.weather();
      expect(weather.t).to.equal(9);
      expect(weather.thisSowTime).to.equal(parseInt(MAX_UINT32));
      expect(weather.lastSowTime).to.equal(1000);
    });

    it("lastSowTime max", async function () {
      await this.gameday.setLastSowTimeE("900");
      await this.gameday.setNextSowTimeE("1000");
      await this.gameday.stepWeatherE(ethers.utils.parseEther("1"), "1");
      const weather = await this.gameday.weather();
      expect(weather.t).to.equal(10);
      expect(weather.thisSowTime).to.equal(parseInt(MAX_UINT32));
      expect(weather.lastSowTime).to.equal(1000);
    });

    it("lastSowTime max", async function () {
      await this.gameday.setLastSowTimeE("900");
      await this.gameday.setNextSowTimeE(MAX_UINT32);
      await this.gameday.stepWeatherE(ethers.utils.parseEther("1"), "1");
      const weather = await this.gameday.weather();
      expect(weather.t).to.equal(9);
      expect(weather.thisSowTime).to.equal(parseInt(MAX_UINT32));
      expect(weather.lastSowTime).to.equal(parseInt(MAX_UINT32));
    });
  });
});
