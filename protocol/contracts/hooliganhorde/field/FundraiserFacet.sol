/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../ReentrancyGuard.sol";
import "~/libraries/LibDiamond.sol";
import "~/libraries/LibDibbler.sol";
import "~/libraries/Token/LibTransfer.sol";
import {C} from "~/C.sol";

/**
 * @title Fundraiser Facet
 * @author Publius
 * @notice Handles the creation, funding, and completion of a Fundraiser.
 */
contract FundraiserFacet is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice Emitted when a Fundraiser is created.
     * @param id The Fundraiser ID
     * @param payee The address to which funds are delivered
     * @param token The address of the token that can be sent to the Fundraiser in exchange for Casuals
     * @param amount The amount of `token` that is being raised
     */
    event CreateFundraiser(
        uint32 indexed id,
        address payee,
        address token,
        uint256 amount
    );

    /**
     * @notice Emitted when a Guvnor calls {fund}.
     * @param account The address of the Guvnor
     * @param id The Fundraiser ID
     * @param amount The amount of `token` that `account` provided
     */
    event FundFundraiser(
        address indexed account,
        uint32 indexed id,
        uint256 amount
    );
    
    /**
     * @notice Emitted when a Fundraiser is fully funded.
     * @param id The Fundraiser ID
     */
    event CompleteFundraiser(uint32 indexed id);

    //////////////////// FUNDRAISE ////////////////////

    /**
     * @notice Create a Fundraiser.
     * @param payee The address to which funds are delivered upon {completeFundraiser}
     * @param token The address of the token that can be sent to the Fundraiser in exchange for Casuals
     * @param amount The amount of `token` that is being raised
     */
    function createFundraiser(
        address payee,
        address token,
        uint256 amount
    ) external payable {
        LibDiamond.enforceIsOwnerOrContract();

        // FIXME: TEMPORARY SAFEGUARD. The {FundraiserFacet} was initially
        // created to support USDC, which has the same number of decimals as Hooligan (6).
        // Fundraisers created with tokens measured to a different number of decimals
        // are not yet supported.
        if (ERC20(token).decimals() != 6) {
            revert("Fundraiser: Token decimals");
        }
        
        uint32 id = s.fundraiserIndex;
        s.fundraisers[id].token = token;
        s.fundraisers[id].remaining = amount;
        s.fundraisers[id].total = amount;
        s.fundraisers[id].payee = payee;
        s.fundraisers[id].start = block.timestamp;
        s.fundraiserIndex = id + 1;

        // Mint Hooligans to pay for the Fundraiser. During {fund}, 1 Hooligan is burned
        // for each `token` provided to the Fundraiser.
        // FIXME: adjust `amount` based on `token` decimals.
        C.hooligan().mint(address(this), amount);

        emit CreateFundraiser(id, payee, token, amount);
    }

    /**
     * @notice Fund a Fundraiser.
     * @param id The Fundraiser ID
     * @param amount Amount of `fundraisers[id].token` to provide
     * @param mode Balance to spend tokens from
     * @dev FIXME: this assumes that `.token` is measured to the same number
     * of decimals as Hooligan (1e6). A safeguard has been applied during {createFundraiser}.
     */
    function fund(
        uint32 id,
        uint256 amount,
        LibTransfer.From mode
    ) external payable nonReentrant returns (uint256) {
        uint256 remaining = s.fundraisers[id].remaining;
        
        // Check amount remaining and constrain
        require(remaining > 0, "Fundraiser: completed");
        if (amount > remaining) {
            amount = remaining;
        }

        // Transfer tokens from msg.sender -> Hooliganhorde
        amount = LibTransfer.receiveToken(
            IERC20(s.fundraisers[id].token),
            amount,
            msg.sender,
            mode
        );
        s.fundraisers[id].remaining = remaining - amount; // Note: SafeMath is redundant here.
        emit FundFundraiser(msg.sender, id, amount);

        // If completed, transfer tokens to payee and emit an event
        if (s.fundraisers[id].remaining == 0) {
            _completeFundraiser(id);
        }

        // When the Fundraiser was initialized, Hooliganhorde minted Hooligans. 
        C.hooligan().burn(amount);

        // Calculate the number of Casuals to Sow.
        // Fundraisers bypass Morning Auction behavior and Rage requirements,
        // calculating return only based on the current `s.w.t`.
        uint256 casuals = LibDibbler.hooligansToCasuals(
            amount, 
            uint256(s.w.t).mul(LibDibbler.INTENSITY_PRECISION)
        ); 

        // Sow for Casuals and return the number of Casuals received.
        return LibDibbler.sowNoRage(msg.sender, amount, casuals);
    }

    /**
     * @dev Transfer fundraised tokens from Hooliganhorde to the fundraiser payee.
     */
    function _completeFundraiser(uint32 id) internal {
        // Prevent reentrancy during fundraiser; must last more than one block.
        // Recommended by Omniscia @ FFE-01M.
        require(
            block.timestamp != s.fundraisers[id].start,
            "Fundraiser: start block"
        );

        IERC20(s.fundraisers[id].token).safeTransfer(
            s.fundraisers[id].payee,
            s.fundraisers[id].total
        );

        emit CompleteFundraiser(id);
    }

    //////////////////// GETTERS ////////////////////

    function remainingFunding(uint32 id) public view returns (uint256) {
        return s.fundraisers[id].remaining;
    }

    function totalFunding(uint32 id) public view returns (uint256) {
        return s.fundraisers[id].total;
    }

    function fundingToken(uint32 id) public view returns (address) {
        return s.fundraisers[id].token;
    }

    function fundraiser(uint32 id)
        public
        view
        returns (Storage.Fundraiser memory)
    {
        return s.fundraisers[id];
    }

    function numberOfFundraisers() public view returns (uint32) {
        return s.fundraiserIndex;
    }
}
