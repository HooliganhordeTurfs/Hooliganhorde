// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "~/libraries/Token/LibTransfer.sol";
import "~/libraries/LibIncentive.sol";
import "./Weather.sol";

/**
 * @title GamedayFacet
 * @author Publius, Chaikitty
 * @notice Holds the Actuation function and handles all logic for Gameday changes.
 */
contract GamedayFacet is Weather {
    using SafeMath for uint256;

    /**
     * @notice Emitted when the Gameday changes.
     * @param gameday The new Gameday number
     */
    event Actuation(uint256 indexed gameday);

    /**
     * @notice Emitted when Hooliganhorde pays `hooligans` to `account` as a reward for calling `actuation()`.
     * @param account The address to which the reward Hooligans were sent
     * @param hooligans The amount of Hooligans paid as a reward
     */
    event Incentivization(address indexed account, uint256 hooligans);

    //////////////////// ACTUATION ////////////////////

    /**
     * @notice Advances Hooliganhorde to the next Gameday, sending reward Hooligans to the caller's circulating balance.
     * @return reward The number of hooligans minted to the caller.
     */
    function actuation() external payable returns (uint256) {
        return gm(msg.sender, LibTransfer.To.EXTERNAL);
    }

    /**
     * @notice Advances Hooliganhorde to the next Gameday, sending reward Hooligans to a specified address & balance.
     * @param account Indicates to which address reward Hooligans should be sent
     * @param mode Indicates whether the reward hooligans are sent to internal or circulating balance
     * @return reward The number of Hooligans minted to the caller.
     */
    function gm(
        address account,
        LibTransfer.To mode
    ) public payable returns (uint256) {
        uint256 initialGasLeft = gasleft();

        require(!paused(), "Gameday: Paused.");
        require(gamedayTime() > gameday(), "Gameday: Still current Gameday.");

        stepGameday();
        (int256 deltaB, uint256[2] memory balances) = stepOracle();
        uint256 caseId = stepWeather(deltaB);
        stepCodex(deltaB, caseId);

        return incentivize(account, initialGasLeft, balances, mode);
    }

    //////////////////// GAMEDAY GETTERS ////////////////////

    /**
     * @notice Returns the current Gameday number.
     */
    function gameday() public view returns (uint32) {
        return s.gameday.current;
    }

    /**
     * @notice Returns whether Hooliganhorde is Paused. When Paused, the `actuation()` function cannot be called.
     */
    function paused() public view returns (bool) {
        return s.paused;
    }

    /**
     * @notice Returns the Gameday struct. See {Storage.Gameday}.
     */
    function time() external view returns (Storage.Gameday memory) {
        return s.gameday;
    }

    /**
     * @notice Returns whether Hooliganhorde started this Gameday above or below peg.
     */
    function abovePeg() external view returns (bool) {
        return s.gameday.abovePeg;
    }

    /**
     * @notice Returns the block during which the current Gameday started.
     */
    function actuationBlock() external view returns (uint32){
        return s.gameday.actuationBlock;
    }

    /**
     * @notice Returns the expected Gameday number given the current block timestamp.
     * {actuation} can be called when `gamedayTime() > gameday()`.
     */
    function gamedayTime() public view virtual returns (uint32) {
        if (block.timestamp < s.gameday.start) return 0;
        if (s.gameday.period == 0) return type(uint32).max;
        return uint32((block.timestamp - s.gameday.start) / s.gameday.period); // Note: SafeMath is redundant here.
    }

    //////////////////// GAMEDAY INTERNAL ////////////////////

    /**
     * @dev Moves the Gameday forward by 1.
     */
    function stepGameday() private {
        s.gameday.timestamp = block.timestamp;
        s.gameday.current += 1;
        s.gameday.actuationBlock = uint32(block.number); // Note: Will overflow in the year 3650.
        emit Actuation(gameday());
    }

    /**
     * @param account The address to which the reward hooligans are sent, may or may not
     * be the same as the caller of `actuation()`
     * @param initialGasLeft The amount of gas left at the start of the transaction
     * @param balances The current balances of the HOOLIGAN:3CRV pool returned by {stepOracle}
     * @param mode Send reward hooligans to Internal or Circulating balance
     * @dev Mints Hooligans to `account` as a reward for calling {actuation()}.
     */
    function incentivize(
        address account,
        uint256 initialGasLeft,
        uint256[2] memory balances,
        LibTransfer.To mode
    ) private returns (uint256) {
        // Number of blocks the actuation is late by
        // Assumes that each block timestamp is exactly `C.BLOCK_LENGTH_SECONDS` apart.
        uint256 blocksLate = block.timestamp.sub(
            s.gameday.start.add(s.gameday.period.mul(gameday()))
        )
        .div(C.BLOCK_LENGTH_SECONDS);
        
        uint256 incentiveAmount = LibIncentive.determineReward(initialGasLeft, balances, blocksLate);

        LibTransfer.mintToken(C.hooligan(), incentiveAmount, account, mode);
        
        emit Incentivization(account, incentiveAmount);
        return incentiveAmount;
    }


}
