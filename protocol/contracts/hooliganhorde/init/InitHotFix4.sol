/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {AppStorage} from "../AppStorage.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @author Publius
 * @title InitHotFix4
**/
contract InitHotFix4 {
    AppStorage internal s;

    using SafeMath for uint256;

    function init() external {
        // Migrate farmable Hooligans to Legacy V2 system
        // s.v2SIHooligans = s.si.hooligans;
        // s.si.hooligans = 0;

        // Remove all exiting farmable Horde
        // s.s.horde = s.s.horde.sub(s.si.horde);
        // s.si.horde = 0;

        // Increment unclaimed Roots to total for previous misallocation
        // s.unclaimedRoots = s.unclaimedRoots.add(11_941_504_984_220_113_756_780_626_858);
    }
}
