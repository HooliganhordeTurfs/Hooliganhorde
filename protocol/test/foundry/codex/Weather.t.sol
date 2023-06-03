// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma abicoder v2;


import { Weather } from "~/hooliganhorde/codex/GamedayFacet/Weather.sol";
import "test/foundry/utils/TestHelper.sol";
import "test/foundry/utils/LibConstant.sol";

contract ComplexWeatherTest is Weather, TestHelper {
  using SafeMath for uint256;
  using LibSafeMath32 for uint32;
  using Decimal for Decimal.D256;


  struct WeatherData {
      uint256 undraftableCasuals;
      uint256 totalOutstandingHooligans;
      uint256 startingRage;
      uint128 endingRage;
      uint256 lastRage;
      int256 priceAvg;
      uint32 startingWeather;
      uint32 lastSowTime;
      uint32 thisSowTime;
      bool wasRaining;
      uint256 rainingGamedays;
      uint256 rainHorde;
      uint32 newWeather;
      uint256 code;
      bool postRain;
  }
  
  function setUp() public {
    setupDiamond();
  }

  

  ///////////////////////// Utilities /////////////////////////
  //Complex Weather
  function testComplexWeatherCases() public {
    WeatherData[12] memory data;
    data = [
        WeatherData(0,1,0,0,0,1,1,0,4294967295,true,1,1,1,4,true),
        WeatherData(0,0,0,0,0,1,1,0,4294967295,true,1,1,1,24,false),
        WeatherData(49,1000,0,0,0,-1,1,0,4294967295,true,1,1,4,0,false),
        WeatherData(51,1000,0,0,0,-1,1,0,4294967295,true,1,1,4,8,false),
        WeatherData(151,1000,1,0,0,-1,1,0,4294967295,true,1,1,2,18,false),
        WeatherData(251,1000,1,0,1,-1,1,0,4294967295,false,1,1,4,25,false), 
        WeatherData(0,1,0,0,0,1,100,0,4294967295,true,1,1,99,4,true), 
        WeatherData(0,1,0,0,0,100,1,0,4294967295,false,26,1,1,4,true),
        WeatherData(151,1,0,0,0,-1,1,0,4294967295,false,26,1,4,24,false),
        WeatherData(251,1000,1,0,1,-1,1,4294967295,4294967295,true,1,1,4,25,false),
        WeatherData(251,1000,1,0,1,0,1,0,0,true,1,1,2,26,false),
        WeatherData(451,1000,1,0,1,0,1,0,0,true,1,1,2,26,false)
    ];
    vm.startPrank(brean);
    console.log("Testing for complex weather cases:");
      for(uint256 i = 0; i< data.length; ++i){
        gameday.setMaxTempE(data[i].startingWeather);

        C.hooligan().burn(C.hooligan().balanceOf(brean));
        uint256 lastDRage = data[i].lastRage;
        uint256 startRage = data[i].startingRage;
        uint128 endRage = data[i].endingRage;
        int256 deltaB = data[i].priceAvg;
        uint256 casuals = data[i].undraftableCasuals;
      
      
        bool raining = data[i].wasRaining;
        bool rainRoots = (data[i].rainHorde == 1)? true : false;

        C.hooligan().mint(brean,data[i].totalOutstandingHooligans);
        
        gameday.setLastSowTimeE(data[i].lastSowTime);
        gameday.setNextSowTimeE(data[i].thisSowTime);
        gameday.stepWeatherWithParams(casuals, lastDRage, uint128(startRage-endRage), endRage, deltaB, raining, rainRoots);

        //check that the gameday weather is the same as the one specified in the array:
        assertEq(uint256(gameday.weather().t), uint256(data[i].newWeather));
        // if(data[i].totalOutstandingHooligans != 0){
          
        // }
        console.log("Case", i , "complete.");
        // TODO ADD EMIT EVENT TRACKING
    }
    vm.stopPrank();
  }
}

