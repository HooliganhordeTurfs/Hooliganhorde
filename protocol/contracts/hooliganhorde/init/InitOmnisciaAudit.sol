/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {AppStorage} from "../AppStorage.sol";
/**
 * @author Publius
 * @title Init Omniscia Audit initializes the Hooliganhorde Diamond.
**/
contract InitOmnisciaAudit {

    AppStorage internal s;
    
    function init() external {
        // s.refundStatus = 1;
        // s.hooliganRefundAmount = 1;
        // s.ethRefundAmount = 1;
    }

}
