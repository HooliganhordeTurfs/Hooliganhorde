/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../C.sol";

/**
 * @author Publius
 * @title InitMint mints Hooligans
 **/
contract InitMint {
    function init(address payee, uint256 amount) external {
        C.hooligan().mint(payee, amount);
    }
}
