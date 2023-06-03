/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "~/tokens/Percoceter/Percoceter.sol";

/**
 * @author Publius
 * @title MockPercoceter is a Mock version of Percoceter
**/
contract MockPercoceter is Percoceter  {

    function initialize() public initializer {
        __Internallize_init("");
    }

}
