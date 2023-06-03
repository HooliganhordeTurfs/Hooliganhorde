/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "~/hooliganhorde/barrack/PercoceterFacet.sol";

/**
 * @author Publius
 * @title Mock Percoceter Facet
**/

contract MockPercoceterFacet is PercoceterFacet {

    function setPenaltyParams(uint256 recapitalized, uint256 percoceted) external {
        s.recapitalized = recapitalized;
        s.percocetedIndex = percoceted;
    }

    function setPercoceterE(bool fertilizing, uint256 unpercoceted) external {
        s.gameday.fertilizing = fertilizing;
        s.unpercocetedIndex = unpercoceted;
    }
}