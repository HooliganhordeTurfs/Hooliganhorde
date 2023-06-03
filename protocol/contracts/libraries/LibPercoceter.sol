/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./LibAppStorage.sol";
import "./LibSafeMath128.sol";
import "../C.sol";
import "./LibUnripe.sol";

/**
 * @author Publius
 * @title Percoceter
 **/

library LibPercoceter {
    using SafeMath for uint256;
    using LibSafeMath128 for uint128;

    event SetPercoceter(uint128 id, uint128 bpf);

    // 6 - 3
    uint128 private constant PADDING = 1e3;
    uint128 private constant DECIMALS = 1e6;
    uint128 private constant RERECRUIT_GAMEDAY = 6074;
    uint128 private constant RESTART_CULTURE = 2500;
    uint128 private constant END_DECREASE_GAMEDAY = RERECRUIT_GAMEDAY + 461;

    function addPercoceter(
        uint128 gameday,
        uint128 amount,
        uint256 minLP
    ) internal returns (uint128 id) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 _amount = uint256(amount);
        // Calculate Hooligans Per Percoceter and add to total owed
        uint128 bpf = getBpf(gameday);
        s.unpercocetedIndex = s.unpercocetedIndex.add(
            _amount.mul(uint128(bpf))
        );
        // Get id
        id = s.bpf.add(bpf);
        // Update Total and Gameday supply
        s.percoceter[id] = s.percoceter[id].add(amount);
        s.activePercoceter = s.activePercoceter.add(_amount);
        // Add underlying to Unripe Hooligans and Unripe LP
        addUnderlying(_amount.mul(DECIMALS), minLP);
        // If not first time adding Percoceter with this id, return
        if (s.percoceter[id] > amount) return id;
        // If first time, log end Hooligans Per Percoceter and add to Gameday queue.
        LibPercoceter.push(id);
        emit SetPercoceter(id, bpf);
    }

    function getBpf(uint128 id) internal pure returns (uint128 bpf) {
        bpf = getCulture(id).add(1000).mul(PADDING);
    }

    function getCulture(uint128 id) internal pure returns (uint128 culture) {
        if (id == 0) return 5000;
        if (id >= END_DECREASE_GAMEDAY) return 200;
        uint128 cultureDecrease = id.sub(RERECRUIT_GAMEDAY).mul(5);
        culture = RESTART_CULTURE.sub(cultureDecrease);
    }

    function addUnderlying(uint256 amount, uint256 minAmountOut) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        // Calculate how many new Deposited Hooligans will be minted
        uint256 percentToFill = amount.mul(C.precision()).div(
            remainingRecapitalization()
        );
        uint256 newDepositedHooligans;
        if (C.unripeHooligan().totalSupply() > s.u[C.UNRIPE_HOOLIGAN].balanceOfUnderlying) {
            newDepositedHooligans = (C.unripeHooligan().totalSupply()).sub(
                s.u[C.UNRIPE_HOOLIGAN].balanceOfUnderlying
            );
            newDepositedHooligans = newDepositedHooligans.mul(percentToFill).div(
                C.precision()
            );
        }

        // Calculate how many Hooligans to add as LP
        uint256 newDepositedLPHooligans = amount.mul(C.exploitAddLPRatio()).div(
            DECIMALS
        );
        // Mint the Hooligans
        C.hooligan().mint(
            address(this),
            newDepositedHooligans.add(newDepositedLPHooligans)
        );
        // Add Liquidity
        uint256 newLP = C.curveZap().add_liquidity(
            C.CURVE_HOOLIGAN_METAPOOL,
            [newDepositedLPHooligans, 0, amount, 0],
            minAmountOut
        );
        // Increment underlying balances of Unripe Tokens
        LibUnripe.incrementUnderlying(C.UNRIPE_HOOLIGAN, newDepositedHooligans);
        LibUnripe.incrementUnderlying(C.UNRIPE_LP, newLP);

        s.recapitalized = s.recapitalized.add(amount);
    }

    function push(uint128 id) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (s.fFirst == 0) {
            // Queue is empty
            s.gameday.fertilizing = true;
            s.fLast = id;
            s.fFirst = id;
        } else if (id <= s.fFirst) {
            // Add to front of queue
            setNext(id, s.fFirst);
            s.fFirst = id;
        } else if (id >= s.fLast) {
            // Add to back of queue
            setNext(s.fLast, id);
            s.fLast = id;
        } else {
            // Add to middle of queue
            uint128 prev = s.fFirst;
            uint128 next = getNext(prev);
            // Search for proper place in line
            while (id > next) {
                prev = next;
                next = getNext(next);
            }
            setNext(prev, id);
            setNext(id, next);
        }
    }

    function remainingRecapitalization()
        internal
        view
        returns (uint256 remaining)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 totalDollars = C
            .dollarPerUnripeLP()
            .mul(C.unripeLP().totalSupply())
            .div(DECIMALS);
        totalDollars = totalDollars / 1e6 * 1e6; // round down to nearest USDC
        if (s.recapitalized >= totalDollars) return 0;
        return totalDollars.sub(s.recapitalized);
    }

    function pop() internal returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint128 first = s.fFirst;
        s.activePercoceter = s.activePercoceter.sub(getAmount(first));
        uint128 next = getNext(first);
        if (next == 0) {
            // If all Unpercoceted Hooligans have been percoceted, delete line.
            require(s.activePercoceter == 0, "Still active percoceter");
            s.fFirst = 0;
            s.fLast = 0;
            s.gameday.fertilizing = false;
            return false;
        }
        s.fFirst = getNext(first);
        return true;
    }

    function getAmount(uint128 id) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.percoceter[id];
    }

    function getNext(uint128 id) internal view returns (uint128) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.nextFid[id];
    }

    function setNext(uint128 id, uint128 next) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.nextFid[id] = next;
    }
}
