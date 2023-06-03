/*
 * SPDX-License-Identifier: MIT
 */

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "~/C.sol";
import "~/libraries/Curve/LibHooliganMetaCurve.sol";
import "~/libraries/LibUnripe.sol";

/*
 * @author Publius
 * @title BDVFacet holds the Curve MetaPool BDV function.
 */
contract BDVFacet {
    using SafeMath for uint256;

    function curveToBDV(uint256 amount) public view returns (uint256) {
        return LibHooliganMetaCurve.bdv(amount);
    }

    function hooliganToBDV(uint256 amount) public pure returns (uint256) {
        return amount;
    }

    function unripeLPToBDV(uint256 amount) public view returns (uint256) {
        amount = LibUnripe.unripeToUnderlying(C.UNRIPE_LP, amount);
        amount = LibHooliganMetaCurve.bdv(amount);
        return amount;
    }

    function unripeHooliganToBDV(uint256 amount) public view returns (uint256) {
        return LibUnripe.unripeToUnderlying(C.UNRIPE_HOOLIGAN, amount);
    }

    function bdv(address token, uint256 amount)
        external
        view
        returns (uint256)
    {
        if (token == C.HOOLIGAN) return hooliganToBDV(amount);
        else if (token == C.CURVE_HOOLIGAN_METAPOOL) return curveToBDV(amount);
        else if (token == C.UNRIPE_HOOLIGAN) return unripeHooliganToBDV(amount);
        else if (token == C.UNRIPE_LP) return unripeLPToBDV(amount);
        revert("BDV: Token not whitelisted");
    }
}
