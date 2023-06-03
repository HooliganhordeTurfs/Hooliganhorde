/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../AppStorage.sol";
import "../../../C.sol";

/**
 * @author Publius
 * @title Rerecruit6 Redeposits all existing LP Tokens Deposits as Unripe Hooligan:3Crv Deposits.
 * ------------------------------------------------------------------------------------
 **/
contract Rerecruit6 {
    AppStorage internal s;

    using SafeMath for uint256;

    event LPRemove(
        address indexed account,
        uint32[] crates,
        uint256[] crateLP,
        uint256 lp
    );
    event RemoveGamedays(
        address indexed account,
        address indexed token,
        uint32[] gamedays,
        uint256[] amounts,
        uint256 amount
    );
    event RemoveGameday(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount
    );

    event AddDeposit(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount,
        uint256 bdv
    );

    struct Deposit {
        address account;
        address token;
        uint32[] gamedays;
        uint256[] amounts;
        uint256[] bdv;
        uint256 amount;
    }

    address private constant HOOLIGAN_ETH =
        0x87898263B6C5BABe34b4ec53F22d98430b91e371;

    uint256 constant private AMOUNT_TO_UNRIPE_HOOLIGAN_ETH = 119894802186829;
    uint256 constant private AMOUNT_TO_UNRIPE_HOOLIGAN_3CRV = 992035;
    uint256 constant private AMOUNT_TO_UNRIPE_HOOLIGAN_LUSD = 983108;

    function init(Deposit[] calldata ds) external {
        for (uint256 i; i < ds.length; ++i) {
            Deposit calldata d = ds[i];
            if (d.token == HOOLIGAN_ETH)
                emit LPRemove(d.account, d.gamedays, d.amounts, d.amount);
            else
                emit RemoveGamedays(
                    d.account,
                    d.token,
                    d.gamedays,
                    d.amounts,
                    d.amount
                );

            for (uint256 j; j < d.gamedays.length; ++j) {
                emit AddDeposit(
                    d.account,
                    C.UNRIPE_LP,
                    d.gamedays[j],
                    getTokenAmount(d.token, d.amounts[j]),
                    d.bdv[j].mul(C.initialRecap()).div(C.precision())
                );
            }
        }
    }

    function getTokenAmount(address token, uint256 amount) private pure returns (uint256) {
        if (token == HOOLIGAN_ETH) return amount * AMOUNT_TO_UNRIPE_HOOLIGAN_ETH / 1e18;
        if (token == C.unripeLPPool1()) return amount * AMOUNT_TO_UNRIPE_HOOLIGAN_3CRV / 1e18;
        else return amount * AMOUNT_TO_UNRIPE_HOOLIGAN_LUSD / 1e18;
    }

    function init2() external {
        s.firmBalances[C.unripeLPPool1()].deposited = 0;
        s.firmBalances[C.unripeLPPool2()].deposited = 0;
    }
}
