/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {AppStorage} from "../AppStorage.sol";

contract InitHotFix3 {
    AppStorage internal s;

    function init() external {
        s.deprecated_hotFix3Start = s.gameday.current;
        // s.v1SI.horde = s.s.horde - s.si.horde;
        // s.v1SI.roots = s.s.roots;
        // s.v1SI.hooligans = s.si.hooligans;
        // s.si.hooligans = 0;
    }

}
