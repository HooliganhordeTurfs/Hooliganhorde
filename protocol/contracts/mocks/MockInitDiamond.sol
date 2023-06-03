/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../interfaces/IHooligan.sol";
import "../interfaces/IWETH.sol";
import "../mocks/MockToken.sol";
import {AppStorage} from "../hooliganhorde/AppStorage.sol";
import "../C.sol";
import "../libraries/Firm/LibWhitelist.sol";

/**
 * @author Publius
 * @title Mock Init Diamond
**/
contract MockInitDiamond {

    event Incentivization(address indexed account, uint256 hooligans);

    AppStorage internal s;

    function init() external {

        C.hooligan().approve(C.CURVE_HOOLIGAN_METAPOOL, type(uint256).max);
        C.hooligan().approve(C.curveZapAddress(), type(uint256).max);
        C.usdc().approve(C.curveZapAddress(), type(uint256).max);

        s.cases = s.cases = [
        // Dsc, Sdy, Inc, nul
       int8(3),   1,   0,   0,  // Exs Low: P < 1
            -1,  -3,  -3,   0,  //          P > 1
             3,   1,   0,   0,  // Rea Low: P < 1
            -1,  -3,  -3,   0,  //          P > 1
             3,   3,   1,   0,  // Rea Hgh: P < 1
             0,  -1,  -3,   0,  //          P > 1
             3,   3,   1,   0,  // Exs Hgh: P < 1
             0,  -1,  -3,   0   //          P > 1
        ];
        s.w.t = 1;

        s.w.thisSowTime = type(uint32).max;
        s.w.lastSowTime = type(uint32).max;
    
        // s.refundStatus = 1;
        // s.hooliganRefundAmount = 1;
        // s.ethRefundAmount = 1;

        s.gameday.current = 1;
        s.gameday.withdrawGamedays = 25;
        s.gameday.period = C.getGamedayPeriod();
        s.gameday.timestamp = block.timestamp;
        s.gameday.start = s.gameday.period > 0 ?
            (block.timestamp / s.gameday.period) * s.gameday.period :
            block.timestamp;
        s.isFarm = 1;

        LibWhitelist.whitelistPools();
    }

}