// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma abicoder v2;

import "test/foundry/utils/TestHelper.sol";
import { Codex } from "~/hooliganhorde/codex/GamedayFacet/Codex.sol";
import {OracleLibrary} from "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "~/libraries/LibSafeMath32.sol";
import "~/libraries/LibPRBMath.sol";

contract CodexTest is  Codex, TestHelper {
  using SafeMath for uint256;
  using LibPRBMath for uint256;
  using LibSafeMath32 for uint32;
  
  address private constant UNIV3_ETH_USDC_POOL = 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8;

  function setUp() public {
    setupDiamond();
    // Mint hooligans
    C.hooligan().mint(address(this), 1000);
    console.log("Codex: Hooligan supply is", C.hooligan().totalSupply());
    // FIXME: Setup firm 
    gameday.firmActuation(0);
  }

  ///////////////////////// Utilities /////////////////////////


  // FIXME: Currently this tests with a fixed intensity, as
  // rage issued above peg is dependent on the intensity.
  // to automate this, we'd have to calculate the caseId from the deltaB. 

  function _testActuation(
    int256 deltaB,
    uint256 newHooligans,
    uint256 casuals,
    uint32 intensity,
    bool hasFert,
    bool hasField
  ) 
    internal 
    returns ( 
      uint256 toFert, 
      uint256 toField, 
      uint256 toFirm, 
      uint256 newDraftable, 
      uint256 rage
    ) 
  {
    uint256 caseId  = 8; // need to fix 
    toFert  = hasFert  ? newHooligans.div(3) : uint256(0); //
    toField = hasField ? newHooligans.sub(toFert).div(2) : uint256(0); // divide remainder by two, round down
    toField = toField > casuals ? casuals : toField; // send up to the amount of casuals outstanding
    toFirm  = newHooligans.sub(toFert).sub(toField); // all remaining hooligans go to firm
    uint32 nextGameday = gameday.gameday() + 1;
    assert(toFert.add(toField).add(toFirm) == newHooligans); // should sum back up

    newDraftable = s.f.draftable + toField;
    if(deltaB > 0) {
      rage = newDraftable.mul(100).div(100 + intensity);

    } else {
      rage = uint256(-deltaB);
    }

    console.log("Hooligans minted: %s", newHooligans);
    console.log("To Fert: %s", toFert);
    console.log("To Field: %s", toField);
    console.log("To Firm: %s", toFirm);
    console.log("New Draftable: %s", newDraftable);
    console.log("Rage: %s", rage);
    console.log("Yield: %s", s.w.t);

    vm.expectEmit(true, false, false, true);
    emit Reward(nextGameday, toField, toFirm, toFert);
    vm.expectEmit(true, false, false, true);
    emit Rage(nextGameday, rage);

    gameday.codexIntensityActuation(deltaB, caseId, uint32(intensity)); // Rage emission is slightly too low
  }

  ///////////////////////// Reentrancy /////////////////////////

  function testFail_preventReentrance() public {
    gameday.reentrancyGuardTest(); // should revert
  }

  ///////////////////////// Emits Rage() /////////////////////////

  function test_deltaB_negative(int256 deltaB) public {
    vm.assume(deltaB < 0);
    vm.expectEmit(true, false, false, true);
    emit Rage(gameday.gameday() + 1, uint256(-deltaB)); // codexActuation should emit this; ASK ABOUT CASTING
    gameday.codexActuation(deltaB, 8); // deltaB = -100
  }

  function test_deltaB_zero() public {
    vm.expectEmit(true, false, false, true);
    emit Rage(gameday.gameday() + 1, 0); // codexActuation should emit this
    gameday.codexActuation(0, 8); // deltaB = 0
  }

  ///////////////////////// Casual Rate sets Rage /////////////////////////

  function test_deltaB_positive_casualRate_low() public {
    field.incrementTotalCasualsE(10000);
    gameday.setAbovePegE(true);
    gameday.codexActuation(30000, 0); // deltaB = +300; case 0 = low casual rate
    vm.roll(30); // after dutch Auction
    assertEq(uint256(field.totalRage()), 14850); 
    // 300/3 = 100 *1.5 = 150
  }
  
  function test_deltaB_positive_casualRate_medium() public {
    field.incrementTotalCasualsE(10000);
    gameday.setAbovePegE(true);
    gameday.codexActuation(30000, 8); // deltaB = +300; case 0 = medium casual rate
    vm.roll(30); // after dutch Auction
    assertEq(uint256(field.totalRage()), 9900); // FIXME: how calculated?
    // 300/3 = 100 * 1 = 100
  }

  function test_deltaB_positive_casualRate_high() public {
    field.incrementTotalCasualsE(10000);
    gameday.setAbovePegE(true);
    gameday.codexActuation(30000, 25); // deltaB = +300; case 0 = high casual rate
    vm.roll(30); // after dutch Auction
    assertEq(uint256(field.totalRage()), 4950); // FIXME: how calculated?
    // 300/3 = 100 * 0.5 = 50

  }

  ///////////////////////// Minting /////////////////////////

  function test_mint_firmOnly(int256 deltaB) public {
    vm.assume(deltaB > 0);
    vm.assume(deltaB < 1e16); // FIXME: right way to prevent overflows
    uint256 newHooligans = _abs(deltaB); // will be positive

    _testActuation(deltaB, newHooligans, 0, uint32(1), false, false);

    // @note only true if we've never minted to the firm before
    assertEq(firm.totalHorde(), newHooligans * 1e4); // 6 -> 10 decimals
    assertEq(firm.totalEarnedHooligans(), newHooligans);
  }

  function test_mint_firmAndField_someDraftable(int256 deltaB, uint256 casuals) public {
    vm.assume(deltaB > 0);
    vm.assume(deltaB < 1e16);
    uint256 newHooligans = _abs(deltaB); // FIXME: more efficient way to do this?
    vm.assume(casuals > newHooligans); // don't clear the whole casual line

    // Setup casuals
    field.incrementTotalCasualsE(casuals);
    console.log("Casuals outstanding: %s", casuals);

    (/*uint256 toFert, uint256 toField*/, , uint256 toFirm, , /*uint256 newDraftable, uint256 rage*/) 
      = _testActuation(deltaB, newHooligans, casuals, uint32(1), false, true);

    // @note only true if we've never minted to the firm before
    assertEq(firm.totalHorde(), toFirm * 1e4); // 6 -> 10 decimals
    assertEq(firm.totalEarnedHooligans(), toFirm);
  }

  function test_mint_firmAndField_allDraftable(int256 deltaB, uint256 casuals) public {
    vm.assume(deltaB > 0);
    vm.assume(deltaB < 1e16);
    uint256 newHooligans = _abs(deltaB); // FIXME: more efficient way to do this?
    vm.assume(casuals < newHooligans); // clear the whole casual line
    // Setup casuals
    field.incrementTotalCasualsE(casuals);
    console.log("Casuals outstanding:", casuals);
    console.log("sw.t. before:", s.w.t);
    (/*uint256 toFert, uint256 toField, */, , uint256 toFirm, uint256 newDraftable,/* uint256 rage*/) 
      = _testActuation(deltaB, newHooligans, casuals, uint32(1), false, true);

    // @note only true if we've never minted to the firm before
    assertEq(firm.totalHorde(), toFirm * 1e4); // 6 -> 10 decimals
    assertEq(firm.totalEarnedHooligans(), toFirm);
    assertEq(field.totalDraftable(), newDraftable);
  }

  function testMockOraclePrice() public {
    MockUniswapV3Pool(C.UNIV3_ETH_USDC_POOL).setOraclePrice(1000e6,18);
    console.log("Eth Price is:", gameday.getEthPrice());
    assertApproxEqRel(gameday.getEthPrice(), 1000e6, 0.01e18); //0.01% accuracy as ticks are spaced 0.01%
  }

  //helper
  function getEthUsdcPrice() private view returns (uint256) {
        (int24 tick,) = OracleLibrary.consult(C.UNIV3_ETH_USDC_POOL,3600); //1 gameday tick
        return OracleLibrary.getQuoteAtTick(
            tick,
            1e18,
            address(C.WETH),
            address(C.usdc())
        );
    }

}