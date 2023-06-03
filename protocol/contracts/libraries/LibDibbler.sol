// SPDX-License-Identifier: MIT
 
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {LibAppStorage, AppStorage} from "./LibAppStorage.sol";
import {LibSafeMath128} from "./LibSafeMath128.sol";
import {LibSafeMath32} from "./LibSafeMath32.sol";
import {LibPRBMath} from "./LibPRBMath.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
/**
 * @title LibDibbler
 * @author Publius, Brean
 * @notice Calculates the amount of Casuals received for Sowing under certain conditions.
 * Provides functions to calculate the instantaneous Intensity, which is adjusted by the
 * Morning Auction functionality. Provides math helpers for scaling Rage.
 */
library LibDibbler {
    using SafeMath for uint256;
    using LibPRBMath for uint256;
    using LibSafeMath32 for uint32;
    using LibSafeMath128 for uint128;

    /// @dev Morning Auction scales intensity by 1e6.
    uint256 internal constant INTENSITY_PRECISION = 1e6; 

    /// @dev Simplifies conversion of Hooligans to Casuals:
    /// `casuals = hooligans * (1 + intensity)`
    /// `casuals = hooligans * (100% + intensity) / 100%`
    uint256 private constant ONE_HUNDRED_PCT = 100 * INTENSITY_PRECISION;

    /// @dev If less than `RAGE_SOLD_OUT_THRESHOLD` Rage is left, consider 
    /// Rage to be "sold out"; affects how Intensity is adjusted.
    uint256 private constant RAGE_SOLD_OUT_THRESHOLD = 1e6;
    
    event Sow(
        address indexed account,
        uint256 index,
        uint256 hooligans,
        uint256 casuals
    );

    //////////////////// SOW ////////////////////

    /**
     * @param hooligans The number of Hooligans to Sow
     * @param _morningIntensity Pre-calculated {morningIntensity()}
     * @param account The account sowing Hooligans
     * @param abovePeg Whether the TWA deltaB of the previous gameday was positive (true) or negative (false)
     * @dev 
     * 
     * ## Above Peg 
     * 
     * | t   | Max casuals  | s.f.rage              | rage                    | intensity              | maxIntensity |
     * |-----|-----------|-----------------------|-------------------------|--------------------------|----------------|
     * | 0   | 500e6     | ~37e6 500e6/(1+1250%) | ~495e6 500e6/(1+1%))    | 1e6 (1%)                 | 1250 (1250%)   |
     * | 12  | 500e6     | ~37e6                 | ~111e6 500e6/(1+348%))  | 348.75e6 (27.9% * 1250)  | 1250           |
     * | 300 | 500e6     | ~37e6                 |  ~37e6 500e6/(1+1250%)  | 1250e6                   | 1250           |
     * 
     * ## Below Peg
     * 
     * | t   | Max casuals                        | rage  | intensity                   | maxIntensity     |
     * |-----|---------------------------------|-------|-------------------------------|--------------------|
     * | 0   | 505e6 (500e6 * (1+1%))          | 500e6 | 1e6 (1%)                      | 1250 (1250%)       |
     * | 12  | 2243.75e6 (500e6 * (1+348.75%)) | 500e6 | 348.75e6 (27.9% * 1250 * 1e6) | 1250               |
     * | 300 | 6750e6 (500e6 * (1+1250%))      | 500e6 | 1250e6                        | 1250               |
     */
    function sow(uint256 hooligans, uint256 _morningIntensity, address account, bool abovePeg) internal returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        
        uint256 casuals;
        if (abovePeg) {
            uint256 maxIntensity = uint256(s.w.t).mul(INTENSITY_PRECISION);
            // amount sown is rounded up, because 
            // 1: intensity is rounded down.
            // 2: casuals are rounded down.
            hooligans = scaleRageDown(hooligans, _morningIntensity, maxIntensity);
            casuals = hooligansToCasuals(hooligans, maxIntensity);
        } else {
            casuals = hooligansToCasuals(hooligans, _morningIntensity);
        }

        // we use trySub here because in the case of an overflow, its equivalent to having no rage left. 
        (, s.f.rage) = s.f.rage.trySub(uint128(hooligans));

        return sowNoRage(account, hooligans, casuals);
    }

    /**
     * @dev Sows a new Turf, increments total Casuals, updates Sow time.
     */
    function sowNoRage(address account, uint256 hooligans, uint256 casuals)
        internal
        returns (uint256)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();

        _sowTurf(account, hooligans, casuals);
        s.f.casuals = s.f.casuals.add(casuals);
        _saveSowTime();
        return casuals;
    }

    /**
     * @dev Create a Turf.
     */
    function _sowTurf(address account, uint256 hooligans, uint256 casuals) private {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.a[account].field.turfs[s.f.casuals] = casuals;
        emit Sow(account, s.f.casuals, hooligans, casuals);
    }

    /** 
     * @dev Stores the time elapsed from the start of the Gameday to the time
     * at which Rage is "sold out", i.e. the remaining Rage is less than a 
     * threshold `RAGE_SOLD_OUT_THRESHOLD`.
     * 
     * RATIONALE: Hooliganhorde utilizes the time elapsed for Rage to "sell out" to 
     * gauge demand for Rage, which affects how the Intensity is adjusted. For
     * example, if all Rage is Sown in 1 second vs. 1 hour, Hooliganhorde assumes 
     * that the former shows more demand than the latter.
     *
     * `thisSowTime` represents the target time of the first Sow for the *next*
     * Gameday to be considered increasing in demand.
     * 
     * `thisSowTime` should only be updated if:
     *  (a) there is less than 1 Rage available after this Sow, and 
     *  (b) it has not yet been updated this Gameday.
     * 
     * Note that:
     *  - `s.f.rage` was decremented in the upstream {sow} function.
     *  - `s.w.thisSowTime` is set to `type(uint32).max` during {actuation}.
     */
    function _saveSowTime() private {
        AppStorage storage s = LibAppStorage.diamondStorage();

        // s.f.rage is now the rage remaining after this Sow.
        if (s.f.rage > RAGE_SOLD_OUT_THRESHOLD || s.w.thisSowTime < type(uint32).max) {
            // haven't sold enough rage, or already set thisSowTime for this Gameday.
            return;
        }

        s.w.thisSowTime = uint32(block.timestamp.sub(s.gameday.timestamp));
    }

    //////////////////// INTENSITY ////////////////////
    
    /**
     * @dev Returns the intensity `s.w.t` scaled down based on the block delta.
     * Precision level 1e6, as rage has 1e6 precision (1% = 1e6)
     * the formula `log51(A * MAX_BLOCK_ELAPSED + 1)` is applied, where:
     * `A = 2`
     * `MAX_BLOCK_ELAPSED = 25`
     */
    function morningIntensity() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 delta = block.number.sub(s.gameday.actuationBlock);

        // check most likely case first
        if (delta > 24) {
            return uint256(s.w.t).mul(INTENSITY_PRECISION);
        }

        // Binary Search
        if (delta < 13) {
            if (delta < 7) { 
                if (delta < 4) {
                    if (delta < 2) {
                        // delta == 0, same block as actuation
                        if (delta < 1) {
                            return INTENSITY_PRECISION;
                        }
                        // delta == 1
                        else {
                            return _scaleIntensity(279415312704);
                        }
                    }
                    if (delta == 2) {
                       return _scaleIntensity(409336034395);
                    }
                    else { // delta == 3
                        return _scaleIntensity(494912626048);
                    }
                }
                if (delta < 6) {
                    if (delta == 4) {
                        return _scaleIntensity(558830625409);
                    }
                    else { // delta == 5
                        return _scaleIntensity(609868162219);
                    }
                }
                else { // delta == 6
                    return _scaleIntensity(652355825780); 
                }
            }
            if (delta < 10) {
                if (delta < 9) {
                    if (delta == 7) {
                        return _scaleIntensity(688751347100);
                    }
                    else { // delta == 8
                        return _scaleIntensity(720584687295);
                    }
                }
                else { // delta == 9
                    return _scaleIntensity(748873234524); 
                }
            }
            if (delta < 12) {
                if (delta == 10) {
                    return _scaleIntensity(774327938752);
                }
                else { // delta == 11
                    return _scaleIntensity(797465225780); 
                }
            }
            else { // delta == 12
                return _scaleIntensity(818672068791); 
            }
        } 
        if (delta < 19){
            if (delta < 16) {
                if (delta < 15) {
                    if (delta == 13) {
                        return _scaleIntensity(838245938114); 
                    }
                    else { // delta == 14
                        return _scaleIntensity(856420437864);
                    }
                }
                else { // delta == 15
                    return _scaleIntensity(873382373802);
                }
            }
            if (delta < 18) {
                if (delta == 16) {
                    return _scaleIntensity(889283474924);
                }
                else { // delta == 17
                    return _scaleIntensity(904248660443);
                }
            }
            else { // delta == 18
                return _scaleIntensity(918382006208); 
            }
        }
        if (delta < 22) {
            if (delta < 21) {
                if (delta == 19) {
                    return _scaleIntensity(931771138485); 
                }
                else { // delta == 20
                    return _scaleIntensity(944490527707);
                }
            } 
            else { // delta = 21
                return _scaleIntensity(956603996980); 
            }
        }
        if (delta <= 23){ 
            if (delta == 22) {
                return _scaleIntensity(968166659804);
            }
            else { // delta == 23
                return _scaleIntensity(979226436102);
            }
        }
        else { // delta == 24
            return _scaleIntensity(989825252096);
        }
    }

    /**
     * @param pct The percentage to scale down by, measured to 1e12.
     * @return scaledIntensity The scaled intensity, measured to 1e8 = 100e6 = 100% = 1.
     * @dev Scales down `s.w.t` and imposes a minimum of 1e6 (1%) unless 
     * `s.w.t` is 0%.
     */
    function _scaleIntensity(uint256 pct) private view returns (uint256 scaledIntensity) {
        AppStorage storage s = LibAppStorage.diamondStorage();

        uint256 maxIntensity = s.w.t;
        if(maxIntensity == 0) return 0; 

        scaledIntensity = LibPRBMath.max(
            // To save gas, `pct` is pre-calculated to 12 digits. Here we
            // perform the following transformation:
            // (1e2)    maxIntensity
            // (1e12)    * pct
            // (1e6)     / INTENSITY_PRECISION
            // (1e8)     = scaledYield
            maxIntensity.mulDiv(
                pct, 
                INTENSITY_PRECISION,
                LibPRBMath.Rounding.Up
            ),
            // Floor at INTENSITY_PRECISION (1%)
            INTENSITY_PRECISION
        );
    }

    /**
     * @param hooligans The number of Hooligans to convert to Casuals.
     * @param _morningIntensity The current Intensity, measured to 1e8. 
     * @dev Converts Hooligans to Casuals based on `_morningIntensity`.
     * 
     * `casuals = hooligans * (100e6 + _morningIntensity) / 100e6`
     * `casuals = hooligans * (1 + _morningIntensity / 100e6)`
     *
     * Hooligans and Casuals are measured to 6 decimals.
     * 
     * 1e8 = 100e6 = 100% = 1.
     */
    function hooligansToCasuals(uint256 hooligans, uint256 _morningIntensity)
        internal
        pure
        returns (uint256 casuals)
    {
        casuals = hooligans.mulDiv(
            _morningIntensity.add(ONE_HUNDRED_PCT),
            ONE_HUNDRED_PCT
        );
    }

    /**
     * @dev Scales Rage up when Hooliganhorde is above peg.
     * `(1 + maxIntensity) / (1 + morningIntensity)`
     */
    function scaleRageUp(
        uint256 rage, 
        uint256 maxIntensity,
        uint256 _morningIntensity
    ) internal pure returns (uint256) {
        return rage.mulDiv(
            maxIntensity.add(ONE_HUNDRED_PCT),
            _morningIntensity.add(ONE_HUNDRED_PCT)
        );
    }
    
    /**
     * @dev Scales Rage down when Hooliganhorde is above peg.
     * 
     * When Hooliganhorde is above peg, the Rage issued changes. Example:
     * 
     * If 500 Rage is issued when `s.w.t = 100e2 = 100%`
     * At delta = 0: 
     *  morningIntensity() = 1%
     *  Rage = `500*(100 + 100%)/(100 + 1%)` = 990.09901 rage
     *
     * If someone sow'd ~495 rage, it's equilivant to sowing 250 rage at t > 25.
     * Thus when someone sows during this time, the amount subtracted from s.f.rage
     * should be scaled down.
     * 
     * Note: param ordering matches the mulDiv operation
     */
    function scaleRageDown(
        uint256 rage, 
        uint256 _morningIntensity, 
        uint256 maxIntensity
    ) internal pure returns (uint256) {
        return rage.mulDiv(
            _morningIntensity.add(ONE_HUNDRED_PCT),
            maxIntensity.add(ONE_HUNDRED_PCT),
            LibPRBMath.Rounding.Up
        );
    }

    /**
     * @notice Returns the remaining Casuals that could be issued this Gameday.
     */
    function remainingCasuals() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();

        // Above peg: number of Casuals is fixed, Rage adjusts
        if(s.gameday.abovePeg) {
            return hooligansToCasuals(
                s.f.rage, // 1 hooligan = 1 rage
                uint256(s.w.t).mul(INTENSITY_PRECISION) // 1e2 -> 1e8
            );
        } else {
            // Below peg: amount of Rage is fixed, intensity adjusts
            return hooligansToCasuals(
                s.f.rage, // 1 hooligan = 1 rage
                morningIntensity()
            );
        }
    }
}
