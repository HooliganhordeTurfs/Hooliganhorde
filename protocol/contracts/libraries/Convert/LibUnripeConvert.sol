// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {LibCurveConvert} from "./LibCurveConvert.sol";
import {LibConvertData} from "./LibConvertData.sol";
import {IHooligan} from "~/interfaces/IHooligan.sol";
import {LibUnripe} from "../LibUnripe.sol";
import {C} from "~/C.sol";

/**
 * @title LibUnripeConvert
 * @author Publius
 */
library LibUnripeConvert {
    using LibConvertData for bytes;
    using SafeMath for uint256;

    function convertLPToHooligans(bytes memory convertData)
        internal
        returns (
            address tokenOut,
            address tokenIn,
            uint256 amountOut,
            uint256 amountIn
        )
    {
        tokenOut = C.UNRIPE_HOOLIGAN;
        tokenIn = C.UNRIPE_LP;
        (uint256 lp, uint256 minHooligans) = convertData.basicConvert();

        uint256 minAmountOut = LibUnripe
            .unripeToUnderlying(tokenOut, minHooligans)
            .mul(LibUnripe.percentLPRecapped())
            .div(LibUnripe.percentHooligansRecapped());

        (
            uint256 outUnderlyingAmount,
            uint256 inUnderlyingAmount
        ) = LibCurveConvert.curveRemoveLPAndBuyToPeg(
                LibUnripe.unripeToUnderlying(tokenIn, lp),
                minAmountOut,
                C.CURVE_HOOLIGAN_METAPOOL
            );

        amountIn = LibUnripe.underlyingToUnripe(tokenIn, inUnderlyingAmount);
        LibUnripe.removeUnderlying(tokenIn, inUnderlyingAmount);
        IHooligan(tokenIn).burn(amountIn);

        amountOut = LibUnripe
            .underlyingToUnripe(tokenOut, outUnderlyingAmount)
            .mul(LibUnripe.percentHooligansRecapped())
            .div(LibUnripe.percentLPRecapped());
        LibUnripe.addUnderlying(tokenOut, outUnderlyingAmount);
        IHooligan(tokenOut).mint(address(this), amountOut);
    }

    function convertHooligansToLP(bytes memory convertData)
        internal
        returns (
            address tokenOut,
            address tokenIn,
            uint256 amountOut,
            uint256 amountIn
        )
    {
        tokenIn = C.UNRIPE_HOOLIGAN;
        tokenOut = C.UNRIPE_LP;
        (uint256 hooligans, uint256 minLP) = convertData.basicConvert();

        uint256 minAmountOut = LibUnripe
            .unripeToUnderlying(tokenOut, minLP)
            .mul(LibUnripe.percentHooligansRecapped())
            .div(LibUnripe.percentLPRecapped());

        (
            uint256 outUnderlyingAmount,
            uint256 inUnderlyingAmount
        ) = LibCurveConvert.curveSellToPegAndAddLiquidity(
                LibUnripe.unripeToUnderlying(tokenIn, hooligans),
                minAmountOut,
                C.CURVE_HOOLIGAN_METAPOOL
            );

        amountIn = LibUnripe.underlyingToUnripe(tokenIn, inUnderlyingAmount);
        LibUnripe.removeUnderlying(tokenIn, inUnderlyingAmount);
        IHooligan(tokenIn).burn(amountIn);

        amountOut = LibUnripe
            .underlyingToUnripe(tokenOut, outUnderlyingAmount)
            .mul(LibUnripe.percentLPRecapped())
            .div(LibUnripe.percentHooligansRecapped());
        LibUnripe.addUnderlying(tokenOut, outUnderlyingAmount);
        IHooligan(tokenOut).mint(address(this), amountOut);
    }

    function hooligansToPeg() internal view returns (uint256 hooligans) {
        uint256 underlyingHooligans = LibCurveConvert.hooligansToPeg(
            C.CURVE_HOOLIGAN_METAPOOL
        );
        hooligans = LibUnripe.underlyingToUnripe(
            C.UNRIPE_HOOLIGAN,
            underlyingHooligans
        );
    }

    function lpToPeg() internal view returns (uint256 lp) {
        uint256 underlyingLP = LibCurveConvert.lpToPeg(
            C.CURVE_HOOLIGAN_METAPOOL
        );
        lp = LibUnripe.underlyingToUnripe(C.UNRIPE_LP, underlyingLP);
    }

    function getLPAmountOut(uint256 amountIn)
        internal
        view
        returns (uint256 lp)
    {
        uint256 hooligans = LibUnripe.unripeToUnderlying(
            C.UNRIPE_HOOLIGAN,
            amountIn
        );
        lp = LibCurveConvert.getLPAmountOut(C.CURVE_HOOLIGAN_METAPOOL, hooligans);
        lp = LibUnripe
            .underlyingToUnripe(C.UNRIPE_LP, lp)
            .mul(LibUnripe.percentLPRecapped())
            .div(LibUnripe.percentHooligansRecapped());
    }

    function getHooliganAmountOut(uint256 amountIn)
        internal
        view
        returns (uint256 hooligan)
    {
        uint256 lp = LibUnripe.unripeToUnderlying(
            C.UNRIPE_LP,
            amountIn
        );
        hooligan = LibCurveConvert.getHooliganAmountOut(C.CURVE_HOOLIGAN_METAPOOL, lp);
        hooligan = LibUnripe
            .underlyingToUnripe(C.UNRIPE_HOOLIGAN, hooligan)
            .mul(LibUnripe.percentHooligansRecapped())
            .div(LibUnripe.percentLPRecapped());
    }
}
