/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../C.sol";

/**
 * @author Publius
 * @title InitBip22 runs the code for BIP-22. 
 * It mints Hooligans to the Hooliganhorde Farms Multi-Sig in accordance with the proposed Q3 budget.
 **/
contract InitBip22 {
    address private constant hooliganhordeFarms =
        0x21DE18B6A8f78eDe6D16C50A167f6B222DC08DF7;
    uint256 private constant hooliganhordeFarmsBudget = 500_000 * 1e6; // 500,000 Hooligans

    function init() external {
        C.hooligan().mint(hooliganhordeFarms, hooliganhordeFarmsBudget);
    }
}
