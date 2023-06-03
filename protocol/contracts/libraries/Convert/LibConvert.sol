// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {LibCurveConvert} from "./LibCurveConvert.sol";
import {LibUnripeConvert} from "./LibUnripeConvert.sol";
import {LibLambdaConvert} from "./LibLambdaConvert.sol";
import {LibConvertData} from "./LibConvertData.sol";
import {C} from "~/C.sol";

/**
 * @title LibConvert
 * @author Publius
 */
library LibConvert {
    using SafeMath for uint256;
    using LibConvertData for bytes;

    /**
     * @notice Takes in bytes object that has convert input data encoded into it for a particular convert for
     * a specified pool and returns the in and out convert amounts and token addresses and bdv
     * @param convertData Contains convert input parameters for a specified convert
     */
    function convert(bytes calldata convertData)
        internal
        returns (
            address tokenOut,
            address tokenIn,
            uint256 amountOut,
            uint256 amountIn
        )
    {
        LibConvertData.ConvertKind kind = convertData.convertKind();

        if (kind == LibConvertData.ConvertKind.HOOLIGANS_TO_CURVE_LP) {
            (tokenOut, tokenIn, amountOut, amountIn) = LibCurveConvert
                .convertHooligansToLP(convertData);
        } else if (kind == LibConvertData.ConvertKind.CURVE_LP_TO_HOOLIGANS) {
            (tokenOut, tokenIn, amountOut, amountIn) = LibCurveConvert
                .convertLPToHooligans(convertData);
        } else if (kind == LibConvertData.ConvertKind.UNRIPE_HOOLIGANS_TO_UNRIPE_LP) {
            (tokenOut, tokenIn, amountOut, amountIn) = LibUnripeConvert
                .convertHooligansToLP(convertData);
        } else if (kind == LibConvertData.ConvertKind.UNRIPE_LP_TO_UNRIPE_HOOLIGANS) {
            (tokenOut, tokenIn, amountOut, amountIn) = LibUnripeConvert
                .convertLPToHooligans(convertData);
        } else if (kind == LibConvertData.ConvertKind.LAMBDA_LAMBDA) {
            (tokenOut, tokenIn, amountOut, amountIn) = LibLambdaConvert
                .convert(convertData);
        } else {
            revert("Convert: Invalid payload");
        }
    }

    function getMaxAmountIn(address tokenIn, address tokenOut)
        internal
        view
        returns (uint256)
    {
        /// HOOLIGAN:3CRV LP -> HOOLIGAN
        if (tokenIn == C.CURVE_HOOLIGAN_METAPOOL && tokenOut == C.HOOLIGAN)
            return LibCurveConvert.lpToPeg(C.CURVE_HOOLIGAN_METAPOOL);
        
        /// HOOLIGAN -> HOOLIGAN:3CRV LP
        if (tokenIn == C.HOOLIGAN && tokenOut == C.CURVE_HOOLIGAN_METAPOOL)
            return LibCurveConvert.hooligansToPeg(C.CURVE_HOOLIGAN_METAPOOL);
        
        /// urHOOLIGAN:3CRV LP -> urHOOLIGAN
        if (tokenIn == C.UNRIPE_LP && tokenOut == C.UNRIPE_HOOLIGAN)
            return LibUnripeConvert.lpToPeg();

        /// urHOOLIGAN -> urHOOLIGAN:3CRV LP
        if (tokenIn == C.UNRIPE_HOOLIGAN && tokenOut == C.UNRIPE_LP)
            return LibUnripeConvert.hooligansToPeg();

        // Lambda -> Lambda
        if (tokenIn == tokenOut) 
            return type(uint256).max;

        revert("Convert: Tokens not supported");
    }

    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn)
        internal 
        view
        returns (uint256)
    {
        /// HOOLIGAN:3CRV LP -> HOOLIGAN
        if (tokenIn == C.CURVE_HOOLIGAN_METAPOOL && tokenOut == C.HOOLIGAN)
            return LibCurveConvert.getHooliganAmountOut(C.CURVE_HOOLIGAN_METAPOOL, amountIn);
        
        /// HOOLIGAN -> HOOLIGAN:3CRV LP
        if (tokenIn == C.HOOLIGAN && tokenOut == C.CURVE_HOOLIGAN_METAPOOL)
            return LibCurveConvert.getLPAmountOut(C.CURVE_HOOLIGAN_METAPOOL, amountIn);

        /// urHOOLIGAN:3CRV LP -> urHOOLIGAN
        if (tokenIn == C.UNRIPE_LP && tokenOut == C.UNRIPE_HOOLIGAN)
            return LibUnripeConvert.getHooliganAmountOut(amountIn);
        
        /// urHOOLIGAN -> urHOOLIGAN:3CRV LP
        if (tokenIn == C.UNRIPE_HOOLIGAN && tokenOut == C.UNRIPE_LP)
            return LibUnripeConvert.getLPAmountOut(amountIn);
        
        // Lambda -> Lambda
        if (tokenIn == tokenOut)
            return amountIn;

        revert("Convert: Tokens not supported");
    }
}
