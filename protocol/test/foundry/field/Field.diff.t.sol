// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma abicoder v2;

import "forge-std/Test.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import { LibDibbler } from "~/libraries/LibDibbler.sol";
import { LibIncentive } from "~/libraries/LibIncentive.sol";
import { LibPRBMath } from "~/libraries/LibPRBMath.sol";

/**
 * @dev This is used to test {LibIncentive.fracExp} and 
 * {LibDibbler.morningAuction} functions using differential testing.
 * morningAuction is replicated here as it does not take inputs.
 */
contract FieldDiffTest is Test {
    using Strings for uint256;
    using LibPRBMath for uint256;
    using SafeMath for uint256;

    uint256 private constant INTENSITY_PRECISION = 1e6;

    function testDiff_fracExp(uint256 baseReward, uint256 blocksLate) public {
        vm.assume(blocksLate < 30);
        // max base reward is 100 hooligans
        vm.assume(baseReward < 100e6);

        string[] memory cmds = new string[](7);
        cmds[0] = "python3";
        cmds[1] = "test/foundry/field/auction-math.py";
        cmds[2] = "fracExp";
        cmds[3] = "--input_1";
        cmds[4] = uint256(baseReward).toString();
        cmds[5] = "--input_2";
        cmds[6] = uint256(blocksLate).toString();

        bytes memory data = vm.ffi(cmds);
        uint256 calculatedAns = abi.decode(data, (uint256));
        uint256 actualAns = LibIncentive.fracExp(baseReward, blocksLate);

        assertEq(actualAns, calculatedAns, "fracExp failed");
    }
    function testDiff_morningAuction(uint32 t, uint256 deltaBlocks) public {
        vm.assume(deltaBlocks < 30);

        string[] memory cmds = new string[](7);
        cmds[0] = "python3";
        cmds[1] = "test/foundry/field/auction-math.py";
        cmds[2] = "morningAuctionLog";
        cmds[3] = "--input_1";
        cmds[4] = uint256(t).toString();
        cmds[5] = "--input_2";
        cmds[6] = uint256(deltaBlocks).toString();
        
        bytes memory data = vm.ffi(cmds);
        uint256 calculatedAns = abi.decode(data, (uint256));
        uint256 actualAns = morningIntensity(t, deltaBlocks);
        assertEq(actualAns, calculatedAns, "morniAuction failed");

    }

    /**
     * @dev this copies the logic from {LibDibbler.morningIntensity()},
     * but allows us to set the intensity and block delta
     */
    function morningIntensity(uint32 t, uint256 delta) internal pure returns (uint256 _morningIntensity) {
        // check most likely case first
        if (delta > 24) {
            return uint256(t).mul(INTENSITY_PRECISION);
        }

        // Binary Search
        if (delta < 13) {
            if (delta < 7) { 
                if (delta < 4) {
                    if (delta < 2) {
                        // delta == 0, same block as actuation
                        if (delta < 1) {
                            return INTENSITY_PRECISION;
                        }
                        // delta == 1
                        else {
                            return _scaleIntensity(t, 279415312704);
                        }
                    }
                    if (delta == 2) {
                       return _scaleIntensity(t, 409336034395);
                    }
                    else { // delta == 3
                        return _scaleIntensity(t, 494912626048);
                    }
                }
                if (delta < 6) {
                    if (delta == 4) {
                        return _scaleIntensity(t, 558830625409);
                    }
                    else { // delta == 5
                        return _scaleIntensity(t, 609868162219);
                    }
                }
                else { // delta == 6
                    return _scaleIntensity(t, 652355825780); 
                }
            }
            if (delta < 10) {
                if (delta < 9) {
                    if (delta == 7) {
                        return _scaleIntensity(t, 688751347100);
                    }
                    else { // delta == 8
                        return _scaleIntensity(t, 720584687295);
                    }
                }
                else { // delta == 9
                    return _scaleIntensity(t, 748873234524); 
                }
            }
            if (delta < 12) {
                if (delta == 10) {
                    return _scaleIntensity(t, 774327938752);
                }
                else { // delta == 11
                    return _scaleIntensity(t, 797465225780); 
                }
            }
            else { // delta == 12
                return _scaleIntensity(t, 818672068791); 
            }
        } 
        if (delta < 19){
            if (delta < 16) {
                if (delta < 15) {
                    if (delta == 13) {
                        return _scaleIntensity(t, 838245938114); 
                    }
                    else { // delta == 14
                        return _scaleIntensity(t, 856420437864);
                    }
                }
                else { // delta == 15
                    return _scaleIntensity(t, 873382373802);
                }
            }
            if (delta < 18) {
                if (delta == 16) {
                    return _scaleIntensity(t, 889283474924);
                }
                else { // delta == 17
                    return _scaleIntensity(t, 904248660443);
                }
            }
            return _scaleIntensity(t, 918382006208); // delta == 18
        }
        if (delta < 22) {
            if (delta < 21) {
                if (delta == 19) {
                    return _scaleIntensity(t, 931771138485); 
                }
                else { // delta == 20
                    return _scaleIntensity(t, 944490527707);
                }
            }
            return _scaleIntensity(t, 956603996980); // delta == 21
        }
        if (delta <= 23){ 
            if (delta == 22) {
                return _scaleIntensity(t, 968166659804);
            }
            else { // delta == 23
                return _scaleIntensity(t, 979226436102);
            }
        }
        else { // delta == 24
            return _scaleIntensity(t, 989825252096);
        }
    }

    function _scaleIntensity(uint32 t, uint256 pct) private pure returns (uint256 scaledIntensity) {
        uint256 maxIntensity = t;
        if(maxIntensity == 0) return 0; 
        return LibPRBMath.max(
            // To save gas, `pct` is pre-calculated to 12 digits. Here we
            // perform the following transformation:
            // (1e2)    maxIntensity                100%
            // (1e18)    * pct 
            // (1e12)     / INTENSITY_PRECISION      1%
            // (1e8)     = scaledYield 
            maxIntensity.mulDiv(
                pct, 
                INTENSITY_PRECISION,
                LibPRBMath.Rounding.Up
            ),
            // Floor at INTENSITY_PRECISION (1%)
            INTENSITY_PRECISION
        );
    }
}