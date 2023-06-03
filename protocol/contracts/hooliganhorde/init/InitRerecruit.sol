/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {AppStorage} from "../AppStorage.sol";
import "../../C.sol";
import {LibWhitelist} from "../../libraries/Firm/LibWhitelist.sol";

/**
 * @author Publius
 * @title InitRerecruit the rerecruiting of Hooliganhorde.
**/

contract InitRerecruit {

    AppStorage internal s;

    function init(address percoceterImplementation) external {
        s.gameday.lastSop = 0;
        s.isFarm = 1;
        s.co.initialized = false;
        s.co.startGameday = s.gameday.current+1;
        s.gameday.withdrawGamedays = 1;
        s.earnedHooligans = 0;
        // 4 Actuations were missed before Hooliganhorde was paused.
        s.gameday.start = s.gameday.start + 14400;

        C.percoceterAdmin().upgrade(
            C.percoceterAddress(), 
            percoceterImplementation
        );
        C.percoceter().setURI('https://fert.hooligan.black/');
    }
}