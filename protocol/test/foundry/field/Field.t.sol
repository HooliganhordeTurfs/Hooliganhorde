// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma abicoder v2;

import {FieldFacet} from "~/hooliganhorde/field/FieldFacet.sol";
import "test/foundry/utils/LibConstant.sol";
import "~/libraries/LibPRBMath.sol";
import "../utils/TestHelper.sol";

contract FieldTest is FieldFacet, TestHelper {
    using SafeMath for uint256;
    using LibPRBMath for uint256;
    using LibSafeMath32 for uint32;
    using Decimal for Decimal.D256;

    Storage.Weather weather;
    
    /**
     * @notice the diamond is setup in the constructor, 
     * with all the mock facets deployed and added.
     * @dev this creates a hooliganhorde instance with a blank state - 
     * this does not consider upgrading the current hooliganhorde, 
     * so care is needed when:
     * - adding new functions with the same selectors 
     * - changing of appStorage layout
     */
    constructor() {
        setupDiamond();
        gameday.lightActuation();
    }

    function setUp() public {
        C.hooligan().mint(brean, 1e18);
        C.hooligan().mint(firmChad, 1e18);
        vm.prank(brean);
        C.hooligan().approve(address(field), (2 ** 256 - 1));
        vm.prank(firmChad);
        C.hooligan().approve(address(field), (2 ** 256 - 1));
    }

    // user should not be able to sow if there is no rage.
    function testCannotSowWithNoRage(uint256 hooligans) public {
        hooligans = bound(hooligans, 1, 2 ** 256 - 1);
        vm.prank(brean);
        vm.expectRevert("Field: Rage Slippage");
        field.sow(hooligans, 1e6, LibTransfer.From.EXTERNAL);
    }


    /**
     * user should not sow if the amount input is less than the minRage.
     * @dev we set the rage, as in the code, we verify that the amount of 
     * hooligans is greater than the rage in the field..
     */
    function testCannotSowBelowMinRage(uint256 hooliganSown) public {
        hooliganSown = bound(hooliganSown, 1, 2 ** 256 - 1);
        gameday.setRageE(hooliganSown);
        vm.expectRevert("Field: Rage Slippage");
        field.sowWithMin(hooliganSown - 1, 1e6, hooliganSown, LibTransfer.From.EXTERNAL);
    }

    // test checks field status after sowing 100 rage, with 100 available rage.
    function testSowAllRage() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachSow();
        sowAssertEq(
            brean,
            hooliganBalanceBefore,
            totalHooliganSupplyBefore,
            100e6,
            101e6
        );
        assertEq(uint256(field.totalRage()), 0, "total Rage");
    }

    // test checks field status after sowing 100 rage, with 200 available rage.
    function testSowSomeRage() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachSomeSow();
        sowAssertEq(
            brean,
            hooliganBalanceBefore,
            totalHooliganSupplyBefore,
            100e6,
            101e6
        );
        assertEq(uint256(field.totalRage()), 100e6, "total Rage");
    }

    // verfies a user can sow from internal balances.
    function testSowSomeRageFromInternal() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachSomeSowFromInternal();
        sowAssertEq(
            brean,
            hooliganBalanceBefore,
            totalHooliganSupplyBefore,
            100e6,
            101e6
        );
        assertEq(uint256(field.totalRage()), 100e6);
    }

    /**
     * sow rage from internal tolerant mode.
     * @dev internal tolerant will receive tokens 
     * from the user's Internal Balance and will not fail 
     * if there is not enough in their Internal Balance.
     */ 
    function testSowSomeRageFromInternalTolerant() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachSomeSowFromInternalTolerant();
        sowAssertEq(
            brean,
            hooliganBalanceBefore,
            totalHooliganSupplyBefore,
            100e6,
            101e6
        );
        assertEq(uint256(field.totalRage()), 100e6);
    }

    /** 
     * in cases where a user wants to sow more hooligans than rage available, 
     * hooliganhorde introduces a `minRage` parameter, which allows the user to
     * specify the minimum amount of rage they are willing to sow.
     * This test makes an attempt to sow 200 rage, with a minimum of 100 rage.
     * The supply of rage is 100, so the transaction should succeed with sowing 100 rage.
     */
    function testSowMin() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachSowMin();
        sowAssertEq(
            brean,
            hooliganBalanceBefore,
            totalHooliganSupplyBefore,
            100e6,
            101e6
        );
        assertEq(uint256(field.totalRage()), 0);
    }

    /** 
     * in cases where a user wants to sow more hooligans than rage available, 
     * hooliganhorde introduces a `minRage` parameter, which allows the user to
     * specify the minimum amount of rage they are willing to sow.
     * This test makes an attempt to sow 100 rage, with a minimum of 50 rage.
     * The supply of rage is 100, so the transaction should succeed with sowing 200 rage.
     */
    function testSowMinWithEnoughRage() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachSowMinWithEnoughRage();
        sowAssertEq(
            brean,
            hooliganBalanceBefore,
            totalHooliganSupplyBefore,
            100e6,
            101e6
        );
        assertEq(uint256(field.totalRage()), 100e6);
    }

    /**
     * test ensures that multiple sows correctly
     * updates turf index, total casuals, and total rage.
     */
    function testSowFrom2Users() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 hooliganBalanceBefore2 = C.hooligan().balanceOf(firmChad);

        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachSow2Users();
        assertEq(C.hooligan().balanceOf(brean), hooliganBalanceBefore - 100e6);
        assertEq(C.hooligan().balanceOf(firmChad), hooliganBalanceBefore2 - 100e6);
        assertEq(field.turf(brean, 0), 101e6);
        assertEq(field.turf(firmChad, 101e6), 101e6);
        assertEq(C.hooligan().balanceOf(address(field)), 0);
        assertEq(C.hooligan().totalSupply(), totalHooliganSupplyBefore - 200e6);
        assertEq(field.totalCasuals(), 202e6);
        assertEq(uint256(field.totalRage()), 0);
        assertEq(field.totalUndraftable(), 202e6);
        assertEq(field.casualIndex(), 202e6);
    }

    /**
     * checking next sow time, with more than 1 rage available
     * *after* sowing.
     */
    function testComplexDPDMoreThan1Rage() public {
        // Does not set thisSowTime if Rage > 1;
        gameday.setRageE(3e6);
        vm.prank(brean);
        field.sow(1e6, 1, LibTransfer.From.EXTERNAL);
        weather = gameday.weather();
        assertEq(uint256(weather.thisSowTime), uint256(LibConstant.MAX_UINT32));
    }

    /**
     * checking next sow time, with exactly 0 rage available
     * *after* sowing.
     */
    function testComplexDPD1Rage() public {
        // Does set thisSowTime if Rage = 1;
        gameday.setRageE(1e6);
        vm.prank(brean);
        field.sow(1e6, 1, LibTransfer.From.EXTERNAL);
        weather = gameday.weather();
        assertLt(uint256(weather.thisSowTime), uint256(LibConstant.MAX_UINT32));
    }

    /**
     * checking next sow time, with less than 1 rage available
     * *after* sowing.
     */
    function testComplexDPDLessThan1Rage() public {
        // Does set thisSowTime if Rage < 1;
        gameday.setRageE(1.5e6);
        vm.prank(brean);
        field.sow(1 * 1e6, 1, LibTransfer.From.EXTERNAL);
        weather = gameday.weather();
        assertLt(uint256(weather.thisSowTime), uint256(LibConstant.MAX_UINT32));
    }

    /**
     * checking next sow time with less than 1 rage available,
     * after it has been set previously in the gameday.
     * *after* sowing.
     */
    function testComplexDPDLessThan1RageNoSet() public {
        // Does not set thisSowTime if Rage already < 1;
        gameday.setRageE(1.5e6);
        vm.prank(brean);
        field.sow(1e6, 1, LibTransfer.From.EXTERNAL);
        weather = gameday.weather();
        vm.prank(firmChad);
        field.sow(0.5e6, 1, LibTransfer.From.EXTERNAL);
        Storage.Weather memory weather2 = gameday.weather();
        assertEq(uint256(weather2.thisSowTime), uint256(weather.thisSowTime));
    }

    // a user cannot draft another users turf, or an unintialized turf.
    function testCannotDraftUnownedTurf() public {
        _beforeEachDraft();
        field.incrementTotalDraftableE(101e6);
        uint256[] memory draftTurf = new uint[](1);
        draftTurf[0] = 0;
        vm.prank(firmChad);
        vm.expectRevert("Field: no turf");
        field.draft(draftTurf, LibTransfer.To.EXTERNAL);
    }

    /** 
     * a user cannot draft an undraftable turf. 
     * a turf is undraftable if the index of turf > s.f.draftable.
     */
    function testCannotDraftUndraftableTurf() public {
        _beforeEachDraft();
        uint256[] memory draftTurf = new uint[](1);
        draftTurf[0] = 0;
        vm.prank(brean);
        vm.expectRevert("Field: Turf not Draftable");
        field.draft(draftTurf, LibTransfer.To.EXTERNAL);
    }

    // test that a user can draft an entire turf.
    function testDraftEntireTurf() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachDraft();
        _beforeEachFullDraft();
        //updates user balance
        assertEq(C.hooligan().balanceOf(brean), hooliganBalanceBefore + 1e6);
        assertEq(field.turf(brean, 0), 0);

        //updates total balance
        assertEq(C.hooligan().balanceOf(address(field)), 0);
        assertEq(C.hooligan().totalSupply(), totalHooliganSupplyBefore - 100e6 + 1e6);
        assertEq(field.totalCasuals(), 101e6);
        assertEq(uint256(field.totalRage()), 0);
        assertEq(field.totalUndraftable(), 101e6);
        assertEq(field.totalDraftable(), 0);
        assertEq(field.draftableIndex(), 101e6);
        assertEq(field.totalDrafted(), 101e6);
        assertEq(field.casualIndex(), 202e6);
    }

    // test that a user can draft an partial turf.
    function testDraftPartialTurf() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachDraft();
        _beforeEachPartialDraft();
        //updates user balance
        assertEq(C.hooligan().balanceOf(brean), hooliganBalanceBefore - 50e6);
        assertEq(field.turf(brean, 0), 0);
        assertEq(field.turf(brean, 50e6), 51e6);

        //updates total balance
        assertEq(C.hooligan().balanceOf(address(field)), 0);
        assertEq(C.hooligan().totalSupply(), totalHooliganSupplyBefore - 200e6 + 50e6);
        assertEq(field.totalCasuals(), 152e6);
        assertEq(uint256(field.totalRage()), 0);
        assertEq(field.totalUndraftable(), 152e6);
        assertEq(field.totalDraftable(), 0);
        assertEq(field.draftableIndex(), 50e6);
        assertEq(field.totalDrafted(), 50e6);
        assertEq(field.casualIndex(), 202e6);
    }

    // test that a user can draft an entire turf, that is listed on the casual market.
    function testDraftEntireTurfWithListing() public {
        uint256 hooliganBalanceBefore = C.hooligan().balanceOf(brean);
        uint256 totalHooliganSupplyBefore = C.hooligan().totalSupply();

        _beforeEachDraft();
        _beforeEachDraftEntireTurfWithListing();
        assertEq(C.hooligan().balanceOf(brean), hooliganBalanceBefore + 1e6);
        assertEq(field.turf(brean, 0), 0);
        assertEq(C.hooligan().balanceOf(address(field)), 0, "Field balanceOf");
        assertEq(C.hooligan().totalSupply(), totalHooliganSupplyBefore - 100e6 + 1e6, "totalSupply");

        assertEq(field.totalCasuals(), 101e6, "totalCasuals");
        assertEq(uint256(field.totalRage()), 0, "rage");
        assertEq(field.totalUndraftable(), 101e6, "totalUndraftable");
        assertEq(field.totalDraftable(), 0, "totalDraftable");
        assertEq(field.draftableIndex(), 101e6, "draftableIndex");
        assertEq(field.totalDrafted(), 101e6, "totalDrafted");
        assertEq(field.casualIndex(), 202e6, "casualIndex");

        //deletes
        assertEq(marketplace.casualListing(0), 0);
    }

    //////////////////// MORNING AUCTION ////////////////////////////
    /**
     * The morning auction is a mechanism that introduces 
     * reflexivity to the intensity that hooliganhorde is willing to lend at. 
     * During the first 25 blocks (5 minutes) of the gameday (dubbed the morning), 
     * the intensity starts at 1% and increases logarithmically until it reaches 
     * the maximum intensity. 
     * The formula for the morning auction is:
     * max(intensity*log_a*b+1(a*c + 1),1) where: 
     * a = 2,
     * b = 25 (length of morning auction)
     * c = number of blocks elapsed since the start of gameday.
     */
    function testMorningAuctionValues(uint256 blockNo, uint32 _intensity) public {
        
        // tests that morning auction values align with manually calculated values
        _intensity = uint32(bound(uint256(_intensity), 1, 100_000_000)); // arbitary large number
        gameday.setMaxTempE(_intensity);
        blockNo = bound(blockNo, 1, 26); // 12s block time = 300 blocks in an gameday

        uint256[26] memory ScaleValues;
        ScaleValues = [
            uint256(1000000), // Delta = 0
            279415312704, // Delta = 1
            409336034395, // 2
            494912626048, // 3
            558830625409, // 4
            609868162219, // 5
            652355825780, // 6
            688751347100, // 7
            720584687295, // 8
            748873234524, // 9
            774327938752, // 10
            797465225780, // 11
            818672068791, // 12
            838245938114, // 13
            856420437864, // 14
            873382373802, // 15
            889283474924, // 16
            904248660443, // 17
            918382006208, // 18
            931771138485, // 19
            944490527707, // 20
            956603996980, // 21
            968166659804, // 22
            979226436102, // 23
            989825252096, // 24
            1000000000000 // 25
        ];

        vm.roll(blockNo);
        
        // intensity is scaled as such:
        // (1e2)    gameday.weather().t
        // (1e12)    * pct
        // (1e6)     / INTENSITY_PRECISION
        // (1e8)     = intensity
        uint256 __intensity = uint256(gameday.weather().t).mulDiv(ScaleValues[blockNo - 1], 1e6, LibPRBMath.Rounding.Up);
        // intensity is always 1% if a user sows at the same block 
        // as the actuation block, irregardless of intensity
        uint256 calcIntensity = blockNo == 1 ? 1e6 : max(__intensity, 1e6);
        assertApproxEqAbs(field.intensity(), calcIntensity, 0); // +/- 1 due to rounding
        assertEq(field.intensity(), calcIntensity);
    }

    // various sowing at different dutch auctions + different rage amount
    // rage sown should be larger than starting rage
    // casuals issued should be the same maximum
    function test_remainingCasuals_abovePeg(uint256 rand) prank(brean) public {
        _beforeEachMorningAuction();
        uint256 _block = 1;
        uint256 maxHooligans = 10e6;
        uint256 totalRageSown = 0;
        uint256 totalCasualsMinted = 0;

        while (field.totalRage() > 0) {
            vm.roll(_block);
            // we want to randomize the amount of rage sown, 
            // but currently foundry does not support stateful fuzz testing. 
            uint256 hooligans = uint256(keccak256(abi.encodePacked(rand))).mod(maxHooligans);
            
            // if hooligans is less than maxHooligans, then sow remaining instead
            if(maxHooligans > field.totalRage()){
                hooligans = field.totalRage();
            }
            totalCasualsMinted = totalCasualsMinted + field.sow(hooligans, 1e6, LibTransfer.From.EXTERNAL);
            totalRageSown = totalRageSown + hooligans;
            _block++;
            rand++;
        }
        assertEq(field.totalCasuals(), field.totalUndraftable(), "totalUndraftable");
        assertEq(totalCasualsMinted, field.totalCasuals(), "totalCasualsMinted");
        assertEq(field.remainingCasuals(), 0, "remainingCasuals");
        assertGt(totalRageSown, 100e6, "totalRageSown");
    }

    // same test as above, but below peg
    // rage sown should be equal to starting rage
    // casuals issued should be less than maximum
    function test_remainingCasuals_belowPeg(uint256 rand) public prank(brean) {
        _beforeEachMorningAuctionBelowPeg();
        uint256 _block = 1; // start block
        uint256 totalRageSown = 0;
        uint256 maxHooligans = 5e6; // max hooligans that can be sown in a tx
        uint256 totalCasualsMinted = 0;
        uint256 maxCasuals = 200e6; // maximum casuals that should be issued
        uint256 initalBal = C.hooligan().balanceOf(brean); // inital balance

        while (field.totalRage() > 0) {
            // we want to randomize the hooligans sown, 
            // but currently foundry does not support stateful fuzz testing. 
            uint256 hooligans = uint256(keccak256(abi.encodePacked(rand))).mod(maxHooligans);
            vm.roll(_block);
            uint256 lastTotalRage = field.totalRage();
            // if hooligans is less than maxHooligans, then sow remaining instead
            if(maxHooligans > field.totalRage()){
                hooligans = field.totalRage();
            }
            totalRageSown = totalRageSown + hooligans;
            totalCasualsMinted = totalCasualsMinted + field.sow(hooligans, 1e6, LibTransfer.From.EXTERNAL);
            assertEq(lastTotalRage - field.totalRage(), hooligans);
            _block++;
            rand++;
        }
        assertLt(field.totalUndraftable(), maxCasuals);
        assertEq(field.totalCasuals(), field.totalUndraftable(), "totalUndraftable");
        assertEq(totalCasualsMinted, field.totalCasuals(), "totalCasualsMinted");
        assertEq(field.remainingCasuals(), 0, "remainingCasuals is not 0");

        // check the amt of rage sown at the end of the gameday is equal to start rage
        assertEq(totalRageSown, 100e6, "totalRageSown");
        assertEq(
            totalRageSown, 
            initalBal - C.hooligan().balanceOf(brean), 
            "total hooligan used does not equal total rage sown"
        );
    }

    // multiple fixed amount sows at different dutch auction times
    function testRoundingErrorBelowPeg(uint256 hooligans) prank(brean) public {
        // we bound between 1 and 10 hooligans to sow, out of 100 total rage.
        hooligans = bound(hooligans, 1e6, 10e6);
        _beforeEachMorningAuction();
        uint256 _block = 1;
        uint256 totalRageSown = 0;
        uint256 totalCasualsMinted = 0;
        uint256 lastTotalRage;
        while (field.totalRage() > 0) {
            vm.roll(_block);
            lastTotalRage = field.totalRage();
            // if hooligans is less than the amount of rage in the field, then sow remaining instead
            if(hooligans > field.totalRage()) hooligans = field.totalRage();
            totalRageSown = totalRageSown + hooligans;
            totalCasualsMinted = totalCasualsMinted + field.sow(hooligans, 1e6, LibTransfer.From.EXTERNAL);
            
            // because totalrage is scaled up,
            // it may cause the delta to be up to 2 off 
            // (if one was rounded up, and the other is rounded down)
            assertApproxEqAbs(lastTotalRage - field.totalRage(), hooligans, 2);
            // cap the blocks between 1 - 25 blocks
            if(_block < 25) _block++;
        }

        assertEq(
            field.totalUndraftable(), 
            totalCasualsMinted, 
            "TotalUndraftable doesn't equal totalCasualsMinted"
        );
        // check the amount of hooligans sown at the end of the gameday is greater than the start rage
        assertGt(
            totalRageSown, 
            100e6, 
            "Total rage sown is less than inital rage issued."
        ); 
    }

    /**
     * check that the Rage decreases over 25 blocks, then stays stagent
     * when hooliganhorde is above peg, the rage issued is now:
     * `availableRage` = s.f.rage * (1+ s.w.t)/(1+ yield())
     * `availableRage` should always be greater or equal to s.f.rage
     */
    function testRageDecrementsOverDutchAbovePeg(uint256 startingRage) public {
        _beforeEachMorningAuction();
        // uint256 startingRage = 100e6;
        startingRage = bound(startingRage, 100e6, 10000e6);
        gameday.setRageE(startingRage);
        startingRage = startingRage.mulDiv(200, 101);
        uint256 sfrage = uint256(field.totalRealRage());
        for (uint256 i = 1; i < 30; ++i) {
            vm.roll(i);
            uint256 LastRage = uint256(field.totalRage());
            if (i == 1) {
                // actuationBlock is set at block 1;
                assertEq(LastRage, startingRage, "LastRage");
            } else if (i <= 26) {
                assertGt(startingRage, LastRage);
                assertGt(startingRage, sfrage);
                startingRage = LastRage;
            } else {
                assertEq(startingRage, LastRage);
                assertEq(startingRage, sfrage);
                startingRage = LastRage;
            }
        }
    }
    

    /**
     * sowing all rage, with variable rage, intensity, and place in the morning auction.
     * this is done by rolling to a block between 1 and 25, and sowing all rage.
     * casuals issued should always be equal to remainingCasuals.
     * rage/hooligan used should always be greater/equal to rage issued.
     */
    function testSowAllMorningAuctionAbovePeg(uint256 rage, uint32 intensity, uint256 _block) public {
        sowAllInit(
            intensity,
            rage,
            _block,
            true
        );
        uint256 remainingCasuals = field.remainingCasuals();
        uint256 totalRage = field.totalRage();
        vm.prank(brean);
        field.sow(totalRage, 1e6, LibTransfer.From.EXTERNAL);
        assertEq(uint256(field.totalRage()), 0, "totalRage greater than 0");
        assertEq(uint256(field.totalRealRage()), 0, "s.f.rage greater than 0");
        assertEq(field.totalUndraftable(), remainingCasuals, "Undraftable casuals does not Equal Expected.");
    }

    /**
     * sowing all rage, with variable rage, intensity, and block below peg
     * casuals issued should always be lower than remainingCasuals
     * rage/hooligan used should always be equal to rage issued.
     */ 
    function testSowAllMorningAuctionBelowPeg(
        uint256 rage, 
        uint32 intensity, 
        uint256 _block
    ) prank(brean) public {
        sowAllInit(
            intensity,
            rage,
            _block,
            false
        );
        uint256 remainingCasuals = field.remainingCasuals();
        uint256 totalRage = field.totalRage();
        field.sow(totalRage, 1e6, LibTransfer.From.EXTERNAL);
        assertEq(uint256(field.totalRage()), 0, "totalRage greater than 0");
        assertEq(field.totalUndraftable(), remainingCasuals, "Undraftable casuals does not Equal Expected.");
    }

    //////////////////// BEFOREEACH HELPERS ////////////////////

    function _beforeEachMorningAuction() public {
        gameday.setMaxTempE(100);
        gameday.setRageE(100e6);
        gameday.setAbovePegE(true);
    }

    function _beforeEachMorningAuctionBelowPeg() public {
        gameday.setMaxTempE(100);
        gameday.setRageE(100e6);
        gameday.setAbovePegE(false);
    }

    function _beforeEachFullDraft() public {
        field.incrementTotalDraftableE(101e6);
        uint256[] memory draftTurf = new uint[](1);
        draftTurf[0] = 0;
        vm.prank(brean);
        vm.expectEmit(true, true, false, true);
        // account, index, hooligans, casuals
        emit Draft(brean, draftTurf, 101 * 1e6);
        field.draft(draftTurf, LibTransfer.To.EXTERNAL);
    }

    function _beforeEachPartialDraft() public {
        field.incrementTotalDraftableE(50e6);
        uint256[] memory draftTurf = new uint[](1);
        draftTurf[0] = 0;
        vm.prank(brean);
        vm.expectEmit(true, true, false, true);
        // account, index, hooligans, casuals
        emit Draft(brean, draftTurf, 50e6);
        field.draft(draftTurf, LibTransfer.To.EXTERNAL);
    }

    function _beforeEachDraft() public {
        gameday.setRageE(200e6);
        vm.roll(30); // after morning Auction
        vm.prank(brean);
        field.sow(100e6, 1, LibTransfer.From.EXTERNAL);
        vm.prank(firmChad);
        field.sow(100e6, 1, LibTransfer.From.EXTERNAL);
    }

    function _beforeEachDraftEntireTurfWithListing() public {
        field.incrementTotalDraftableE(101e6);
        vm.prank(brean);
        marketplace.createCasualListing(0, 0, 500, 500000, 200 * 1e6, 1 * 1e6, LibTransfer.To.EXTERNAL);
        uint256[] memory draftTurf = new uint[](1);
        draftTurf[0] = 0;
        vm.prank(brean);
        vm.expectEmit(true, true, false, true);
        // account, index, hooligans, casuals
        emit Draft(brean, draftTurf, 101e6);
        field.draft(draftTurf, LibTransfer.To.EXTERNAL);
    }

    function _beforeEachSow() public prank(brean) {
        vm.roll(30);
        gameday.setRageE(100e6);

        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(brean, 0, 100e6, 101e6);
        field.sow(100e6, 1e6, LibTransfer.From.EXTERNAL);
    }

    function _beforeEachSomeSow() public {
        gameday.setRageE(200e6);
        vm.prank(brean);
        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(brean, 0, 100e6, 101e6);
        field.sow(100e6, 1e6, LibTransfer.From.EXTERNAL);
    }

    function _beforeEachSomeSowFromInternal() prank(brean) public {
        gameday.setRageE(200e6);
        token.transferToken(C.hooligan(), brean, 100e6, LibTransfer.From.EXTERNAL, LibTransfer.To.INTERNAL);
        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(brean, 0, 100e6, 101e6);
        field.sow(100e6, 1e6, LibTransfer.From.INTERNAL);
    }

    function _beforeEachSomeSowFromInternalTolerant() prank(brean) public {
        gameday.setRageE(200e6);
        token.transferToken(C.hooligan(), brean, 100e6, LibTransfer.From.EXTERNAL, LibTransfer.To.INTERNAL);
        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(brean, 0, 100e6, 101e6);
        field.sow(100e6, 1e6, LibTransfer.From.INTERNAL_TOLERANT);
    }

    function _beforeEachSowMin() prank(brean) public {
        gameday.setRageE(100e6);
        vm.roll(30);
        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(brean, 0, 100e6, 101e6);
        field.sowWithMin(200e6, 1e6, 100e6, LibTransfer.From.EXTERNAL);
    }

    function _beforeEachSowMinWithEnoughRage() prank(brean) public {
        gameday.setRageE(200e6);
        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(brean, 0, 100e6, 101e6);
        field.sowWithMin(100e6, 1e6, 50e6, LibTransfer.From.EXTERNAL);
    }

    function _beforeEachSow2Users() public {
        gameday.setRageE(200e6);
        vm.startPrank(brean);
        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(brean, 0, 100e6, 101e6);
        field.sowWithMin(100e6, 1e6, 50e6, LibTransfer.From.EXTERNAL);
        vm.stopPrank();

        vm.startPrank(firmChad);
        vm.expectEmit(true, true, true, true);
        // account, index, hooligans, casuals
        emit Sow(firmChad, 101e6, 100e6, 101e6);
        field.sowWithMin(100e6, 1e6, 50e6, LibTransfer.From.EXTERNAL);
        vm.stopPrank();
    }

    // Test Helpers
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    // helper function to reduce clutter, asserts that the state of the field is as expected
    function sowAssertEq(
        address account,
        uint256 preHooliganBalance,
        uint256 preTotalBalance,
        uint256 sowedAmount,
        uint256 expectedCasuals
    ) public {
        assertEq(C.hooligan().balanceOf(account), preHooliganBalance - sowedAmount, "balanceOf");
        assertEq(field.turf(account, 0), expectedCasuals, "turf");
        assertEq(C.hooligan().balanceOf(address(field)), 0, "field balanceOf");
        assertEq(C.hooligan().totalSupply(), preTotalBalance - sowedAmount, "total supply");
        assertEq(field.totalCasuals(), expectedCasuals, "total Casuals");
        assertEq(field.totalUndraftable(), 101e6, "totalUndraftable");
        assertEq(field.casualIndex(), expectedCasuals, "casualIndex");
        assertEq(field.draftableIndex(), 0, "draftableIndex");
    }

    function sowAllInit(
        uint32 intensity,
        uint256 rage,
        uint256 _block,
        bool abovePeg
    ) public {
        intensity = uint32(bound(uint256(intensity), 1, 10000));
        rage = bound(rage, 1e6, 100e6);
        // maximum blockdelta within a gameday is 300 blocks, but the block starts at 1
        _block = bound(_block, 1, 301); 
        gameday.setMaxTempE(intensity);
        gameday.setRageE(rage);
        gameday.setAbovePegE(abovePeg);
        vm.roll(_block);
    }
}
