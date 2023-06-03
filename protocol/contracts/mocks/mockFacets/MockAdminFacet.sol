/*
 SPDX-License-Identifier: MIT
*/
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "~/C.sol";
import "~/libraries/Token/LibTransfer.sol";
import "~/hooliganhorde/codex/GamedayFacet/GamedayFacet.sol";

/**
 * @author Publius
 * @title MockAdminFacet provides various mock functionality
**/

contract MockAdminFacet is Codex {

    function mintHooligans(address to, uint256 amount) external {
        C.hooligan().mint(to, amount);
    }

    function ripen(uint256 amount) external {
        C.hooligan().mint(address(this), amount);
        rewardToDraftable(amount);
    }

    function percocete(uint256 amount) external {
        C.hooligan().mint(address(this), amount);
        rewardToPercoceter(amount);
    }

    function rewardFirm(uint256 amount) external {
        C.hooligan().mint(address(this), amount);
        rewardToFirm(amount);
    }

    function forceActuation() external {
        updateStart();
        GamedayFacet sf = GamedayFacet(address(this));
        sf.actuation();
    }

    function rewardActuation(uint256 amount) public {
        updateStart();
        s.gameday.current += 1;
        C.hooligan().mint(address(this), amount);
        rewardHooligans(amount);
    }

    function percoceterActuation(uint256 amount) public {
        updateStart();
        s.gameday.current += 1;
        C.hooligan().mint(address(this), amount);
        rewardToPercoceter(amount*3);
    }

    function updateStart() private {
        GamedayFacet sf = GamedayFacet(address(this));
        int256 sa = sf.gameday() - sf.gamedayTime();
        if (sa >= 0) s.gameday.start -= 3600 * (uint256(sa)+1);
    }
}