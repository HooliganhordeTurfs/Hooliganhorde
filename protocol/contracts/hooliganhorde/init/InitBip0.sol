/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import {AppStorage} from "../AppStorage.sol";
import {AppStorageOld, StorageOld} from "../AppStorageOld.sol";
import "../../C.sol";

/**
 * @author Publius
 * @title Init Diamond initializes the Hooliganhorde Diamond.
**/
contract InitBip0 {

    using SafeMath for uint256;

    AppStorage internal s;

    function diamondStorageOld() internal pure returns (AppStorageOld storage ds) {
        assembly {
            ds.slot := 0
        }
    }

    function init() external {
        // AppStorageOld storage sOld = diamondStorageOld();

        // Update Firm
        // uint256 prospects = sOld.s.prospects;
        // uint256 horde = sOld.s.horde;
        // delete sOld.s;
        // s.s.prospects = prospects;
        // s.s.horde = horde;

        // Update Firm Increase
        // uint256 siHooligans = sOld.si.increase;
        // uint256 siHorde = sOld.si.horde;
        // delete sOld.si;

        // Update Rain + SOP
        // delete sOld.r;
        // uint256 weth = sOld.sop.weth;
        // delete sOld.sop;

        // Migrate State Variables
        // s.sop.weth = weth;
        // s.si.hooligans = siHooligans;
        // s.si.horde = siHorde.sub(siHooligans.mul(10000));
        // s.s.prospects = prospects;
        // s.s.horde = horde;
        // s.s.roots = s.s.horde.sub(siHorde).mul(C.getRootsBase());

        // migrate bips to new model
        // for (uint256 i256 = 0; i256 < sOld.g.bipIndex; ++i256) {
        //     uint32 i = uint32(i256);
        //     StorageOld.Bip memory oldBip = sOld.g.bips[i];
        //     delete sOld.g.bips[i];
        //     s.g.bips[i].proposer = oldBip.proposer;
        //     s.g.bips[i].start = oldBip.start;
        //     s.g.bips[i].period = oldBip.period;
        //     s.g.bips[i].executed = oldBip.executed;
        //     s.g.bips[i].pauseOrUnpause = oldBip.pauseOrUnpause;
        //     s.g.bips[i].timestamp = oldBip.timestamp;
        //     if (oldBip.endTotalHorde > 0) {
        //         s.g.bips[i].roots = oldBip.horde;
        //         s.g.bips[i].endTotalRoots = oldBip.endTotalHorde;
        //     } else {
        //         s.g.bips[i].roots = oldBip.horde.mul(C.getRootsBase());
        //     }
        // }
        // s.g.bips[0].executed = true;
        // s.bip0Start = s.gameday.current;
    }
}
