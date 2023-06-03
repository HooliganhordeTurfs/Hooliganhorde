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
 * @title Rerecruit5 Redeposits all existing Hooligan Deposits as Unripe Hooligan Deposits
 * ------------------------------------------------------------------------------------
 **/
contract Rerecruit5 {
    AppStorage internal s;

    using SafeMath for uint256;

    event HooliganRemove(
        address indexed account,
        uint32[] crates,
        uint256[] crateHooligans,
        uint256 hooligans
    );

    event AddDeposit(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amounts,
        uint256 bdv
    );

    struct V1Deposit {
        address account;
        uint32[] gamedays;
        uint256[] amounts;
        uint256 amount;
    }

    function init(V1Deposit[] calldata hooliganDeposits) external {
        updateHooliganDeposits(hooliganDeposits);
    }

    function updateHooliganDeposits(V1Deposit[] calldata ds) private {
        for (uint256 i; i < ds.length; ++i) {
            V1Deposit calldata d = ds[i];
            emit HooliganRemove(d.account, d.gamedays, d.amounts, d.amount);

            for (uint256 j; j < d.gamedays.length; ++j) {
                emit AddDeposit(
                    d.account,
                    C.UNRIPE_HOOLIGAN,
                    d.gamedays[j],
                    d.amounts[j],
                    d.amounts[j].mul(C.initialRecap()).div(C.precision())
                );
            }
        }
    }
}
