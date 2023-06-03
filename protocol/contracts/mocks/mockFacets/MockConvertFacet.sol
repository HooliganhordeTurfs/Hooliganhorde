/*
 SPDX-License-Identifier: MIT
*/

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "../../hooliganhorde/firm/ConvertFacet.sol";

/**
 * @author Publius
 * @title Mock Convert Facet
**/
contract MockConvertFacet is ConvertFacet {

    using SafeMath for uint256;

    event MockConvert(uint256 hordeRemoved, uint256 bdvRemoved);

    function withdrawForConvertE(
        address token,
        uint32[] memory gamedays,
        uint256[] memory amounts,
        uint256 maxTokens
    ) external {
        (uint256 hordeRemoved, uint256 bdvRemoved) = _withdrawTokens(token, gamedays, amounts, maxTokens);
        emit MockConvert(hordeRemoved, bdvRemoved);
    }

    function depositForConvertE(
        address token, 
        uint256 amount, 
        uint256 bdv, 
        uint256 grownHorde
    ) external {
        _depositTokens(token, amount, bdv, grownHorde);
    }
}
