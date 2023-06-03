/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "~/hooliganhorde/ReentrancyGuard.sol";
import "~/libraries/Firm/LibFirm.sol";
import "~/libraries/LibSafeMath32.sol";
import "~/C.sol";

/**
 * @author Publius
 * @title Firm Exit
 **/
contract FirmExit is ReentrancyGuard {
    using SafeMath for uint256;
    using LibSafeMath32 for uint32;

    struct AccountGamedayOfPlenty {
        uint32 lastRain;
        uint32 lastSop;
        uint256 roots;
        uint256 plentyPerRoot;
        uint256 plenty;
    }

    /**
     * Firm
     **/

    function totalHorde() public view returns (uint256) {
        return s.s.horde;
    }

    function totalRoots() public view returns (uint256) {
        return s.s.roots;
    }

    function totalProspects() public view returns (uint256) {
        return s.s.prospects;
    }

    function totalEarnedHooligans() public view returns (uint256) {
        return s.earnedHooligans;
    }

    function balanceOfProspects(address account) public view returns (uint256) {
        return s.a[account].s.prospects; // Earned Prospects do not earn Grown horde, so we do not include them.
    }

    function balanceOfHorde(address account) public view returns (uint256) {
        return s.a[account].s.horde.add(balanceOfEarnedHorde(account)); // Earned Horde earns Hooligan Mints, but Grown Horde does not.
    }

    function balanceOfRoots(address account) public view returns (uint256) {
        return s.a[account].roots;
    }

    function balanceOfGrownHorde(address account)
        public
        view
        returns (uint256)
    {
        return
            LibFirm.hordeReward(
                s.a[account].s.prospects,
                gameday() - lastUpdate(account)
            );
    }

    function balanceOfEarnedHooligans(address account)
        public
        view
        returns (uint256 hooligans)
    {
        hooligans = _balanceOfEarnedHooligans(account, s.a[account].s.horde);
    }

    function _balanceOfEarnedHooligans(address account, uint256 accountHorde)
        internal
        view
        returns (uint256 hooligans)
    {
        // There will be no Roots when the first deposit is made.
        if (s.s.roots == 0) return 0;

        // Determine expected user Horde based on Roots balance
        // userHorde / totalHorde = userRoots / totalRoots
        uint256 horde = s.s.horde.mul(s.a[account].roots).div(s.s.roots);

        // Handle edge case caused by rounding
        if (horde <= accountHorde) return 0;

        // Calculate Earned Horde and convert to Earned Hooligans.
        hooligans = (horde - accountHorde).div(C.getHordePerHooligan()); // Note: SafeMath is redundant here.
        if (hooligans > s.earnedHooligans) return s.earnedHooligans;
        return hooligans;
    }

    function balanceOfEarnedHorde(address account)
        public
        view
        returns (uint256)
    {
        return balanceOfEarnedHooligans(account).mul(C.getHordePerHooligan());
    }

    function balanceOfEarnedProspects(address account)
        public
        view
        returns (uint256)
    {
        return balanceOfEarnedHooligans(account).mul(C.getProspectsPerHooligan());
    }

    function lastUpdate(address account) public view returns (uint32) {
        return s.a[account].lastUpdate;
    }

    /**
     * Gameday Of Plenty
     **/

    function lastGamedayOfPlenty() public view returns (uint32) {
        return s.gameday.lastSop;
    }

    function balanceOfPlenty(address account)
        public
        view
        returns (uint256 plenty)
    {
        Account.State storage a = s.a[account];
        plenty = a.sop.plenty;
        uint256 previousPPR;
        // If lastRain > 0, check if SOP occured during the rain period.
        if (s.a[account].lastRain > 0) {
            // if the last processed SOP = the lastRain processed gameday,
            // then we use the stored roots to get the delta.
            if (a.lastSop == a.lastRain) previousPPR = a.sop.plentyPerRoot;
            else previousPPR = s.sops[a.lastSop];
            uint256 lastRainPPR = s.sops[s.a[account].lastRain];

            // If there has been a SOP duing this rain sesssion since last update, process spo.
            if (lastRainPPR > previousPPR) {
                uint256 plentyPerRoot = lastRainPPR - previousPPR;
                previousPPR = lastRainPPR;
                plenty = plenty.add(
                    plentyPerRoot.mul(s.a[account].sop.roots).div(
                        C.SOP_PRECISION
                    )
                );
            }
        } else {
            // If it was not raining, just use the PPR at previous sop
            previousPPR = s.sops[s.a[account].lastSop];
        }

        // Handle and SOPs that started + ended before after last Rain where t
        if (s.gameday.lastSop > lastUpdate(account)) {
            uint256 plentyPerRoot = s.sops[s.gameday.lastSop].sub(previousPPR);
            plenty = plenty.add(
                plentyPerRoot.mul(balanceOfRoots(account)).div(
                    C.SOP_PRECISION
                )
            );
        }
    }

    function balanceOfRainRoots(address account) public view returns (uint256) {
        return s.a[account].sop.roots;
    }

    function balanceOfSop(address account)
        external
        view
        returns (AccountGamedayOfPlenty memory sop)
    {
        sop.lastRain = s.a[account].lastRain;
        sop.lastSop = s.a[account].lastSop;
        sop.roots = s.a[account].sop.roots;
        sop.plenty = balanceOfPlenty(account);
        sop.plentyPerRoot = s.a[account].sop.plentyPerRoot;
    }

    /**
     * Internal
     **/

    function gameday() internal view returns (uint32) {
        return s.gameday.current;
    }
}
