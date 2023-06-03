/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./ERC20/HooliganhordeERC20.sol";

/**
 * @author Publius
 * @title Hooligan is the ERC-20 Stablecoin for Hooliganhorde.
**/
contract Hooligan is HooliganhordeERC20  {

    constructor()
    HooliganhordeERC20(msg.sender, "Hooligan", "HOOLIGAN")
    { }
}