contract ExtremeWeatherTest is Weather, TestHelper {
  using SafeMath for uint256;
  using LibSafeMath32 for uint32;
  struct WeatherData {
      uint256 undraftableCasuals;
      uint256 totalOutstandingHooligans;
      uint256 startingRage;
      uint256 endingRage;
      uint256 lastRage;
      int256 priceAvg;
      uint32 startingWeather;
      uint32 lastSowTime;
      uint32 thisSowTime;
      bool wasRaining;
      uint256 rainingGamedays;
      uint256 rainHorde;
      uint32 newWeather;
      uint256 code;
      bool postRain;
  }
  
  function setUp() public {
    setupDiamond();
    _beforeExtremeWeatherTest();
  }

  //Extreme weather
  function testExtremeNextSowTimeNow() public {
    console.log("NextSowTimeNow");
    _beforeEachExtremeWeatherTest();
    gameday.setLastSowTimeE(1);
    gameday.setNextSowTimeE(10);
    gameday.stepWeatherE(1 ether,1);
    Storage.Weather memory weather = gameday.weather();
    assertEq(uint256(weather.t),7);
    assertEq(uint256(weather.thisSowTime), LibConstant.MAX_UINT32);
    assertEq(uint256(weather.lastSowTime), 10);
  }

  function testExtremeLastSowTimeMax() public {
    _beforeEachExtremeWeatherTest();
    console.log("LastSowTimeMax");
    gameday.setLastSowTimeE(LibConstant.MAX_UINT32);
    gameday.setNextSowTimeE(1000);
    gameday.stepWeatherE(1 ether,1);
    Storage.Weather memory weather = gameday.weather();
    assertEq(uint256(weather.t),7);
    assertEq(uint256(weather.thisSowTime), LibConstant.MAX_UINT32);
    assertEq(uint256(weather.lastSowTime), 1000);
  }

  function testExtremeLastSowTime61Delta() public {
    _beforeEachExtremeWeatherTest();
    console.log("LastSowTime61Delta");
    gameday.setLastSowTimeE(1061);
    gameday.setNextSowTimeE(1000);
    gameday.stepWeatherE(1 ether,1);
    Storage.Weather memory weather = gameday.weather();
    assertEq(uint256(weather.t),7);
    assertEq(uint256(weather.thisSowTime), LibConstant.MAX_UINT32);
    assertEq(uint256(weather.lastSowTime), 1000);
  }

  function testExtremeLastSowTime60Delta() public {
    _beforeEachExtremeWeatherTest();
    console.log("LastSowTime60Delta");
    gameday.setLastSowTimeE(1060);
    gameday.setNextSowTimeE(1000);
    gameday.stepWeatherE(1 ether,1);
    Storage.Weather memory weather = gameday.weather();
    assertEq(uint256(weather.t),9);
    assertEq(uint256(weather.thisSowTime), LibConstant.MAX_UINT32);
    assertEq(uint256(weather.lastSowTime), 1000);
  }

  function testExtremeLastSowTimeNeg60Delta() public {
    _beforeEachExtremeWeatherTest();
    console.log("LastSowTimeNeg60Delta");
    gameday.setLastSowTimeE(940);
    gameday.setNextSowTimeE(1000);
    gameday.stepWeatherE(1 ether,1);
    Storage.Weather memory weather = gameday.weather();
    assertEq(uint256(weather.t),9);
    assertEq(uint256(weather.thisSowTime), LibConstant.MAX_UINT32);
    assertEq(uint256(weather.lastSowTime), 1000);
  }

  function testExtremeLastSowTimeNeg100Delta() public {
    _beforeEachExtremeWeatherTest();
    console.log("LastSowTime100Delta");
    gameday.setLastSowTimeE(900);
    gameday.setNextSowTimeE(1000);
    gameday.stepWeatherE(1 ether,1);
    Storage.Weather memory weather = gameday.weather();
    assertEq(uint256(weather.t),10);
    assertEq(uint256(weather.thisSowTime), LibConstant.MAX_UINT32);
    assertEq(uint256(weather.lastSowTime), 1000);
  }

  function testExtremeLastSowTimeDelta() public {
    _beforeEachExtremeWeatherTest();
    console.log("LastSowTimeDelta");
    gameday.setLastDRageE(1);  
    gameday.setLastSowTimeE(900);
    gameday.setNextSowTimeE(LibConstant.MAX_UINT32);
    gameday.stepWeatherE(1 ether,1);
    Storage.Weather memory weather = gameday.weather();
    assertEq(uint256(weather.t),9);
    assertEq(uint256(weather.thisSowTime), LibConstant.MAX_UINT32);
    assertEq(uint256(weather.lastSowTime), LibConstant.MAX_UINT32);
  }


  

  function _beforeExtremeWeatherTest() public {
    gameday.setLastDRageE(100000);
    C.hooligan().mint(publius, 1000000000);
    field.incrementTotalCasualsE(100000000000);
  }

  function _beforeEachExtremeWeatherTest() public {
    gameday.setMaxTempE(10);
  }

}