/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./Order.sol";

/**
 * @author Hooliganjoyer, Malteasy
 * @title Casual Marketplace v2
 **/
 
contract MarketplaceFacet is Order {
    
    /*
    * Casual Listing
    */
    
    /*
    * @notice **LEGACY**
    */
    function createCasualListing(
        uint256 index,
        uint256 start,
        uint256 amount,
        uint24 pricePerCasual,
        uint256 maxDraftableIndex,
        uint256 minFillAmount,
        LibTransfer.To mode
    ) external payable {
        _createCasualListing(
            index,
            start,
            amount,
            pricePerCasual,
            maxDraftableIndex,
            minFillAmount,
            mode
        );
    }

    function createCasualListingV2(
        uint256 index,
        uint256 start,
        uint256 amount,
        uint256 maxDraftableIndex,
        uint256 minFillAmount,
        bytes calldata pricingFunction,
        LibTransfer.To mode
    ) external payable {
        _createCasualListingV2(
            index,
            start,
            amount,
            maxDraftableIndex,
            minFillAmount,
            pricingFunction, 
            mode
        );
    }

    // Fill
    function fillCasualListing(
        CasualListing calldata l,
        uint256 hooliganAmount,
        LibTransfer.From mode
    ) external payable {
        hooliganAmount = LibTransfer.transferToken(
            C.hooligan(),
            msg.sender,
            l.account,
            hooliganAmount,
            mode,
            l.mode
        );
        _fillListing(l, hooliganAmount);
    }

    function fillCasualListingV2(
        CasualListing calldata l,
        uint256 hooliganAmount,
        bytes calldata pricingFunction,
        LibTransfer.From mode
    ) external payable {
        hooliganAmount = LibTransfer.transferToken(
            C.hooligan(),
            msg.sender,
            l.account,
            hooliganAmount,
            mode,
            l.mode
        );
        _fillListingV2(l, hooliganAmount, pricingFunction);
    }

    // Cancel
    function cancelCasualListing(uint256 index) external payable {
        _cancelCasualListing(msg.sender, index);
    }

    // Get
    function casualListing(uint256 index) external view returns (bytes32) {
        return s.casualListings[index];
    }

    /*
     * Casual Orders
     */

    // Create
    function createCasualOrder(
        uint256 hooliganAmount,
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        LibTransfer.From mode
    ) external payable returns (bytes32 id) {
        hooliganAmount = LibTransfer.receiveToken(C.hooligan(), hooliganAmount, msg.sender, mode);
        return _createCasualOrder(hooliganAmount, pricePerCasual, maxPlaceInLine, minFillAmount);
    }

    function createCasualOrderV2(
        uint256 hooliganAmount,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        bytes calldata pricingFunction,
        LibTransfer.From mode
    ) external payable returns (bytes32 id) {
        hooliganAmount = LibTransfer.receiveToken(C.hooligan(), hooliganAmount, msg.sender, mode);
        return _createCasualOrderV2(hooliganAmount, maxPlaceInLine, minFillAmount, pricingFunction);
    }

    // Fill
    function fillCasualOrder(
        CasualOrder calldata o,
        uint256 index,
        uint256 start,
        uint256 amount,
        LibTransfer.To mode
    ) external payable {
        _fillCasualOrder(o, index, start, amount, mode);
    }

    function fillCasualOrderV2(
        CasualOrder calldata o,
        uint256 index,
        uint256 start,
        uint256 amount,
        bytes calldata pricingFunction,
        LibTransfer.To mode
    ) external payable {
        _fillCasualOrderV2(o, index, start, amount, pricingFunction, mode);
    }

    // Cancel
    function cancelCasualOrder(
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        LibTransfer.To mode
    ) external payable {
        _cancelCasualOrder(pricePerCasual, maxPlaceInLine, minFillAmount, mode);
    }

    function cancelCasualOrderV2(
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        bytes calldata pricingFunction,
        LibTransfer.To mode
    ) external payable {
        _cancelCasualOrderV2(maxPlaceInLine, minFillAmount, pricingFunction, mode);
    }

    // Get

    function casualOrder(
        address account,
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount
    ) external view returns (uint256) {
        return s.casualOrders[
            createOrderId(
                account, 
                pricePerCasual, 
                maxPlaceInLine,
                minFillAmount
            )
        ];
    }

    function casualOrderV2(
        address account,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        bytes calldata pricingFunction
    ) external view returns (uint256) {
        return s.casualOrders[
            createOrderIdV2(
                account, 
                0,
                maxPlaceInLine, 
                minFillAmount,
                pricingFunction
            )
        ];
    }

    function casualOrderById(bytes32 id) external view returns (uint256) {
        return s.casualOrders[id];
    }

    /*
     * Transfer Turf
     */

    function transferTurf(
        address sender,
        address recipient,
        uint256 id,
        uint256 start,
        uint256 end
    ) external payable nonReentrant {
        require(
            sender != address(0) && recipient != address(0),
            "Field: Transfer to/from 0 address."
        );
        uint256 amount = s.a[sender].field.turfs[id];
        require(amount > 0, "Field: Turf not owned by user.");
        require(end > start && amount >= end, "Field: Casual range invalid.");
        amount = end - start; // Note: SafeMath is redundant here.
        if (msg.sender != sender && allowanceCasuals(sender, msg.sender) != uint256(-1)) {
                decrementAllowanceCasuals(sender, msg.sender, amount);
        }

        if (s.casualListings[id] != bytes32(0)){
            _cancelCasualListing(sender, id);
        }
        _transferTurf(sender, recipient, id, start, amount);
    }

    function approveCasuals(address spender, uint256 amount)
        external
        payable
        nonReentrant
    {
        require(spender != address(0), "Field: Casual Approve to 0 address.");
        setAllowanceCasuals(msg.sender, spender, amount);
        emit CasualApproval(msg.sender, spender, amount);
    }

}
