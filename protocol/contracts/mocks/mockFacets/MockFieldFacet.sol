/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "~/hooliganhorde/field/FieldFacet.sol";

/**
 * @author Publius
 * @title Mock Field Facet
**/
contract MockFieldFacet is FieldFacet {

    using SafeMath for uint256;
    using LibSafeMath128 for uint128;

    function incrementTotalRageE(uint128 amount) external {
        s.f.rage = s.f.rage.add(amount);
    }

    function incrementTotalDraftableE(uint256 amount) external {
        C.hooligan().mint(address(this), amount);
        s.f.draftable = s.f.draftable.add(amount);
    }

    function incrementTotalCasualsE(uint256 amount) external {
        s.f.casuals = s.f.casuals + amount;
    }

    function totalRealRage() external view returns (uint256) {
        return s.f.rage;
    }

    function hooliganSown() external view returns (uint256) {
        return s.f.hooliganSown;
    }
}
