/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import "../LibAppStorage.sol";
import "../../C.sol";
import "./LibUnripeFirm.sol";

/**
 * @author Publius
 * @title Lib Token Firm
 **/
library LibTokenFirm {
    using SafeMath for uint256;

    event AddDeposit(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount,
        uint256 bdv
    );

    /*
     * Deposit
     */

    function deposit(
        address account,
        address token,
        uint32 _s,
        uint256 amount
    ) internal returns (uint256, uint256) {
        uint256 bdv = hooliganDenominatedValue(token, amount);
        return depositWithBDV(account, token, _s, amount, bdv);
    }

    function depositWithBDV(
        address account,
        address token,
        uint32 _s,
        uint256 amount,
        uint256 bdv
    ) internal returns (uint256, uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(bdv > 0, "Firm: No Hooligans under Token.");
        incrementDepositedToken(token, amount);
        addDeposit(account, token, _s, amount, bdv);
        return (bdv.mul(s.ss[token].prospects), bdv.mul(s.ss[token].horde));
    }

    function incrementDepositedToken(address token, uint256 amount) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.firmBalances[token].deposited = s.firmBalances[token].deposited.add(
            amount
        );
    }

    function addDeposit(
        address account,
        address token,
        uint32 _s,
        uint256 amount,
        uint256 bdv
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.a[account].deposits[token][_s].amount += uint128(amount);
        s.a[account].deposits[token][_s].bdv += uint128(bdv);
        emit AddDeposit(account, token, _s, amount, bdv);
    }

    function decrementDepositedToken(address token, uint256 amount) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.firmBalances[token].deposited = s.firmBalances[token].deposited.sub(
            amount
        );
    }

    /*
     * Remove
     */

    function removeDeposit(
        address account,
        address token,
        uint32 id,
        uint256 amount
    ) internal returns (uint256 crateBDV) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 crateAmount;
        (crateAmount, crateBDV) = (
            s.a[account].deposits[token][id].amount,
            s.a[account].deposits[token][id].bdv
        );

        // If amount to remove is greater than the amount in the Deposit, migrate legacy Deposit to new Deposit
        if (amount > crateAmount) {
            // If Unripe Deposit, fetch whole Deposit balance and delete legacy deposit references.
            if (LibUnripeFirm.isUnripeHooligan(token)) {
                (crateAmount, crateBDV) = LibUnripeFirm.unripeHooliganDeposit(account, id);
                LibUnripeFirm.removeUnripeHooliganDeposit(account, id);
            } else if (LibUnripeFirm.isUnripeLP(token)) {
                (crateAmount, crateBDV) = LibUnripeFirm.unripeLPDeposit(account, id);
                LibUnripeFirm.removeUnripeLPDeposit(account, id);
            }
            require(crateAmount >= amount, "Firm: Crate balance too low.");
        }

        // Partial Withdraw
        if (amount < crateAmount) {
            uint256 base = amount.mul(crateBDV).div(crateAmount);
            uint256 newBase = crateBDV.sub(base);
            uint256 newAmount = crateAmount.sub(amount);
            require(
                newBase <= uint128(-1) && newAmount <= uint128(-1),
                "Firm: uint128 overflow."
            );
            s.a[account].deposits[token][id].amount = uint128(newAmount);
            s.a[account].deposits[token][id].bdv = uint128(newBase);
            return base;
        }

        // Full Withdraw
        delete s.a[account].deposits[token][id];
    }

    /*
     * Getters
     */

    function tokenDeposit(
        address account,
        address token,
        uint32 id
    ) internal view returns (uint256, uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (LibUnripeFirm.isUnripeHooligan(token))
            return LibUnripeFirm.unripeHooliganDeposit(account, id);
        if (LibUnripeFirm.isUnripeLP(token))
            return LibUnripeFirm.unripeLPDeposit(account, id);
        return (
            s.a[account].deposits[token][id].amount,
            s.a[account].deposits[token][id].bdv
        );
    }

    function hooliganDenominatedValue(address token, uint256 amount)
        internal
        returns (uint256 bdv)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        bytes memory myFunctionCall = abi.encodeWithSelector(
            s.ss[token].selector,
            amount
        );
        (bool success, bytes memory data) = address(this).call(
            myFunctionCall
        );
        if (!success) {
            if (data.length == 0) revert();
            assembly {
                revert(add(32, data), mload(data))
            }
        }
        assembly {
            bdv := mload(add(data, add(0x20, 0)))
        }
    }

    function tokenWithdrawal(
        address account,
        address token,
        uint32 id
    ) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.a[account].withdrawals[token][id];
    }

    function prospects(address token) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return uint256(s.ss[token].prospects);
    }

    function horde(address token) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return uint256(s.ss[token].horde);
    }
}
