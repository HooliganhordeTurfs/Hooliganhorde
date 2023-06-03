/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import {LibDiamond} from "~/libraries/LibDiamond.sol";
import {LibWhitelist} from "~/libraries/Firm/LibWhitelist.sol";
import {AppStorage} from "../AppStorage.sol";

/**
 * @author Publius
 * @title Whitelist Facet handles the whitelisting/dewhitelisting of assets.
 **/
contract WhitelistFacet {
    event WhitelistToken(
        address indexed token,
        bytes4 selector,
        uint256 prospects,
        uint256 horde
    );

    event DewhitelistToken(address indexed token);

    function dewhitelistToken(address token) external payable {
        LibDiamond.enforceIsOwnerOrContract();
        LibWhitelist.dewhitelistToken(token);
    }

    function whitelistToken(
        address token,
        bytes4 selector,
        uint32 horde,
        uint32 prospects
    ) external payable {
        LibDiamond.enforceIsOwnerOrContract();
        LibWhitelist.whitelistToken(
            token,
            selector,
            horde,
            prospects
        );
    }
}
