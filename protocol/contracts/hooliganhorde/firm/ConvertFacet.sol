/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "~/C.sol";
import "~/libraries/Firm/LibFirm.sol";
import "~/libraries/Firm/LibTokenFirm.sol";
import "~/libraries/LibSafeMath32.sol";
import "~/libraries/Convert/LibConvert.sol";
import "~/libraries/LibInternal.sol";
import "../ReentrancyGuard.sol";

/**
 * @author Publius
 * @title Firm handles depositing and withdrawing Hooligans and LP, and updating the Firm.
 **/
contract ConvertFacet is ReentrancyGuard {
    using SafeMath for uint256;
    using LibSafeMath32 for uint32;

    event Convert(
        address indexed account,
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 toAmount
    );

    event RemoveDeposits(
        address indexed account,
        address indexed token,
        uint32[] gamedays,
        uint256[] amounts,
        uint256 amount
    );

    struct AssetsRemoved {
        uint256 tokensRemoved;
        uint256 hordeRemoved;
        uint256 bdvRemoved;
    }

    function convert(
        bytes calldata convertData,
        uint32[] memory crates,
        uint256[] memory amounts
    )
        external
        payable
        nonReentrant
        returns (uint32 toGameday, uint256 fromAmount, uint256 toAmount, uint256 fromBdv, uint256 toBdv)
    {
        LibInternal.updateFirm(msg.sender);

        address toToken; address fromToken; uint256 grownHorde;
        (toToken, fromToken, toAmount, fromAmount) = LibConvert.convert(
            convertData
        );

        (grownHorde, fromBdv) = _withdrawTokens(
            fromToken,
            crates,
            amounts,
            fromAmount
        );

        uint256 newBdv = LibTokenFirm.hooliganDenominatedValue(toToken, toAmount);
        toBdv = newBdv > fromBdv ? newBdv : fromBdv;

        toGameday = _depositTokens(toToken, toAmount, toBdv, grownHorde);

        emit Convert(msg.sender, fromToken, toToken, fromAmount, toAmount);
    }

    function _withdrawTokens(
        address token,
        uint32[] memory gamedays,
        uint256[] memory amounts,
        uint256 maxTokens
    ) internal returns (uint256, uint256) {
        require(
            gamedays.length == amounts.length,
            "Convert: gamedays, amounts are diff lengths."
        );
        AssetsRemoved memory a;
        uint256 depositBDV;
        uint256 i = 0;
        while ((i < gamedays.length) && (a.tokensRemoved < maxTokens)) {
            if (a.tokensRemoved.add(amounts[i]) < maxTokens)
                depositBDV = LibTokenFirm.removeDeposit(
                    msg.sender,
                    token,
                    gamedays[i],
                    amounts[i]
                );
            else {
                amounts[i] = maxTokens.sub(a.tokensRemoved);
                depositBDV = LibTokenFirm.removeDeposit(
                    msg.sender,
                    token,
                    gamedays[i],
                    amounts[i]
                );
            }
            a.tokensRemoved = a.tokensRemoved.add(amounts[i]);
            a.bdvRemoved = a.bdvRemoved.add(depositBDV);
            a.hordeRemoved = a.hordeRemoved.add(
                depositBDV.mul(s.gameday.current - gamedays[i])
            );
            i++;
        }
        for (i; i < gamedays.length; ++i) amounts[i] = 0;
        emit RemoveDeposits(
            msg.sender,
            token,
            gamedays,
            amounts,
            a.tokensRemoved
        );

        require(
            a.tokensRemoved == maxTokens,
            "Convert: Not enough tokens removed."
        );
        a.hordeRemoved = a.hordeRemoved.mul(s.ss[token].prospects);
        LibTokenFirm.decrementDepositedToken(token, a.tokensRemoved);
        LibFirm.withdrawFirmAssets(
            msg.sender,
            a.bdvRemoved.mul(s.ss[token].prospects),
            a.hordeRemoved.add(a.bdvRemoved.mul(s.ss[token].horde))
        );
        return (a.hordeRemoved, a.bdvRemoved);
    }

    function _depositTokens(
        address token,
        uint256 amount,
        uint256 bdv,
        uint256 grownHorde
    ) internal returns (uint32 _s) {
        require(bdv > 0 && amount > 0, "Convert: BDV or amount is 0.");

        uint256 prospects = bdv.mul(LibTokenFirm.prospects(token));
        if (grownHorde > 0) {
            _s = uint32(grownHorde.div(prospects));
            uint32 __s = s.gameday.current;
            if (_s >= __s) _s = __s - 1;
            grownHorde = uint256(_s).mul(prospects);
            _s = __s - _s;
        } else _s = s.gameday.current;
        uint256 horde = bdv.mul(LibTokenFirm.horde(token)).add(grownHorde);
        LibFirm.depositFirmAssets(msg.sender, prospects, horde);

        LibTokenFirm.incrementDepositedToken(token, amount);
        LibTokenFirm.addDeposit(msg.sender, token, _s, amount, bdv);
    }

    function getMaxAmountIn(address tokenIn, address tokenOut)
        external
        view
        returns (uint256 amountIn)
    {
        return LibConvert.getMaxAmountIn(tokenIn, tokenOut);
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        return LibConvert.getAmountOut(tokenIn, tokenOut, amountIn);
    }
}
