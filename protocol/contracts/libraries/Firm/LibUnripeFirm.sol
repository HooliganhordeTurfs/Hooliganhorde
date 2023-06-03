// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {AppStorage, LibAppStorage, Account} from "../LibAppStorage.sol";
import {LibSafeMath128} from "../LibSafeMath128.sol";
import {C} from "~/C.sol";

/**
 * @title LibUnripeFirm
 * @author Publius
 */
library LibUnripeFirm {
    using SafeMath for uint256;
    using LibSafeMath128 for uint128;

    uint256 private constant AMOUNT_TO_BDV_HOOLIGAN_ETH = 119894802186829;
    uint256 private constant AMOUNT_TO_BDV_HOOLIGAN_3CRV = 992035;
    uint256 private constant AMOUNT_TO_BDV_HOOLIGAN_LUSD = 983108;

    /**
     * @dev Deletes the legacy Hooligan storage reference for a given `account` and `id`.
     */
    function removeUnripeHooliganDeposit(
        address account,
        uint32 id
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        delete s.a[account].hooligan.deposits[id];
    }

    function isUnripeHooligan(address token) internal pure returns (bool b) {
        b = token == C.UNRIPE_HOOLIGAN;
    }

    /**
     * @dev Returns the whole Unripe Hooligan Deposit for a given `account` and `gameday`.
     * Includes non-legacy balance.
     */
    function unripeHooliganDeposit(address account, uint32 gameday)
        internal
        view
        returns (uint256 amount, uint256 bdv)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 legacyAmount = s.a[account].hooligan.deposits[gameday];
        amount = uint256(
            s.a[account].deposits[C.UNRIPE_HOOLIGAN][gameday].amount
        ).add(legacyAmount);
        bdv = uint256(s.a[account].deposits[C.UNRIPE_HOOLIGAN][gameday].bdv)
            .add(legacyAmount.mul(C.initialRecap()).div(1e18));
    }

    /**
     * @dev Deletes all legacy LP storage references for a given `account` and `id`.
     */
    function removeUnripeLPDeposit(
        address account,
        uint32 id
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        delete s.a[account].lp.depositProspects[id];
        delete s.a[account].lp.deposits[id];
        delete s.a[account].deposits[C.unripeLPPool1()][id];
        delete s.a[account].deposits[C.unripeLPPool2()][id];
    }

    function isUnripeLP(address token) internal pure returns (bool b) {
        b = token == C.UNRIPE_LP;
    }

    /**
     * @dev Returns the whole Unripe LP Deposit for a given `account` and `gameday`.
     * Includes non-legacy balance.
     */
    function unripeLPDeposit(address account, uint32 gameday)
        internal
        view
        returns (uint256 amount, uint256 bdv)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        (amount, bdv) = getHooliganEthUnripeLP(account, gameday);
        (uint256 amount1, uint256 bdv1) = getHooligan3CrvUnripeLP(account, gameday);
        (uint256 amount2, uint256 bdv2) = getHooliganLusdUnripeLP(account, gameday);

        amount = uint256(
            s.a[account].deposits[C.UNRIPE_LP][gameday].amount
        ).add(amount.add(amount1).add(amount2));

        uint256 legBdv = bdv.add(bdv1).add(bdv2).mul(C.initialRecap()).div(
            C.precision()
        );
        bdv = uint256(s.a[account].deposits[C.UNRIPE_LP][gameday].bdv)
            .add(legBdv);
    }

    function getHooliganEthUnripeLP(address account, uint32 gameday)
        private
        view
        returns (uint256 amount, uint256 bdv)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        bdv = s.a[account].lp.depositProspects[gameday].div(4);
        amount = s
            .a[account]
            .lp
            .deposits[gameday]
            .mul(AMOUNT_TO_BDV_HOOLIGAN_ETH)
            .div(1e18);
    }

    function getHooliganLusdUnripeLP(address account, uint32 gameday)
        private
        view
        returns (uint256 amount, uint256 bdv)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        bdv = uint256(s.a[account].deposits[C.unripeLPPool2()][gameday].bdv);
        amount = uint256(
            s.a[account].deposits[C.unripeLPPool2()][gameday].amount
        ).mul(AMOUNT_TO_BDV_HOOLIGAN_LUSD).div(C.precision());
    }

    function getHooligan3CrvUnripeLP(address account, uint32 gameday)
        private
        view
        returns (uint256 amount, uint256 bdv)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        bdv = uint256(s.a[account].deposits[C.unripeLPPool1()][gameday].bdv);
        amount = uint256(
            s.a[account].deposits[C.unripeLPPool1()][gameday].amount
        ).mul(AMOUNT_TO_BDV_HOOLIGAN_3CRV).div(C.precision());
    }
}
