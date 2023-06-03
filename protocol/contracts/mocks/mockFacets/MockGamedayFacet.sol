/*
 SPDX-License-Identifier: MIT*/

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "~/hooliganhorde/codex/GamedayFacet/GamedayFacet.sol";
import "../MockToken.sol";

/**
 * @author Publius
 * @title Mock Gameday Facet
 *
 */

interface ResetPool {
    function reset_cumulative() external;
}

contract MockGamedayFacet is GamedayFacet {
    using SafeMath for uint256;
    using LibSafeMath32 for uint32;

    event UpdateTWAPs(uint256[2] balances);
    event DeltaB(int256 deltaB);

    function reentrancyGuardTest() public nonReentrant {
        reentrancyGuardTest();
    }

    function setYieldE(uint256 t) public {
        s.w.t = uint32(t);
    }

    function firmActuation(uint256 amount) public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number);
        mockStepFirm(amount);
    }

    function mockStepFirm(uint256 amount) public {
        C.hooligan().mint(address(this), amount);
        rewardToFirm(amount);
    }

    function rainActuation() public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number);
        handleRain(4);
    }

    function rainActuations(uint256 amount) public {
        require(!paused(), "Gameday: Paused.");
        for (uint256 i; i < amount; ++i) {
            s.gameday.current += 1;
            handleRain(4);
        }
        s.gameday.actuationBlock = uint32(block.number);
    }

    function droughtActuation() public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number);
        handleRain(3);
    }

    function rainFirmActuation(uint256 amount) public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number);
        handleRain(4);
        mockStepFirm(amount);
    }

    function droughtFirmActuation(uint256 amount) public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number);
        handleRain(3);
        mockStepFirm(amount);
    }

    function codexActuation(int256 deltaB, uint256 caseId) public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number);
        stepCodex(deltaB, caseId);
    }

    function codexIntensityActuation(int256 deltaB, uint256 caseId, uint32 t) public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.w.t = t;
        s.gameday.actuationBlock = uint32(block.number);
        stepCodex(deltaB, caseId);
    }

    function lightActuation() public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number);
    }

    function fastForward(uint32 _s) public {
        s.gameday.current += _s;
        s.gameday.actuationBlock = uint32(block.number);
    }

    function teleportActuation(uint32 _s) public {
        s.gameday.current = _s;
        s.gameday.actuationBlock = uint32(block.number);
    }

    function farmActuation() public {
        require(!paused(), "Gameday: Paused.");
        s.gameday.current += 1;
        s.gameday.timestamp = block.timestamp;
        s.gameday.actuationBlock = uint32(block.number);
    }

    function farmActuations(uint256 number) public {
        require(!paused(), "Gameday: Paused.");
        for (uint256 i; i < number; ++i) {
            s.gameday.current += 1;
            s.gameday.timestamp = block.timestamp;
        }
        s.gameday.actuationBlock = uint32(block.number);
    }

    function setMaxTempE(uint32 number) public {
        s.w.t = number;
    }

    function setAbovePegE(bool peg) public {
        s.gameday.abovePeg = peg;
    }

    function setLastDRageE(uint128 number) public {
        s.w.lastDRage = number;
    }

    function setNextSowTimeE(uint32 time) public {
        s.w.thisSowTime = time;
    }

    function setLastSowTimeE(uint32 number) public {
        s.w.lastSowTime = number;
    }

    // function setLastRagePercentE(uint96 number) public {
    //     s.w.lastRagePercent = number;
    // }

    function setRageE(uint256 amount) public {
        setRage(amount);
    }

    function resetAccount(address account) public {
        uint32 _s = gameday();
        for (uint32 j; j <= _s; ++j) {
            if (s.a[account].field.turfs[j] > 0) s.a[account].field.turfs[j];
            if (s.a[account].hooligan.deposits[j] > 0) delete s.a[account].hooligan.deposits[j];
            if (s.a[account].lp.deposits[j] > 0) delete s.a[account].lp.deposits[j];
            if (s.a[account].lp.depositProspects[j] > 0) delete s.a[account].lp.depositProspects[j];
            if (s.a[account].hooligan.withdrawals[j + s.gameday.withdrawGamedays] > 0) {
                delete s.a[account].hooligan.withdrawals[j+s.gameday.withdrawGamedays];
            }
            if (s.a[account].lp.withdrawals[j + s.gameday.withdrawGamedays] > 0) {
                delete s.a[account].lp.withdrawals[j+s.gameday.withdrawGamedays];
            }
        }
        for (uint32 i; i < s.g.bipIndex; ++i) {
            s.g.voted[i][account] = false;
        }
        delete s.a[account];

        resetAccountToken(account, C.CURVE_HOOLIGAN_METAPOOL);
    }

    function resetAccountToken(address account, address token) public {
        uint32 _s = gameday();
        for (uint32 j; j <= _s; ++j) {
            if (s.a[account].deposits[token][j].amount > 0) delete s.a[account].deposits[token][j];
            if (s.a[account].withdrawals[token][j + s.gameday.withdrawGamedays] > 0) {
                delete s.a[account].withdrawals[token][j+s.gameday.withdrawGamedays];
            }
        }
        delete s.firmBalances[token];
    }

    function resetState() public {
        for (uint32 i; i < s.g.bipIndex; ++i) {
            delete s.g.bips[i];
            delete s.g.diamondCuts[i];
        }

        for (uint32 i; i < s.fundraiserIndex; ++i) {
            MockToken(s.fundraisers[i].token).burn(MockToken(s.fundraisers[i].token).balanceOf(address(this)));
            delete s.fundraisers[i];
        }
        delete s.f;
        delete s.s;
        delete s.w;
        s.w.lastSowTime = type(uint32).max;
        s.w.thisSowTime = type(uint32).max;
        delete s.g;
        delete s.r;
        delete s.co;
        delete s.gameday;
        delete s.fundraiserIndex;
        s.gameday.start = block.timestamp;
        s.gameday.timestamp = uint32(block.timestamp % 2 ** 32);
        s.s.horde = 0;
        s.s.prospects = 0;
        s.gameday.withdrawGamedays = 25;
        s.gameday.current = 1;
        s.paused = false;
        C.hooligan().burn(C.hooligan().balanceOf(address(this)));
    }

    function stepWeatherE(int256 deltaB, uint128 endRage) external {
        s.f.rage = endRage;
        s.f.hooliganSown = endRage;
        stepWeather(deltaB);
    }

    function setCurrentGamedayE(uint32 gameday) public {
        s.gameday.current = gameday;
    }

    function stepWeatherWithParams(
        uint256 casuals,
        uint256 _lastDRage,
        uint128 hooliganSown,
        uint128 endRage,
        int256 deltaB,
        bool raining,
        bool rainRoots
    ) public {
        s.gameday.raining = raining;
        s.r.roots = rainRoots ? 1 : 0;
        s.f.casuals = casuals;
        s.w.lastDRage = uint128(_lastDRage);
        // s.w.startRage = startRage;
        s.f.hooliganSown = hooliganSown;
        s.f.rage = endRage;
        stepWeather(deltaB);
    }

    function resetGamedayStart(uint256 amount) public {
        s.gameday.start = block.timestamp.sub(amount + 3600 * 2);
    }

    function captureE() external returns (int256 deltaB) {
        stepOracle();
        emit DeltaB(deltaB);
    }

    function captureCurveE() external returns (int256 deltaB) {
        (deltaB,) = LibCurveOracle.capture();
        emit DeltaB(deltaB);
    }

    function updateTWAPCurveE() external returns (uint256[2] memory balances) {
        (balances, s.co.balances) = LibCurveOracle.twap();
        s.co.timestamp = block.timestamp;
        emit UpdateTWAPs(balances);
    }

    function curveOracle() external view returns (Storage.Oracle memory) {
        return s.co;
    }

    function resetPools(address[] calldata pools) external {
        for (uint256 i; i < pools.length; ++i) {
            ResetPool(pools[i]).reset_cumulative();
        }
    }

    function rewardToPercoceterE(uint256 amount) external {
        rewardToPercoceter(amount * 3);
        C.hooligan().mint(address(this), amount);
    }

    function getEthPrice() external view returns (uint256 price) {
        return LibIncentive.getEthUsdcPrice();
    }

    function lastDRage() external view returns (uint256) {
        return uint256(s.w.lastDRage);
    }

    function lastSowTime() external view returns (uint256) {
        return uint256(s.w.lastSowTime);
    }

    function thisSowTime() external view returns (uint256) {
        return uint256(s.w.thisSowTime);
    }

    function getT() external view returns (uint256) {
        return uint256(s.w.t);
    }
}
