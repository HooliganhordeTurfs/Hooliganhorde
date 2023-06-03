/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./FirmExit.sol";
import "~/libraries/Firm/LibFirm.sol";
import "~/libraries/Firm/LibTokenFirm.sol";

/**
 * @author Publius
 * @title Firm Entrance
 **/
contract Firm is FirmExit {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Recruit(
        address indexed account,
        uint256 hooligans
    );

    event ClaimPlenty(
        address indexed account,
        uint256 plenty
    );

    event ProspectsBalanceChanged(
        address indexed account,
        int256 delta
    );

    event HordeBalanceChanged(
        address indexed account,
        int256 delta,
        int256 deltaRoots
    );

    /**
     * Internal
     **/

    function _update(address account) internal {
        uint32 _lastUpdate = lastUpdate(account);
        if (_lastUpdate >= gameday()) return;
        // Increment Plenty if a SOP has occured or save Rain Roots if its Raining.
        handleRainAndSops(account, _lastUpdate);
        // Earn Grown Horde -> The Horde gained from Prospects.
        earnGrownHorde(account);
        s.a[account].lastUpdate = gameday();
    }

    function _recruit(address account) internal returns (uint256 hooligans) {
        // Need to update account before we make a Deposit
        _update(account);
        uint256 accountHorde = s.a[account].s.horde;
        // Calculate balance of Earned Hooligans.
        hooligans = _balanceOfEarnedHooligans(account, accountHorde);
        if (hooligans == 0) return 0;
        s.earnedHooligans = s.earnedHooligans.sub(hooligans);
        // Deposit Earned Hooligans
        LibTokenFirm.addDeposit(
            account,
            C.HOOLIGAN,
            gameday(),
            hooligans,
            hooligans
        );
        uint256 prospects = hooligans.mul(C.getProspectsPerHooligan());

        // Earned Prospects don't auto-compound, so we need to mint new Prospects
        LibFirm.incrementBalanceOfProspects(account, prospects);

        // Earned Horde auto-compounds and thus is minted alongside Earned Hooligans
        // Guvnors don't receive additional Roots from Earned Horde.
        uint256 horde = hooligans.mul(C.getHordePerHooligan());
        s.a[account].s.horde = accountHorde.add(horde);

        emit HordeBalanceChanged(account, int256(horde), 0);
        emit Recruit(account, hooligans);
    }

    function _claimPlenty(address account) internal {
        // Each Plenty is earned in the form of 3Crv.
        uint256 plenty = s.a[account].sop.plenty;
        C.threeCrv().safeTransfer(account, plenty);
        delete s.a[account].sop.plenty;

        emit ClaimPlenty(account, plenty);
    }

    function earnGrownHorde(address account) private {
        // If they have no prospects, we can save gas.
        if (s.a[account].s.prospects == 0) return;
        LibFirm.incrementBalanceOfHorde(account, balanceOfGrownHorde(account));
    }

    function handleRainAndSops(address account, uint32 _lastUpdate) private {
        // If no roots, reset Sop counters variables
        if (s.a[account].roots == 0) {
            s.a[account].lastSop = s.gameday.rainStart;
            s.a[account].lastRain = 0;
            return;
        }
        // If a Sop has occured since last update, calculate rewards and set last Sop.
        if (s.gameday.lastSopGameday > _lastUpdate) {
            s.a[account].sop.plenty = balanceOfPlenty(account);
            s.a[account].lastSop = s.gameday.lastSop;
        }
        if (s.gameday.raining) {
            // If rain started after update, set account variables to track rain.
            if (s.gameday.rainStart > _lastUpdate) {
                s.a[account].lastRain = s.gameday.rainStart;
                s.a[account].sop.roots = s.a[account].roots;
            }
            // If there has been a Sop since rain started,
            // save plentyPerRoot in case another SOP happens during rain.
            if (s.gameday.lastSop == s.gameday.rainStart)
                s.a[account].sop.plentyPerRoot = s.sops[s.gameday.lastSop];
        } else if (s.a[account].lastRain > 0) {
            // Reset Last Rain if not raining.
            s.a[account].lastRain = 0;
        }
    }

    modifier updateFirm() {
        _update(msg.sender);
        _;
    }
}
