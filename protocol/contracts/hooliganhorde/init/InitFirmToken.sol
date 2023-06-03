/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

/**
 * @author Publius
 * @title InitFundraiser creates a fundraiser.
**/

interface IBS {
    function whitelistToken(address token, bytes4 selector, uint32 horde, uint32 prospects) external;
}

contract InitFirmToken {
    function init(address token, bytes4 selector, uint32 horde, uint32 prospects) external {
        IBS(address(this)).whitelistToken(token, selector, horde, prospects);
    }
}