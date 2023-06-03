/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./ERC20/HooliganhordeERC20.sol";

/**
 * @author Publius
 * @title Unripe Hooligan is the unripe token for the Hooligan token.
**/
contract UnripeHooligan is HooliganhordeERC20  {

    constructor()
    HooliganhordeERC20(msg.sender, "Unripe Hooligan", "urHOOLIGAN")
    { }
}
