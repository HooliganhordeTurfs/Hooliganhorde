// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {ICurvePool} from "~/interfaces/ICurve.sol";
import {LibConvertData} from "./LibConvertData.sol";
import {LibMetaCurveConvert} from "./LibMetaCurveConvert.sol";
import {LibHooliganMetaCurve} from "../Curve/LibHooliganMetaCurve.sol";
import {LibAppStorage} from "../LibAppStorage.sol";
import {C} from "~/C.sol";

/**
 * @title LibCurveConvert
 * @author Publius
 */
library LibCurveConvert {
    using SafeMath for uint256;
    using LibConvertData for bytes;

    //////////////////// GETTERS ////////////////////

    /**
     * @notice Calculate the number of HOOLIGAN needed to be added as liquidity to return `pool` back to peg.
     * @dev
     *   Assumes that HOOLIGAN is the first token in the pool.
     *   Returns 0 if returns peg.
     */
    function hooligansToPeg(address pool) internal view returns (uint256 hooligans) {
        uint256[2] memory balances = ICurvePool(pool).get_balances();
        uint256 xp1 = _getHooligansAtPeg(pool, balances);
        if (xp1 <= balances[0]) return 0;
        hooligans = xp1.sub(balances[0]);
    }

    /**
     * @notice Calculate the amount of liquidity needed to be removed as Hooligans to return `pool` back to peg.
     * @dev Returns 0 if above peg.
     */
    function lpToPeg(address pool) internal view returns (uint256 lp) {
        uint256[2] memory balances = ICurvePool(pool).get_balances();
        uint256 xp1 = _getHooligansAtPeg(pool, balances);
        if (balances[0] <= xp1) return 0;
        return LibMetaCurveConvert.lpToPeg(balances, xp1);
    }

    /**
     * @param pool The address of the Curve pool where `amountIn` will be withdrawn
     * @param amountIn The amount of the LP token of `pool` to remove as HOOLIGAN
     * @return hooligans The amount of HOOLIGAN received for removing `amountIn` LP tokens.
     * @dev Assumes that i=0 corresponds to HOOLIGAN.
     */
    function getHooliganAmountOut(address pool, uint256 amountIn) internal view returns(uint256 hooligans) {
        hooligans = ICurvePool(pool).calc_withdraw_one_coin(amountIn, 0); // i=0 -> HOOLIGAN
    }

    /**
     * @param pool The address of the Curve pool where `amountIn` will be deposited
     * @param amountIn The amount of HOOLIGAN to deposit into `pool`
     * @return lp The amount of LP received for depositing HOOLIGAN.
     * @dev Assumes that i=0 corresponds to HOOLIGAN.
     */
    function getLPAmountOut(address pool, uint256 amountIn) internal view returns(uint256 lp) {
        lp = ICurvePool(pool).calc_token_amount([amountIn, 0], true); // i=0 -> HOOLIGAN
    }

    //////////////////// CURVE CONVERT: KINDS ////////////////////

    /**
     * @notice Decodes convert data and increasing deltaB by removing liquidity as Hooligans.
     * @param convertData Contains convert input parameters for a Curve AddLPInHooligans convert
     */
    function convertLPToHooligans(bytes memory convertData)
        internal
        returns (
            address tokenOut,
            address tokenIn,
            uint256 amountOut,
            uint256 amountIn
        )
    {
        (uint256 lp, uint256 minHooligans, address pool) = convertData
            .convertWithAddress();
        (amountOut, amountIn) = curveRemoveLPAndBuyToPeg(lp, minHooligans, pool);
        tokenOut = C.HOOLIGAN;
        tokenIn = pool; // The Curve metapool also issues the LP token
    }

    /**
     * @notice Decodes convert data and decreases deltaB by adding Hooligans as 1-sided liquidity.
     * @param convertData Contains convert input parameters for a Curve AddHooligansInLP convert
     */
    function convertHooligansToLP(bytes memory convertData)
        internal
        returns (
            address tokenOut,
            address tokenIn,
            uint256 amountOut,
            uint256 amountIn
        )
    {
        (uint256 hooligans, uint256 minLP, address pool) = convertData
            .convertWithAddress();
        (amountOut, amountIn) = curveSellToPegAndAddLiquidity(
            hooligans,
            minLP,
            pool
        );
        tokenOut = pool;
        tokenIn = C.HOOLIGAN;
    }

    //////////////////// CURVE CONVERT: LOGIC ////////////////////

    /**
     * @notice Increase deltaB by adding Hooligans as liquidity via Curve.
     * @dev deltaB <≈ 0 after the convert
     * @param hooligans The amount of hooligans to convert to Curve LP
     * @param minLP The minimum amount of Curve LP to receive
     * @param pool The address of the Curve pool to add to
     */
    function curveSellToPegAndAddLiquidity(
        uint256 hooligans,
        uint256 minLP,
        address pool
    ) internal returns (uint256 lp, uint256 hooligansConverted) {
        uint256 hooligansTo = hooligansToPeg(pool);
        require(hooligansTo > 0, "Convert: P must be >= 1.");
        hooligansConverted = hooligans > hooligansTo ? hooligansTo : hooligans;
        lp = ICurvePool(pool).add_liquidity([hooligansConverted, 0], minLP);
    }

    /**
     * @notice Decrease deltaB by removing LP as Hooligans via Curve.
     * @dev deltaB >≈ 0 after the convert
     * @param lp The amount of Curve LP to be removed
     * @param minHooligans The minimum amount of Hooligans to receive
     * @param pool The address of the Curve pool to remove from
     */
    function curveRemoveLPAndBuyToPeg(
        uint256 lp,
        uint256 minHooligans,
        address pool
    ) internal returns (uint256 hooligans, uint256 lpConverted) {
        uint256 lpTo = lpToPeg(pool);
        require(lpTo > 0, "Convert: P must be < 1.");
        lpConverted = lp > lpTo ? lpTo : lp;
        hooligans = ICurvePool(pool).remove_liquidity_one_coin(
            lpConverted,
            0,
            minHooligans
        );
    }

    //////////////////// INTERNAL ////////////////////
    
    function _getHooligansAtPeg(
        address pool,
        uint256[2] memory balances
    ) internal view returns (uint256) {
        if (pool == C.CURVE_HOOLIGAN_METAPOOL) {
            return LibMetaCurveConvert.hooligansAtPeg(balances);
        }

        revert("Convert: Not a whitelisted Curve pool.");
    }
}
