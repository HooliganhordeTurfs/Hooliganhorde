/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./Listing.sol";

/**
 * @author Hooliganjoyer, Malteasy
 * @title Casual Marketplace v2
 **/

contract Order is Listing {

    using SafeMath for uint256;

    struct CasualOrder {
        address account;
        uint24 pricePerCasual;
        uint256 maxPlaceInLine;
        uint256 minFillAmount;
    }

    event CasualOrderCreated(
        address indexed account,
        bytes32 id,
        uint256 amount,
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        bytes pricingFunction,
        LibPolynomial.PriceType priceType
    );

    event CasualOrderFilled(
        address indexed from,
        address indexed to,
        bytes32 id,
        uint256 index,
        uint256 start,
        uint256 amount,
        uint256 costInHooligans
    );

    event CasualOrderCancelled(address indexed account, bytes32 id);

    /*
    * Create
    */
    // Note: Orders changed and now can accept an arbitary amount of hooligans, possibly higher than the value of the order
    /* Note: Fixed casual orders store at s.casualOrders[id] the amount of casuals that they order 
    * whereas dynamic orders store the amount of hooligans used to make the order 
    */
    function _createCasualOrder(
        uint256 hooliganAmount,
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount
    ) internal returns (bytes32 id) {
        require(hooliganAmount > 0, "Marketplace: Order amount must be > 0.");
        require(pricePerCasual > 0, "Marketplace: Casual price must be greater than 0.");

        id = createOrderId(msg.sender, pricePerCasual, maxPlaceInLine, minFillAmount);

        if (s.casualOrders[id] > 0) _cancelCasualOrder(pricePerCasual, maxPlaceInLine, minFillAmount, LibTransfer.To.INTERNAL);
        s.casualOrders[id] = hooliganAmount;

        bytes memory emptyPricingFunction;
        emit CasualOrderCreated(msg.sender, id, hooliganAmount, pricePerCasual, maxPlaceInLine, minFillAmount, emptyPricingFunction, LibPolynomial.PriceType.Fixed);
    }

    function _createCasualOrderV2(
        uint256 hooliganAmount,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        bytes calldata pricingFunction
    ) internal returns (bytes32 id) {
        require(hooliganAmount > 0, "Marketplace: Order amount must be > 0.");
        id = createOrderIdV2(msg.sender, 0, maxPlaceInLine, minFillAmount, pricingFunction);
        if (s.casualOrders[id] > 0) _cancelCasualOrderV2(maxPlaceInLine, minFillAmount, pricingFunction, LibTransfer.To.INTERNAL);
        s.casualOrders[id] = hooliganAmount;

        emit CasualOrderCreated(msg.sender, id, hooliganAmount, 0, maxPlaceInLine, minFillAmount, pricingFunction, LibPolynomial.PriceType.Dynamic);
    }


    /*
     * Fill
     */
    function _fillCasualOrder(
        CasualOrder calldata o,
        uint256 index,
        uint256 start,
        uint256 amount,
        LibTransfer.To mode
    ) internal {

        require(amount >= o.minFillAmount, "Marketplace: Fill must be >= minimum amount.");
        require(s.a[msg.sender].field.turfs[index] >= (start.add(amount)), "Marketplace: Invalid Turf.");
        require(index.add(start).add(amount).sub(s.f.draftable) <= o.maxPlaceInLine, "Marketplace: Turf too far in line.");
        
        bytes32 id = createOrderId(o.account, o.pricePerCasual, o.maxPlaceInLine, o.minFillAmount);
        uint256 costInHooligans = amount.mul(o.pricePerCasual).div(1000000);
        s.casualOrders[id] = s.casualOrders[id].sub(costInHooligans, "Marketplace: Not enough hooligans in order.");

        LibTransfer.sendToken(C.hooligan(), costInHooligans, msg.sender, mode);
        
        if (s.casualListings[index] != bytes32(0)) _cancelCasualListing(msg.sender, index);
        
        _transferTurf(msg.sender, o.account, index, start, amount);

        if (s.casualOrders[id] == 0) delete s.casualOrders[id];
        
        emit CasualOrderFilled(msg.sender, o.account, id, index, start, amount, costInHooligans);
    }

    function _fillCasualOrderV2(
        CasualOrder calldata o,
        uint256 index,
        uint256 start,
        uint256 amount,
        bytes calldata pricingFunction,
        LibTransfer.To mode
    ) internal {

        require(amount >= o.minFillAmount, "Marketplace: Fill must be >= minimum amount.");
        require(s.a[msg.sender].field.turfs[index] >= (start.add(amount)), "Marketplace: Invalid Turf.");
        require(index.add(start).add(amount).sub(s.f.draftable) <= o.maxPlaceInLine, "Marketplace: Turf too far in line.");
        
        bytes32 id = createOrderIdV2(o.account, 0, o.maxPlaceInLine, o.minFillAmount, pricingFunction);
        uint256 costInHooligans = getAmountHooligansToFillOrderV2(index.add(start).sub(s.f.draftable), amount, pricingFunction);
        s.casualOrders[id] = s.casualOrders[id].sub(costInHooligans, "Marketplace: Not enough hooligans in order.");
        
        LibTransfer.sendToken(C.hooligan(), costInHooligans, msg.sender, mode);
        
        if (s.casualListings[index] != bytes32(0)) _cancelCasualListing(msg.sender, index);
        
        _transferTurf(msg.sender, o.account, index, start, amount);

        if (s.casualOrders[id] == 0) delete s.casualOrders[id];
        
        emit CasualOrderFilled(msg.sender, o.account, id, index, start, amount, costInHooligans);
    }

    /*
     * Cancel
     */
    function _cancelCasualOrder(
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        LibTransfer.To mode
    ) internal {
        bytes32 id = createOrderId(msg.sender, pricePerCasual, maxPlaceInLine, minFillAmount);
        uint256 amountHooligans = s.casualOrders[id];
        LibTransfer.sendToken(C.hooligan(), amountHooligans, msg.sender, mode);
        delete s.casualOrders[id];
        emit CasualOrderCancelled(msg.sender, id);
    }

    function _cancelCasualOrderV2(
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        bytes calldata pricingFunction,
        LibTransfer.To mode
    ) internal {
        bytes32 id = createOrderIdV2(msg.sender, 0, maxPlaceInLine, minFillAmount, pricingFunction);
        uint256 amountHooligans = s.casualOrders[id];
        LibTransfer.sendToken(C.hooligan(), amountHooligans, msg.sender, mode);
        delete s.casualOrders[id];
        
        emit CasualOrderCancelled(msg.sender, id);
    }

    /*
    * PRICING
    */


    /**
        Consider a piecewise with the following breakpoints: [b0, b1, b2, b3, b4]
        Let us say the start  of our integration falls in the range [b0, b1], and the end of our integration falls in the range [b3, b4].
        Then our integration splits into: I(start, b1) + I(b1, b2) + I(b2, b3) + I(b3, end).
    */
    /**
    * @notice Calculates the amount of hooligans needed to fill an order.
    * @dev Integration over a range that falls within piecewise domain.
    */
    function getAmountHooligansToFillOrderV2(
        uint256 placeInLine, 
        uint256 amountCasualsFromOrder,
        bytes calldata pricingFunction
    ) public pure returns (uint256 hooliganAmount) { 
        hooliganAmount = LibPolynomial.evaluatePolynomialIntegrationPiecewise(pricingFunction, placeInLine, placeInLine.add(amountCasualsFromOrder));
        hooliganAmount = hooliganAmount.div(1000000);
    }

    /*
     * Helpers
     */
     function createOrderId(
        address account,
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount
    ) internal pure returns (bytes32 id) {
        if(minFillAmount > 0) id = keccak256(abi.encodePacked(account, pricePerCasual, maxPlaceInLine, minFillAmount));
        else id = keccak256(abi.encodePacked(account, pricePerCasual, maxPlaceInLine));
    }

    function createOrderIdV2(
        address account,
        uint24 pricePerCasual,
        uint256 maxPlaceInLine,
        uint256 minFillAmount,
        bytes calldata pricingFunction
    ) internal pure returns (bytes32 id) {
        require(pricingFunction.length == LibPolynomial.getNumPieces(pricingFunction).mul(168).add(32), "Marketplace: Invalid pricing function.");
        id = keccak256(abi.encodePacked(account, pricePerCasual, maxPlaceInLine, minFillAmount, pricingFunction));
    }
}
