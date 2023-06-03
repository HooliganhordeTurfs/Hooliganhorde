/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../hooliganhorde/firm/FirmFacet/FirmFacet.sol";
import "../../libraries/Firm/LibWhitelist.sol";

/**
 * @author Publius
 * @title Mock Firm Facet
**/

contract MockFirmFacet is FirmFacet {

    uint256 constant private AMOUNT_TO_BDV_HOOLIGAN_ETH = 119894802186829;
    uint256 constant private AMOUNT_TO_BDV_HOOLIGAN_3CRV = 992035;
    uint256 constant private AMOUNT_TO_BDV_HOOLIGAN_LUSD = 983108;

    using SafeMath for uint256;

    function mockWhitelistToken(address token, bytes4 selector, uint32 horde, uint32 prospects) external {
       LibWhitelist.whitelistToken(token, selector, horde, prospects);
    }

    function mockBDV(uint256 amount) external pure returns (uint256) {
        return amount;
    }

    function mockBDVIncrease(uint256 amount) external pure returns (uint256) {
        return amount.mul(3).div(2);
    }

    function mockUnripeLPDeposit(uint256 t, uint32 _s, uint256 amount, uint256 bdv) external {
        _update(msg.sender);
        if (t == 0) {
            s.a[msg.sender].lp.deposits[_s] += amount;
            s.a[msg.sender].lp.depositProspects[_s] += bdv.mul(4);
        }
        else if (t == 1) LibTokenFirm.addDeposit(msg.sender, C.unripeLPPool1(), _s, amount, bdv);
        else if (t == 2) LibTokenFirm.addDeposit(msg.sender, C.unripeLPPool2(), _s, amount, bdv);
        uint256 unripeLP = getUnripeForAmount(t, amount);
        LibTokenFirm.incrementDepositedToken(C.UNRIPE_LP, unripeLP);
        bdv = bdv.mul(C.initialRecap()).div(1e18);
        uint256 prospects = bdv.mul(s.ss[C.UNRIPE_LP].prospects);
        uint256 horde = bdv.mul(s.ss[C.UNRIPE_LP].horde).add(LibFirm.hordeReward(prospects, gameday() - _s));
        LibFirm.depositFirmAssets(msg.sender, prospects, horde);
    }

    function mockUnripeHooliganDeposit(uint32 _s, uint256 amount) external {
        _update(msg.sender);
        s.a[msg.sender].hooligan.deposits[_s] += amount;
        LibTokenFirm.incrementDepositedToken(C.UNRIPE_HOOLIGAN, amount);
        amount = amount.mul(C.initialRecap()).div(1e18);
        uint256 prospects = amount.mul(s.ss[C.UNRIPE_HOOLIGAN].prospects);
        uint256 horde = amount.mul(s.ss[C.UNRIPE_HOOLIGAN].horde).add(LibFirm.hordeReward(prospects, gameday() - _s));
        LibFirm.depositFirmAssets(msg.sender, prospects, horde);
    }

    function getUnripeForAmount(uint256 t, uint256 amount) private pure returns (uint256) {
        if (t == 0) return amount.mul(AMOUNT_TO_BDV_HOOLIGAN_ETH).div(1e18);
        else if (t == 1) return amount.mul(AMOUNT_TO_BDV_HOOLIGAN_3CRV).div(1e18);
        else return amount.mul(AMOUNT_TO_BDV_HOOLIGAN_LUSD).div(1e18);
    }
}