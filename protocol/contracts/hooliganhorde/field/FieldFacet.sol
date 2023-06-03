/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {C} from "~/C.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/SafeCast.sol";
import {LibTransfer} from "~/libraries/Token/LibTransfer.sol";
import {LibDibbler} from "~/libraries/LibDibbler.sol";
import {LibPRBMath} from "~/libraries/LibPRBMath.sol";
import {LibSafeMath32} from "~/libraries/LibSafeMath32.sol";
import {LibSafeMath128} from "~/libraries/LibSafeMath128.sol";
import {ReentrancyGuard} from "../ReentrancyGuard.sol";

/**
 * @title FieldFacet
 * @author Publius, Brean
 * @notice The Field is where Hooligans are Sown and Casuals are Drafted.
 */
contract FieldFacet is ReentrancyGuard {
    using SafeMath for uint256;
    using LibPRBMath for uint256;
    using LibSafeMath32 for uint32;
    using LibSafeMath128 for uint128;

    /**
     * @notice Emitted from {LibDibbler.sowNoRage} when an `account` creates a turf. 
     * A Turf is a set of Casuals created in from a single {sow} or {fund} call. 
     * @param account The account that sowed Hooligans for Casuals
     * @param index The place in line of the Turf
     * @param hooligans The amount of Hooligans burnt to create the Turf
     * @param casuals The amount of Casuals assocated with the created Turf
     */
    event Sow(
        address indexed account,
        uint256 index,
        uint256 hooligans,
        uint256 casuals
    );

    /**
     * @notice Emitted when `account` claims the Hooligans associated with Draftable Casuals.
     * @param account The account that owns the `turfs`
     * @param turfs The indices of Turfs that were drafted
     * @param hooligans The amount of Hooligans transferred to `account`
     */
    event Draft(address indexed account, uint256[] turfs, uint256 hooligans);

    /**
     * @param account The account that created the Casual Listing
     * @param index The index of the Turf listed
     * @dev NOTE: must mirror {Listing.CasualListingCancelled}
     */
    event CasualListingCancelled(address indexed account, uint256 index);

    //////////////////// SOW ////////////////////

    /**
     * @notice Sow Hooligans in exchange for Casuals.
     * @param hooligans The number of Hooligans to Sow
     * @param minIntensity The minimum Intensity at which to Sow
     * @param mode The balance to transfer Hooligans from; see {LibTransfer.From}
     * @return casuals The number of Casuals received
     * @dev 
     * 
     * `minIntensity` has precision of 1e6. Wraps {sowWithMin} with `minRage = hooligans`.
     * 
     * NOTE: previously minIntensity was measured to 1e2 (1% = 1)
     * 
     * Rationale for {sow} accepting a `minIntensity` parameter:
     * If someone sends a Sow transaction at the end of a Gameday, it could be 
     * executed early in the following Gameday, at which time the intensity may be
     * significantly lower due to Morning Auction functionality.
     * 
     * FIXME Migration notes:
     * - Added `minIntensity` as second parameter
     * - `minIntensity` is uint256 measured to 1e6 instead of uint32
     */
    function sow(
        uint256 hooligans,
        uint256 minIntensity,
        LibTransfer.From mode
    )
        external
        payable
        returns (uint256 casuals)
    {
        casuals = sowWithMin(hooligans, minIntensity, hooligans, mode);
    }

    /**
     * @notice Sow Hooligans in exchange for Casuals. Use at least `minRage`.
     * @param hooligans The number of Hooligans to Sow
     * @param minIntensity The minimum Intensity at which to Sow
     * @param minRage The minimum amount of Rage to use; reverts if there is 
     * less than this much Rage available upon execution
     * @param mode The balance to transfer Hooligans from; see {LibTrasfer.From}
     * @return casuals The number of Casuals received
     */
    function sowWithMin(
        uint256 hooligans,
        uint256 minIntensity,
        uint256 minRage,
        LibTransfer.From mode
    ) public payable returns (uint256 casuals) {
        // `rage` is the remaining Rage
        (uint256 rage, uint256 _morningIntensity, bool abovePeg) = _totalRageAndIntensity();

        require(
            rage >= minRage && hooligans >= minRage,
            "Field: Rage Slippage"
        );
        require(
            _morningIntensity >= minIntensity,
            "Field: Intensity Slippage"
        );

        // If hooligans >= rage, Sow all of the remaining Rage
        if (hooligans < rage) {
            rage = hooligans; 
        }

        // 1 Hooligan is Sown in 1 Rage, i.e. rage = hooligans
        casuals = _sow(rage, _morningIntensity, abovePeg, mode);
    }

    /**
     * @dev Burn Hooligans, Sows at the provided `_morningIntensity`, increments the total
     * number of `hooliganSown`.
     * 
     * NOTE: {FundraiserFacet} also burns Hooligans but bypasses the rage mechanism
     * by calling {LibDibbler.sowWithMin} which bypasses updates to `s.f.hooliganSown`
     * and `s.f.rage`. This is by design, as the Fundraiser has no impact on peg
     * maintenance and thus should not change the supply of Rage.
     */
    function _sow(uint256 hooligans, uint256 _morningIntensity, bool peg, LibTransfer.From mode)
        internal
        returns (uint256 casuals)
    {
        hooligans = LibTransfer.burnToken(C.hooligan(), hooligans, msg.sender, mode);
        casuals = LibDibbler.sow(hooligans, _morningIntensity, msg.sender, peg);
        s.f.hooliganSown = s.f.hooliganSown + SafeCast.toUint128(hooligans); // SafeMath not needed
    }

    //////////////////// DRAFT ////////////////////

    /**
     * @notice Draft Casuals from the Field.
     * @param turfs List of turf IDs to Draft
     * @param mode The balance to transfer Hooligans to; see {LibTrasfer.To}
     * @dev Redeems Casuals for Hooligans. When Casuals become Draftable, they are
     * redeemable for 1 Hooligan each.
     * 
     * The Hooligans used to pay Draftable Casuals are minted during {Codex.stepCodex}.
     * Hooliganhorde holds these Hooligans until `draft()` is called.
     *
     * Casuals are "burned" when the corresponding Turf is deleted from 
     * `s.a[account].field.turfs`.
     */
    function draft(uint256[] calldata turfs, LibTransfer.To mode)
        external
        payable
    {
        uint256 hooligansDrafted = _draft(turfs);
        LibTransfer.sendToken(C.hooligan(), hooligansDrafted, msg.sender, mode);
    }

    /**
     * @dev Ensure that each Turf is at least partially draftable, burn the Turf,
     * update the total drafted, and emit a {Draft} event.
     */
    function _draft(uint256[] calldata turfs)
        internal
        returns (uint256 hooligansDrafted)
    {
        for (uint256 i; i < turfs.length; ++i) {
            // The Turf is partially draftable if its index is less than
            // the current draftable index.
            require(turfs[i] < s.f.draftable, "Field: Turf not Draftable");
            uint256 drafted = _draftTurf(msg.sender, turfs[i]);
            hooligansDrafted = hooligansDrafted.add(drafted);
        }
        s.f.drafted = s.f.drafted.add(hooligansDrafted);
        emit Draft(msg.sender, turfs, hooligansDrafted);
    }

    /**
     * @dev Check if a Turf is at least partially Draftable; calculate how many
     * Casuals are Draftable, create a new Turf if necessary.
     */
    function _draftTurf(address account, uint256 index)
        private
        returns (uint256 draftableCasuals)
    {
        // Check that `account` holds this Turf.
        uint256 casuals = s.a[account].field.turfs[index];
        require(casuals > 0, "Field: no turf");

        // Calculate how many Casuals are draftable. 
        // The upstream _draft function checks that at least some Casuals 
        // are draftable.
        draftableCasuals = s.f.draftable.sub(index);
        delete s.a[account].field.turfs[index];

        // Cancel any active Casual Listings active for this Turf.
        // Note: duplicate of {Listing._cancelCasualListing} without the 
        // ownership check, which is done above.
        if (s.casualListings[index] > 0) {
            delete s.casualListings[index];
            emit CasualListingCancelled(msg.sender, index);
        }

        // If the entire Turf was drafted, exit.
        if (draftableCasuals >= casuals) {
            return casuals;
        }
        
        // Create a new Turf with remaining Casuals.
        s.a[account].field.turfs[index.add(draftableCasuals)] = casuals.sub(
            draftableCasuals
        );
    }

    //////////////////// GETTERS ////////////////////

    /**
     * @notice Returns the total number of Casuals ever minted.
     */
    function casualIndex() public view returns (uint256) {
        return s.f.casuals;
    }

    /**
     * @notice Returns the index below which Casuals are Draftable.
     */
    function draftableIndex() public view returns (uint256) {
        return s.f.draftable;
    }

    /**
     * @notice Returns the number of outstanding Casuals. Includes Casuals that are
     * currently Draftable but have not yet been Drafted.
     */
    function totalCasuals() public view returns (uint256) {
        return s.f.casuals.sub(s.f.drafted);
    }

    /**
     * @notice Returns the number of Casuals that have ever been Drafted.
     */
    function totalDrafted() public view returns (uint256) {
        return s.f.drafted;
    }

    /**
     * @notice Returns the number of Casuals that are currently Draftable but
     * have not yet been Drafted.
     * @dev This is the number of Casuals that Hooliganhorde is prepared to pay back,
     * but that haven’t yet been claimed via the `draft()` function.
     */
    function totalDraftable() public view returns (uint256) {
        return s.f.draftable.sub(s.f.drafted);
    }

    /**
     * @notice Returns the number of Casuals that are not yet Draftable. Also known as the Casual Line.
     */
    function totalUndraftable() public view returns (uint256) {
        return s.f.casuals.sub(s.f.draftable);
    }

    /**
     * @notice Returns the number of Casuals remaining in a Turf.
     * @dev Turfs are only stored in the `s.a[account].field.turfs` mapping.
     */
    function turf(address account, uint256 index)
        public
        view
        returns (uint256)
    {
        return s.a[account].field.turfs[index];
    }

    /**
     * @dev Gets the current `rage`, `_morningIntensity` and `abovePeg`. Provided as a gas 
     * optimization to prevent recalculation of {LibDibbler.morningIntensity} for 
     * upstream functions.
     * Note: the `rage` return value is symmetric with `totalRage`.
     */
    function _totalRageAndIntensity() private view returns (uint256 rage, uint256 _morningIntensity, bool abovePeg) {
        _morningIntensity = LibDibbler.morningIntensity();
        abovePeg = s.gameday.abovePeg;

        // Below peg: Rage is fixed to the amount set during {stepWeather}.
        // Morning Intensity is dynamic, starting small and logarithmically 
        // increasing to `s.w.t` across the first 25 blocks of the Gameday.
        if (!abovePeg) {
            rage = uint256(s.f.rage);
        } 
        
        // Above peg: the maximum amount of Casuals that Hooliganhorde is willing to mint
        // stays fixed; since {morningIntensity} is scaled down when `delta < 25`, we
        // need to scale up the amount of Rage to hold Casuals constant.
        else {
            rage = LibDibbler.scaleRageUp(
                uint256(s.f.rage), // max rage offered this Gameday, reached when `t >= 25`
                uint256(s.w.t).mul(LibDibbler.INTENSITY_PRECISION), // max intensity
                _morningIntensity // intensity adjusted by number of blocks since Actuation
            );
        }
    }

    //////////////////// GETTERS: RAGE ////////////////////

    /**
     * @notice Returns the total amount of available Rage. 1 Hooligan can be Sown in
     * 1 Rage for Casuals.
     * @dev When above peg, Rage is dynamic because the number of Casuals that
     * Hooliganhorde is willing to mint is fixed.
     */
    function totalRage() external view returns (uint256) {
        // Below peg: Rage is fixed to the amount set during {stepWeather}.
        if (!s.gameday.abovePeg) {
            return uint256(s.f.rage);
        }

        // Above peg: Rage is dynamic
        return LibDibbler.scaleRageUp(
            uint256(s.f.rage), // min rage
            uint256(s.w.t).mul(LibDibbler.INTENSITY_PRECISION), // max intensity
            LibDibbler.morningIntensity() // intensity adjusted by number of blocks since Actuation
        );
    }

    //////////////////// GETTERS: INTENSITY ////////////////////

    /**
     * @notice DEPRECATED: Returns the current yield (aka "Intensity") offered 
     * by Hooliganhorde when burning Hooligans in exchange for Casuals.
     * @dev Left for backwards compatibility. Scales down the {morningIntensity}. 
     * There is a loss of precision (max 1%) during this operation.
     */
    function yield() external view returns (uint32) {
        return SafeCast.toUint32(
            LibDibbler.morningIntensity().div(LibDibbler.INTENSITY_PRECISION)
        );
    }

    /**
     * @notice Returns the current Intensity, the interest rate offered by Hooliganhorde.
     * The Intensity scales up during the first 25 blocks after Actuation.
     */
    function intensity() external view returns (uint256) {
        return LibDibbler.morningIntensity();
    }

    /**
     * @notice Returns the max Intensity that Hooliganhorde is willing to offer this Gameday.
     * @dev For gas efficiency, Hooliganhorde stores `s.w.t` as a uint32 with precision of 1e2.
     * Here we convert to uint256 and scale up by INTENSITY_PRECISION to match the 
     * precision needed for the Morning Auction functionality.
     */
    function maxIntensity() external view returns (uint256) {
        return uint256(s.w.t).mul(LibDibbler.INTENSITY_PRECISION);
    }

    //////////////////// GETTERS: CASUALS ////////////////////
    
    /**
     * @notice Returns the remaining Casuals that could be issued this Gameday.
     */
    function remainingCasuals() external view returns (uint256) {
        return uint256(LibDibbler.remainingCasuals());
    }
}
