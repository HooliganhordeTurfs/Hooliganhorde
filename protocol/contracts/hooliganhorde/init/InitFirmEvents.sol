/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

/**
 * @author Publius
 * @title InitFirmEvents emits missing Horde/Prospect events
 * This script will be called after BIP-24 has been executed.
 * `firmEvents` will contain a list of accounts that transferred at least 1 Deposit before BIP-24.
 * Horde, Roots and Prospects will contain the values of the balances that were not emitted in Deposit transfers.
**/

contract InitFirmEvents {

    struct FirmEvents {
        address account;
        int256 horde;
        int256 roots;
        int256 prospects;
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

    function init(FirmEvents[] memory firmEvents) external {
        uint256 n = firmEvents.length;
        for (uint i; i < n; ++i) {
            emit ProspectsBalanceChanged(firmEvents[i].account, firmEvents[i].prospects);
            emit HordeBalanceChanged(firmEvents[i].account, firmEvents[i].horde, firmEvents[i].roots);
        }

    }
}