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
 * @title Rerecruit3 removes all non-Deposited Hooligans stored in Hooliganhorde.
 * This includes:
 * Draftable Turfs
 * Casual Listings corresponding to Draftable Turfs
 * Casual Orders
 * Hooligan Withdrawals 
 * ------------------------------------------------------------------------------------
 **/
contract Rerecruit3 {
    using SafeMath for uint256;
    AppStorage internal s;

    event Draft(address indexed account, uint256[] turfs, uint256 hooligans);
    event CasualListingCancelled(address indexed account, uint256 indexed index);
    event CasualOrderCancelled(address indexed account, bytes32 id);
    event HooliganClaim(address indexed account, uint32[] withdrawals, uint256 hooligans);

    struct Turfs {
        address account;
        uint256[] turfs;
        uint256 amount;
    }

    struct Withdrawals {
        address account;
        uint32[] gamedays;
        uint256 amount;
    }

    struct Listing {
        address account;
        uint256 turf;
    }

    struct Order {
        address account;
        bytes32 order;
    }

    function init(
        Turfs[] calldata drafts,
        Listing[] calldata casualListings,
        address partialAddress,
        uint256 partialIndex,
        Order[] calldata casualOrders,
        Withdrawals[] calldata withdrawals
    ) external {
        for (uint256 i; i < drafts.length; ++i) {
            draft(drafts[i].account, drafts[i].turfs, drafts[i].amount);
        }
        draftPartial(partialAddress, partialIndex);
        s.f.drafted = s.f.draftable;

        for (uint256 i; i < casualListings.length; ++i) {
            cancelCasualListing(casualListings[i].account, casualListings[i].turf);
        }

        for (uint256 i; i < casualOrders.length; ++i) {
            cancelCasualOrder(casualOrders[i].account, casualOrders[i].order);
        }

        for (uint256 i; i < withdrawals.length; ++i) {
            claimWithdrawals(withdrawals[i].account, withdrawals[i].gamedays, withdrawals[i].amount);
        }
    }

    function claimWithdrawals(address account, uint32[] calldata withdrawals, uint256 amount)
        private
    {
        emit HooliganClaim(account, withdrawals, amount);
    }

    function draft(address account, uint256[] calldata turfs, uint256 amount)
        private
    {
        for (uint256 i; i < turfs.length; ++i) {
            delete s.a[account].field.turfs[turfs[i]];
        }
        emit Draft(account, turfs, amount);
    }

    function draftPartial(address account, uint256 turfId)
        private
    {
        uint256 casuals = s.a[account].field.turfs[turfId];
        uint256 hooligansDrafted = s.f.draftable.sub(turfId);
        delete s.a[account].field.turfs[turfId];
        s.a[account].field.turfs[turfId.add(hooligansDrafted)] = casuals.sub(
            hooligansDrafted
        );
        uint256[] memory turfs = new uint256[](1);
        turfs[0] = turfId;
        emit Draft(account, turfs, hooligansDrafted);
    }

    function cancelCasualListing(address account, uint256 index) internal {
        delete s.casualListings[index];
        emit CasualListingCancelled(account, index);
    }

    function cancelCasualOrder(address account, bytes32 id) internal {
        delete s.casualOrders[id];
        emit CasualOrderCancelled(account, id);
    }
}
