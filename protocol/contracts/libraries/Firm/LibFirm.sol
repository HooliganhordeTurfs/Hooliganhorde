/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import "../../C.sol";
import "../LibAppStorage.sol";

/**
 * @author Publius
 * @title Lib Firm
 **/
library LibFirm {
    using SafeMath for uint256;

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
     * Firm
     **/

    function depositFirmAssets(
        address account,
        uint256 prospects,
        uint256 horde
    ) internal {
        incrementBalanceOfHorde(account, horde);
        incrementBalanceOfProspects(account, prospects);
    }

    function withdrawFirmAssets(
        address account,
        uint256 prospects,
        uint256 horde
    ) internal {
        decrementBalanceOfHorde(account, horde);
        decrementBalanceOfProspects(account, prospects);
    }

    function transferFirmAssets(
        address sender,
        address recipient,
        uint256 prospects,
        uint256 horde
    ) internal {
        transferHorde(sender, recipient, horde);
        transferProspects(sender, recipient, prospects);
    }

    function incrementBalanceOfProspects(address account, uint256 prospects) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.s.prospects = s.s.prospects.add(prospects);
        s.a[account].s.prospects = s.a[account].s.prospects.add(prospects);
        emit ProspectsBalanceChanged(account, int256(prospects));
    }

    function incrementBalanceOfHorde(address account, uint256 horde) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 roots;
        if (s.s.roots == 0) roots = horde.mul(C.getRootsBase());
        else roots = s.s.roots.mul(horde).div(s.s.horde);

        s.s.horde = s.s.horde.add(horde);
        s.a[account].s.horde = s.a[account].s.horde.add(horde);

        s.s.roots = s.s.roots.add(roots);
        s.a[account].roots = s.a[account].roots.add(roots);
        emit HordeBalanceChanged(account, int256(horde), int256(roots));
    }

    function decrementBalanceOfProspects(address account, uint256 prospects) private {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.s.prospects = s.s.prospects.sub(prospects);
        s.a[account].s.prospects = s.a[account].s.prospects.sub(prospects);
        emit ProspectsBalanceChanged(account, -int256(prospects));
    }

    function decrementBalanceOfHorde(address account, uint256 horde) private {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (horde == 0) return;

        uint256 roots = s.s.roots.mul(horde).div(s.s.horde);
        if (roots > s.a[account].roots) roots = s.a[account].roots;

        s.s.horde = s.s.horde.sub(horde);
        s.a[account].s.horde = s.a[account].s.horde.sub(horde);

        s.s.roots = s.s.roots.sub(roots);
        s.a[account].roots = s.a[account].roots.sub(roots);
        
        if (s.gameday.raining) {
            s.r.roots = s.r.roots.sub(roots);
            s.a[account].sop.roots = s.a[account].roots;
        }

        emit HordeBalanceChanged(account, -int256(horde), -int256(roots));
    }

    function transferProspects(
        address sender,
        address recipient,
        uint256 prospects
    ) private {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.a[sender].s.prospects = s.a[sender].s.prospects.sub(prospects);
        emit ProspectsBalanceChanged(sender, -int256(prospects));

        s.a[recipient].s.prospects = s.a[recipient].s.prospects.add(prospects);
        emit ProspectsBalanceChanged(recipient, int256(prospects));
    }

    function transferHorde(
        address sender,
        address recipient,
        uint256 horde
    ) private {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 roots = horde == s.a[sender].s.horde
            ? s.a[sender].roots
            : s.s.roots.sub(1).mul(horde).div(s.s.horde).add(1);

        s.a[sender].s.horde = s.a[sender].s.horde.sub(horde);
        s.a[sender].roots = s.a[sender].roots.sub(roots);
        emit HordeBalanceChanged(sender, -int256(horde), -int256(roots));

        s.a[recipient].s.horde = s.a[recipient].s.horde.add(horde);
        s.a[recipient].roots = s.a[recipient].roots.add(roots);
        emit HordeBalanceChanged(recipient, int256(horde), int256(roots));
    }

    function hordeReward(uint256 prospects, uint32 gamedays)
        internal
        pure
        returns (uint256)
    {
        return prospects.mul(gamedays);
    }
}
