/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./ERC20/HooliganhordeERC20.sol";

/**
 * @author Publius
 * @title Unripe Hooligan 3Crv is the Unripe token for the Hooligan3Crv Token.
**/
contract UnripeHooligan3Crv is HooliganhordeERC20  {

    constructor()
    HooliganhordeERC20(msg.sender, "Unripe Hooligan3Crv", "urHOOLIGAN3CRV")
    { }
}
