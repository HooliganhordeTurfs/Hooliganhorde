/**
 * SPDX-License-Identifier: MIT
**/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./CasualTransfer.sol";
import "~/libraries/Token/LibTransfer.sol";
import "~/libraries/LibPolynomial.sol";

/**
 * @author Hooliganjoyer, Malteasy
 * @title Casual Marketplace v2
 **/

contract Listing is CasualTransfer {

    using SafeMath for uint256;

    struct CasualListing {
        address account;
        uint256 index;
        uint256 start;
        uint256 amount;
        uint24 pricePerCasual;
        uint256 maxDraftableIndex;
        uint256 minFillAmount;
        LibTransfer.To mode;
    }

    event CasualListingCreated(
        address indexed account, 
        uint256 index, 
        uint256 start, 
        uint256 amount, 
        uint24 pricePerCasual, 
        uint256 maxDraftableIndex, 
        uint256 minFillAmount,
        bytes pricingFunction,
        LibTransfer.To mode,
        LibPolynomial.PriceType pricingType
    );

    event CasualListingFilled(
        address indexed from,
        address indexed to,
        uint256 index,
        uint256 start,
        uint256 amount,
        uint256 costInHooligans
    );

    event CasualListingCancelled(address indexed account, uint256 index);

    /*
     * Create
     */

    function _createCasualListing(
        uint256 index,
        uint256 start,
        uint256 amount,
        uint24 pricePerCasual,
        uint256 maxDraftableIndex,
        uint256 minFillAmount,
        LibTransfer.To mode
    ) internal {
        uint256 turfSize = s.a[msg.sender].field.turfs[index];
        
        require(turfSize >= (start.add(amount)) && amount > 0, "Marketplace: Invalid Turf/Amount.");
        require(pricePerCasual > 0, "Marketplace: Casual price must be greater than 0.");
        require(s.f.draftable <= maxDraftableIndex, "Marketplace: Expired.");
        
        if (s.casualListings[index] != bytes32(0)) _cancelCasualListing(msg.sender, index);

        s.casualListings[index] = hashListing(start, amount, pricePerCasual, maxDraftableIndex, minFillAmount, mode);

        bytes memory f;
        
        emit CasualListingCreated(msg.sender, index, start, amount, pricePerCasual, maxDraftableIndex, minFillAmount, f, mode, LibPolynomial.PriceType.Fixed);

    }

    function _createCasualListingV2(
        uint256 index,
        uint256 start,
        uint256 amount,
        uint256 maxDraftableIndex,
        uint256 minFillAmount,
        bytes calldata pricingFunction,
        LibTransfer.To mode
    ) internal {
        uint256 turfSize = s.a[msg.sender].field.turfs[index];

        require(turfSize >= (start.add(amount)) && amount > 0, "Marketplace: Invalid Turf/Amount.");
        require(s.f.draftable <= maxDraftableIndex, "Marketplace: Expired.");
        
        if (s.casualListings[index] != bytes32(0)) _cancelCasualListing(msg.sender, index);

        s.casualListings[index] = hashListingV2(
            start, 
            amount, 
            0, 
            maxDraftableIndex, 
            minFillAmount,
            pricingFunction,
            mode
        );
        
        emit CasualListingCreated(
            msg.sender, 
            index, 
            start, 
            amount, 
            0, 
            maxDraftableIndex, 
            minFillAmount,
            pricingFunction,
            mode,
            LibPolynomial.PriceType.Dynamic
        );
    }

    /*
     * Fill
     */

    function _fillListing(CasualListing calldata l, uint256 hooliganAmount) internal {
        bytes32 lHash = hashListing(
                l.start,
                l.amount,
                l.pricePerCasual,
                l.maxDraftableIndex,
                l.minFillAmount,
                l.mode
            );
        
        require(s.casualListings[l.index] == lHash, "Marketplace: Listing does not exist.");
        uint256 turfSize = s.a[l.account].field.turfs[l.index];
        require(turfSize >= (l.start.add(l.amount)) && l.amount > 0, "Marketplace: Invalid Turf/Amount.");
        require(s.f.draftable <= l.maxDraftableIndex, "Marketplace: Listing has expired.");

        uint256 amount = getAmountCasualsFromFillListing(l.pricePerCasual, l.amount, hooliganAmount);

        __fillListing(msg.sender, l, amount, hooliganAmount);
        _transferTurf(l.account, msg.sender, l.index, l.start, amount);

    }

    function _fillListingV2(
        CasualListing calldata l, 
        uint256 hooliganAmount,
        bytes calldata pricingFunction
    ) internal {
        bytes32 lHash = hashListingV2(
            l.start,
            l.amount,
            l.pricePerCasual,
            l.maxDraftableIndex,
            l.minFillAmount,
            pricingFunction,
            l.mode
        );
        
        require(s.casualListings[l.index] == lHash, "Marketplace: Listing does not exist.");

        uint256 turfSize = s.a[l.account].field.turfs[l.index];

        require(turfSize >= (l.start.add(l.amount)) && l.amount > 0, "Marketplace: Invalid Turf/Amount.");
        require(s.f.draftable <= l.maxDraftableIndex, "Marketplace: Listing has expired.");

        uint256 amount = getAmountCasualsFromFillListingV2(l.index.add(l.start).sub(s.f.draftable), l.amount, hooliganAmount, pricingFunction);

        __fillListingV2(msg.sender, l, pricingFunction, amount, hooliganAmount);
        _transferTurf(l.account, msg.sender, l.index, l.start, amount);

    }

    function __fillListing(
        address to,
        CasualListing calldata l,
        uint256 amount,
        uint256 hooliganAmount
    ) private {
        require(amount >= l.minFillAmount, "Marketplace: Fill must be >= minimum amount.");
        require(l.amount >= amount, "Marketplace: Not enough casuals in Listing.");

        delete s.casualListings[l.index];

        if (l.amount > amount) {
            s.casualListings[l.index.add(amount).add(l.start)] = hashListing(
                0,
                l.amount.sub(amount),
                l.pricePerCasual,
                l.maxDraftableIndex,
                l.minFillAmount,
                l.mode
            );
        }

        emit CasualListingFilled(l.account, to, l.index, l.start, amount, hooliganAmount);
    }

    function __fillListingV2(
        address to,
        CasualListing calldata l,
        bytes calldata pricingFunction,
        uint256 amount,
        uint256 hooliganAmount
    ) private {
        require(amount >= l.minFillAmount, "Marketplace: Fill must be >= minimum amount.");
        require(l.amount >= amount, "Marketplace: Not enough casuals in Listing.");

        delete s.casualListings[l.index];

        if (l.amount > amount) {
            s.casualListings[l.index.add(amount).add(l.start)] = hashListingV2(
                0,
                l.amount.sub(amount),
                l.pricePerCasual,
                l.maxDraftableIndex,
                l.minFillAmount,
                pricingFunction,
                l.mode
            );
        }

        emit CasualListingFilled(l.account, to, l.index, l.start, amount, hooliganAmount);
    }

    /*
     * Cancel
     */

    function _cancelCasualListing(address account, uint256 index) internal {
        require(
            s.a[account].field.turfs[index] > 0,
            "Marketplace: Listing not owned by sender."
        );

        delete s.casualListings[index];

        emit CasualListingCancelled(account, index);
    }

    /*
     * Helpers
     */

    function getAmountCasualsFromFillListing(uint24 pricePerCasual, uint256 casualListingAmount, uint256 fillHooliganAmount) internal pure returns (uint256 amount) {
        amount = (fillHooliganAmount * 1000000) / pricePerCasual;
        
        uint256 remainingAmount = casualListingAmount.sub(amount, "Marketplace: Not enough casuals in Listing.");
        if(remainingAmount <= (1000000 / pricePerCasual)) amount = casualListingAmount;
    }

    function getAmountCasualsFromFillListingV2(
        uint256 placeInLine, 
        uint256 casualListingAmount,
        uint256 fillHooliganAmount,
        bytes calldata pricingFunction
    ) public pure returns (uint256 amount) {
        uint256 pricePerCasual = LibPolynomial.evaluatePolynomialPiecewise(pricingFunction, placeInLine);
        amount = (fillHooliganAmount.mul(1000000)) / pricePerCasual;
        
        uint256 remainingAmount = casualListingAmount.sub(amount, "Marketplace: Not enough casuals in Listing.");
        if(remainingAmount <= (1000000 / pricePerCasual)) amount = casualListingAmount;
    }

    function hashListing(
        uint256 start, 
        uint256 amount, 
        uint24 pricePerCasual, 
        uint256 maxDraftableIndex, 
        uint256 minFillAmount,
        LibTransfer.To mode
    ) internal pure returns (bytes32 lHash) {
        if(minFillAmount > 0) lHash = keccak256(abi.encodePacked(start, amount, pricePerCasual, maxDraftableIndex,  minFillAmount, mode == LibTransfer.To.EXTERNAL));
        else lHash = keccak256(abi.encodePacked(start, amount, pricePerCasual, maxDraftableIndex,  mode == LibTransfer.To.EXTERNAL));
    }

    function hashListingV2(
        uint256 start, 
        uint256 amount, 
        uint24 pricePerCasual, 
        uint256 maxDraftableIndex, 
        uint256 minFillAmount,
        bytes calldata pricingFunction,
        LibTransfer.To mode
    ) internal pure returns (bytes32 lHash) {
        require(pricingFunction.length == LibPolynomial.getNumPieces(pricingFunction).mul(168).add(32), "Marketplace: Invalid pricing function.");
        lHash = keccak256(abi.encodePacked(start, amount, pricePerCasual, maxDraftableIndex, minFillAmount, mode == LibTransfer.To.EXTERNAL, pricingFunction));
    }

}
