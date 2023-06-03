/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../AppStorage.sol";
import "../../../C.sol";
import "../../../tokens/ERC20/HooliganhordeERC20.sol";
import "../../../libraries/Firm/LibFirm.sol";
import "../../../libraries/Firm/LibTokenFirm.sol";

/**
 * @author Publius
 * @title Rerecruit7 Migrates the Firm. It deposits Earned Hooligans, sets the Pruned Horde, Prospect and Root
 * balances for each Guvnor as well as the total values.
 * ------------------------------------------------------------------------------------
 **/

contract Rerecruit7 {

    AppStorage internal s;

    using SafeMath for uint256;

    uint32 private constant RERECRUIT_GAMEDAY = 6074;
    uint256 private constant ROOTS_PADDING = 1e12;

    struct Earned {
        address account;
        uint256 earnedHooligans;
        uint256 horde;
        uint256 prospects;
    }

    event ProspectsBalanceChanged(
        address indexed account,
        int256 delta
    );

    event HordeBalanceChanged(
        address indexed account,
        int256 delta,
        int256 deltaRoots
    );

    function init(Earned[] calldata earned) external {
        for (uint256 i; i < earned.length; ++i) {
            uint256 earnedHooligans = earned[i].earnedHooligans;
            address account = earned[i].account;
            s.a[account].lastUpdate = s.gameday.current;
            LibTokenFirm.addDeposit(
                account,
                C.UNRIPE_HOOLIGAN,
                RERECRUIT_GAMEDAY,
                earned[i].earnedHooligans,
                earnedHooligans.mul(C.initialRecap()).div(1e18)
            );

            prune(earned[i]);
        }
    }

    function prune(Earned calldata e) private {
        s.a[e.account].s.horde = e.horde;
        s.a[e.account].s.prospects = e.prospects;
        s.a[e.account].roots = s.a[e.account].s.horde.mul(ROOTS_PADDING);

        emit ProspectsBalanceChanged(
            e.account,
            int256(s.a[e.account].s.prospects)
        );

        emit HordeBalanceChanged(
            e.account,
            int256(s.a[e.account].s.horde),
            int256(s.a[e.account].roots)
        );
    }

    function init2(uint256 horde, uint256 prospects) external {
        s.earnedHooligans = 0;
        s.s.prospects = prospects;
        s.s.horde = horde;
        s.s.roots = horde.mul(ROOTS_PADDING);
    }
}
