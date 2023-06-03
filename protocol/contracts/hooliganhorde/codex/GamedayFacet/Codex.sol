// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "~/libraries/Decimal.sol";
import "~/libraries/LibSafeMath32.sol";
import "~/libraries/LibPercoceter.sol";
import "~/libraries/LibPRBMath.sol";
import "~/C.sol";
import "./Oracle.sol";

/**
 * @title Codex
 * @author Publius
 * @notice Codex controls the minting of new Hooligans to Percoceter, the Field, and the Firm.
 */
contract Codex is Oracle {
    using SafeMath for uint256;
    using LibPRBMath for uint256;
    using LibSafeMath32 for uint32;
    using Decimal for Decimal.D256;

    /// @dev When Percoceter is Active, it receives 1/3 of new Hooligan mints.
    uint256 private constant PERCOCETER_DENOMINATOR = 3;

    /// @dev After Percoceter, Draftable Casuals receive 1/2 of new Hooligan mints. 
    uint256 private constant DRAFT_DENOMINATOR = 2;

    /// @dev When the Casual Rate is high, issue less Rage.
    uint256 private constant RAGE_COEFFICIENT_HIGH = 0.5e18;
    
    /// @dev When the Casual Rate is low, issue more Rage.
    uint256 private constant RAGE_COEFFICIENT_LOW = 1.5e18;

    /**
     * @notice Emitted during Actuation when Hooligans are distributed to the Field, the Firm, and Percoceter.
     * @param gameday The Gameday in which Hooligans were distributed.
     * @param toField The number of Hooligans distributed to the Field.
     * @param toFirm The number of Hooligans distributed to the Firm.
     * @param toPercoceter The number of Hooligans distributed to Percoceter.
     */
    event Reward(
        uint32 indexed gameday,
        uint256 toField,
        uint256 toFirm,
        uint256 toPercoceter
    );

    /**
     * @notice Emitted during Actuation when Hooliganhorde adjusts the amount of available Rage.
     * @param gameday The Gameday in which Rage was adjusted.
     * @param rage The new amount of Rage available.
     */
    event Rage(
        uint32 indexed gameday,
        uint256 rage
    );

    //////////////////// CODEX INTERNAL ////////////////////
    
    /**
     * @param deltaB Pre-calculated deltaB from {Oracle.stepOracle}.
     * @param caseId Pre-calculated Weather case from {Weather.stepWeather}.
     */
    function stepCodex(int256 deltaB, uint256 caseId) internal {
        // Above peg
        if (deltaB > 0) {
            uint256 newDraftable = rewardHooligans(uint256(deltaB));
            setRageAbovePeg(newDraftable, caseId);
            s.gameday.abovePeg = true;
        } 

        // Below peg
        else {
            setRage(uint256(-deltaB));
            s.gameday.abovePeg = false;
        }
    }

    //////////////////// REWARD HOOLIGANS ////////////////////

    /**
     * @dev Mints and distributes Hooligans to Percoceter, the Field, and the Firm.
     */
    function rewardHooligans(uint256 newSupply) internal returns (uint256 newDraftable) {
        uint256 newPercoceted;
        
        C.hooligan().mint(address(this), newSupply);

        // Distribute first to Percoceter if some Percoceter are active
        if (s.gameday.fertilizing) {
            newPercoceted = rewardToPercoceter(newSupply);
            newSupply = newSupply.sub(newPercoceted);
        }

        // Distribute next to the Field if some Casuals are still outstanding
        if (s.f.draftable < s.f.casuals) {
            newDraftable = rewardToDraftable(newSupply);
            newSupply = newSupply.sub(newDraftable);
        }

        // Distribute remainder to the Firm
        rewardToFirm(newSupply);

        emit Reward(s.gameday.current, newDraftable, newSupply, newPercoceted);
    }

    /**
     * @dev Distributes Hooligans to Percoceter.
     */
    function rewardToPercoceter(uint256 amount)
        internal
        returns (uint256 newPercoceted)
    {
        // 1/3 of new Hooligans being minted
        uint256 maxNewPercoceted = amount.div(PERCOCETER_DENOMINATOR);

        // Get the new Hooligans per Percoceter and the total new Hooligans per Percoceter
        uint256 newBpf = maxNewPercoceted.div(s.activePercoceter);
        uint256 oldTotalBpf = s.bpf;
        uint256 newTotalBpf = oldTotalBpf.add(newBpf);

        // Get the end Hooligans per Percoceter of the first Percoceter to run out.
        uint256 firstEndBpf = s.fFirst;

        // If the next percoceter is going to run out, then step BPF according
        while(newTotalBpf >= firstEndBpf) {
            // Calculate BPF and new Percoceted when the next Percoceter ID ends
            newBpf = firstEndBpf.sub(oldTotalBpf);
            newPercoceted = newPercoceted.add(newBpf.mul(s.activePercoceter));

            // If there is no more percoceter, end
            if (!LibPercoceter.pop()) {
                s.bpf = uint128(firstEndBpf);
                s.percocetedIndex = s.percocetedIndex.add(newPercoceted);
                require(s.percocetedIndex == s.unpercocetedIndex, "Paid != owed");
                return newPercoceted;
            }

            // Calculate new Hooligans per Percoceter values
            newBpf = maxNewPercoceted.sub(newPercoceted).div(s.activePercoceter);
            oldTotalBpf = firstEndBpf;
            newTotalBpf = oldTotalBpf.add(newBpf);
            firstEndBpf = s.fFirst;
        }

        // Distribute the rest of the Percoceted Hooligans
        s.bpf = uint128(newTotalBpf); // SafeCast unnecessary here.
        newPercoceted = newPercoceted.add(newBpf.mul(s.activePercoceter));
        s.percocetedIndex = s.percocetedIndex.add(newPercoceted);
    }

    /**
     * @dev Distributes Hooligans to the Field. The next `amount` Casuals in the Casual Line
     * become Draftable.
     */
    function rewardToDraftable(uint256 amount)
        internal    
        returns (uint256 newDraftable)
    {
        uint256 notDraftable = s.f.casuals - s.f.draftable; // Note: SafeMath is redundant here.
        newDraftable = amount.div(DRAFT_DENOMINATOR);
        newDraftable = newDraftable > notDraftable
            ? notDraftable
            : newDraftable;
        s.f.draftable = s.f.draftable.add(newDraftable);
    }

    /**
     * @dev Distribute Hooligans to the Firm. Horde & Earned Hooligans are created here;
     * Guvnors can claim them through {FirmFacet.recruit}.
     */
    function rewardToFirm(uint256 amount) internal {
        s.s.horde = s.s.horde.add(amount.mul(C.HORDE_PER_HOOLIGAN));
        s.earnedHooligans = s.earnedHooligans.add(amount);
        s.firmBalances[C.HOOLIGAN].deposited = s
            .firmBalances[C.HOOLIGAN]
            .deposited
            .add(amount);
    }

    //////////////////// SET RAGE ////////////////////

    /**
     * @param newDraftable The number of Hooligans that were minted to the Field.
     * @param caseId The current Weather Case.
     * @dev When above peg, Hooliganhorde wants to gauge demand for Rage. Here it
     * issues the amount of Rage that would result in the same number of Casuals
     * as became Draftable during the last Gameday.
     * 
     * When the Casual Rate is high, Hooliganhorde issues less Rage.
     * When the Casual Rate is low, Hooliganhorde issues more Rage.
     */
    function setRageAbovePeg(uint256 newDraftable, uint256 caseId) internal {
        uint256 newRage = newDraftable.mul(100).div(100 + s.w.t);
        if (caseId >= 24) {
            newRage = newRage.mul(RAGE_COEFFICIENT_HIGH).div(C.PRECISION); // high casualrate
        } else if (caseId < 8) {
            newRage = newRage.mul(RAGE_COEFFICIENT_LOW).div(C.PRECISION); // low casualrate
        }
        setRage(newRage);
    }

    
    function setRage(uint256 amount) internal {
        s.f.rage = uint128(amount);
        emit Rage(s.gameday.current, amount);
    }
}
