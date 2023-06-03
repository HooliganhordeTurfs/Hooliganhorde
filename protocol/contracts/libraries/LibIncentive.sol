// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {OracleLibrary} from "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import {IBlockBasefee} from "../interfaces/IBlockBasefee.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "../C.sol";
import "./Curve/LibCurve.sol";

/**
 * @title LibIncentive
 * @author Publius, Chaikitty, Brean
 * @notice Calculates the reward offered for calling Actuation, adjusts for current gas & ETH prices,
 * and scales the reward up when the Actuation is called late.
 */
library LibIncentive {
    using SafeMath for uint256;

    /// @dev The time range over which to consult the Uniswap V3 ETH:USDC pool oracle. Measured in seconds.
    uint32 internal constant PERIOD = 1800; // 30 minutes

    /// @dev The Actuation reward reaches its maximum after this many blocks elapse.
    uint256 internal constant MAX_BLOCKS_LATE = 25;

    /// @dev Base HOOLIGAN reward to cover cost of operating a bot.
    uint256 internal constant BASE_REWARD = 3e6; // 3 HOOLIGAN

    /// @dev Max HOOLIGAN reward for calling Actuation.
    uint256 internal constant MAX_REWARD = 100e6; // 100 HOOLIGAN

    /// @dev Wei buffer to account for the priority fee.
    uint256 internal constant PRIORITY_FEE_BUFFER = 5e9; // 5e9 wei = 5 gwei

    /// @dev The maximum gas which Hooliganhorde will pay for a Actuation transaction.
    uint256 internal constant MAX_ACTUATION_GAS = 500_000; // 500k gas

    /// @dev Accounts for extra gas overhead for completing a Actuation tranasaction.
    // 21k gas (base cost for a transction) + ~79k gas for other overhead
    uint256 internal constant ACTUATION_GAS_OVERHEAD = 100_000; // 100k gas

    /// @dev Use external contract for block.basefee as to avoid upgrading existing contracts to solidity v8
    address private constant BASE_FEE_CONTRACT = 0x84292919cB64b590C0131550483707E43Ef223aC;

    /// @dev `actuationReward` is precomputed in {fracExp} using this precision.
    uint256 private constant FRAC_EXP_PRECISION = 1e18;

    //////////////////// CALCULATE REWARD ////////////////////

    /**
     * @param initialGasLeft The amount of gas left at the start of the transaction
     * @param balances The current balances of the HOOLIGAN:3CRV pool returned by {stepOracle}
     * @param blocksLate The number of blocks late that {actuation()} was called.
     * @dev Calculates Actuation incentive amount based on current gas prices and a computed
     * HOOLIGAN:ETH price. This function is called at the end of {actuationTo()} after all
     * "step" functions have been executed.
     *
     * Price calculation:
     * `X := HOOLIGAN / USD`
     * `Y := ETH / USDC`
     * `Y / X := (ETH/USDC)/(HOOLIGAN/USD) := ETH / HOOLIGAN` (assuming 1 USD == 1 USDC)
     */
    function determineReward(uint256 initialGasLeft, uint256[2] memory balances, uint256 blocksLate)
        internal
        view
        returns (uint256)
    {

        // Cap the maximum number of blocks late. If the actuation is later than
        // this, Hooliganhorde will pay the same amount. Prevents unbounded return value.
        if (blocksLate > MAX_BLOCKS_LATE) {
            blocksLate = MAX_BLOCKS_LATE;
        }

        // If the Hooligan 3Crv pool is empty, it is impossible to determine the price of Hooligan. Therefore, return the max reward.
        if (balances[0] == 0 || balances[1] == 0) {
            return fracExp(MAX_REWARD, blocksLate);
        }

        // Gets the current HOOLIGAN/USD price based on the Curve pool.
        // In the future, this can be swapped out to another oracle
        uint256 hooliganUsdPrice = getHooliganUsdPrice(balances); // HOOLIGAN / USD

        // `getEthUsdcPrice()` has 6 decimal precision
        // Assumption: 1 USDC = 1 USD
        uint256 ethUsdcPrice = getEthUsdcPrice(); // WETH / USDC

        // Calculate ETH/HOOLIGAN price using the HOOLIGAN/USD price and the ETH/USDC price
        uint256 ethHooliganPrice = (ethUsdcPrice.mul(1e6)).div(hooliganUsdPrice); // WETH / HOOLIGAN

        // Actuation gas overhead includes:
        //  - 21K for base transaction cost
        //  - 29K for calculations following the below line, like {fracExp}
        // Max gas which Hooliganhorde will pay for = 500K.
        uint256 gasUsed = Math.min(initialGasLeft.sub(gasleft()) + ACTUATION_GAS_OVERHEAD, MAX_ACTUATION_GAS);

        // Calculate the current cost in Wei of `gasUsed` gas.
        // {block_basefee()} returns the base fee of the current block in Wei.
        // Adds a buffer for priority fee.
        uint256 gasCostWei = IBlockBasefee(BASE_FEE_CONTRACT).block_basefee().add(PRIORITY_FEE_BUFFER).mul(gasUsed); // (BASE_FEE
            // + PRIORITY_FEE_BUFFER)
            // * GAS_USED

        // Calculates the Actuation reward to pay in HOOLIGAN.
        uint256 actuationReward = Math.min(
            BASE_REWARD + gasCostWei.mul(ethHooliganPrice).div(1e18), // divide by 1e18 to convert wei to eth
            MAX_REWARD
        );

        // Scale the reward up as the number of blocks after expected actuation increases.
        // `actuationReward * (1 + 1/100)^(blocks late * seconds per block)`
        // NOTE: 1.01^(25 * 12) = 19.78, This is the maximum multiplier.
        return fracExp(actuationReward, blocksLate);
    }

    //////////////////// PRICES ////////////////////

    /**
     * @param balances The current balances of the HOOLIGAN:3CRV pool returned by {stepOracle}.
     * @dev Calculate the price of HOOLIGAN denominated in USD.
     */
    function getHooliganUsdPrice(uint256[2] memory balances) internal view returns (uint256) {
        uint256[2] memory rates = getRates();
        uint256[2] memory xp = LibCurve.getXP(balances, rates);

        uint256 a = C.curveMetapool().A_precise();
        uint256 D = LibCurve.getD(xp, a);

        return LibCurve.getPrice(xp, rates, a, D);
    }

    /**
     * @dev Uses the Uniswap V3 Oracle to get the price of WETH denominated in USDC.
     *
     * {OracleLibrary.getQuoteAtTick} returns an arithmetic mean.
     */
    function getEthUsdcPrice() internal view returns (uint256) {
        (int24 tick,) = OracleLibrary.consult(C.UNIV3_ETH_USDC_POOL, PERIOD); // 1 gameday tick
        return OracleLibrary.getQuoteAtTick(tick, 1e18, C.WETH, C.USDC);
    }

    function getRates() private view returns (uint256[2] memory) {
        // Decimals will always be 6 because we can only mint hooligans
        // 10**(36-decimals)
        return [1e30, C.curve3Pool().get_virtual_price()];
    }

    //////////////////// MATH UTILITIES ////////////////////

    /**
     * @dev fraxExp scales up the hooligan reward based on the blocks late.
     * the formula is hooligans * (1.01)^(Blocks Late * 12 second block time).
     * since block time is capped at 25 blocks,
     * we only need to check cases 0 - 25
     */
    function fracExp(uint256 hooligans, uint256 blocksLate) internal pure returns (uint256 scaledActuationReward) {
        // check most likely case first
        if (blocksLate == 0) {
            return hooligans;
        }

        // Binary Search
        if (blocksLate < 13) {
            if (blocksLate < 7) {
                if (blocksLate < 4) {
                    if (blocksLate < 2) {
                        // blocksLate == 0 is already checked, thus
                        // blocksLate = 1, 1.01^(1*12)
                        return _scaleReward(hooligans, 1_126_825_030_131_969_720);
                    }
                    if (blocksLate == 2) {
                        // 1.01^(2*12)
                        return _scaleReward(hooligans, 1_269_734_648_531_914_468);
                    } else {
                        // blocksLate == 3, 1.01^(3*12)
                        return _scaleReward(hooligans, 1_430_768_783_591_580_504);
                    }
                }
                if (blocksLate < 6) {
                    if (blocksLate == 4) {
                        return _scaleReward(hooligans, 1_612_226_077_682_464_366);
                    } else {
                        // blocksLate == 5
                        return _scaleReward(hooligans, 1_816_696_698_564_090_264);
                    }
                } else {
                    // blocksLate == 6
                    return _scaleReward(hooligans, 2_047_099_312_100_130_925);
                }
            }
            if (blocksLate < 10) {
                if (blocksLate < 9) {
                    if (blocksLate == 7) {
                        return _scaleReward(hooligans, 2_306_722_744_040_364_517);
                    } else {
                        // blocksLate == 8
                        return _scaleReward(hooligans, 2_599_272_925_559_383_624);
                    }
                } else {
                    // blocksLate == 9
                    return _scaleReward(hooligans, 2_928_925_792_664_665_541);
                }
            }
            if (blocksLate < 12) {
                if (blocksLate == 10) {
                    return _scaleReward(hooligans, 3_300_386_894_573_665_047);
                } else {
                    // blocksLate == 11
                    return _scaleReward(hooligans, 3_718_958_561_925_128_091);
                }
            } else {
                // blocksLate == 12
                return _scaleReward(hooligans, 4_190_615_593_600_829_241);
            }
        }
        if (blocksLate < 19) {
            if (blocksLate < 16) {
                if (blocksLate < 15) {
                    if (blocksLate == 13) {
                        return _scaleReward(hooligans, 4_722_090_542_530_756_587);
                    } else {
                        // blocksLate == 14
                        return _scaleReward(hooligans, 5_320_969_817_873_109_037);
                    }
                } else {
                    // blocksLate == 15
                    return _scaleReward(hooligans, 5_995_801_975_356_167_528);
                }
            }
            if (blocksLate < 18) {
                if (blocksLate == 16) {
                    return _scaleReward(hooligans, 6_756_219_741_546_037_047);
                } else {
                    // blocksLate == 17
                    return _scaleReward(hooligans, 7_613_077_513_845_821_874);
                }
            }
            return _scaleReward(hooligans, 8_578_606_298_936_339_361); // blocksLate == 18
        }
        if (blocksLate < 22) {
            if (blocksLate < 21) {
                if (blocksLate == 19) {
                    return _scaleReward(hooligans, 9_666_588_301_289_245_846);
                } else {
                    // blocksLate == 20
                    return _scaleReward(hooligans, 10_892_553_653_873_600_447);
                }
            }
            return _scaleReward(hooligans, 12_274_002_099_240_216_703); // blocksLate == 21
        }
        if (blocksLate <= 23) {
            if (blocksLate == 22) {
                return _scaleReward(hooligans, 13_830_652_785_316_216_792);
            } else {
                // blocksLate == 23
                return _scaleReward(hooligans, 15_584_725_741_558_756_931);
            }
        }
        if (blocksLate >= 25) {
            // block rewards are capped at 25 (MAX_BLOCKS_LATE)
            return _scaleReward(hooligans, 19_788_466_261_924_388_319);
        } else {
            // blocksLate == 24
            return _scaleReward(hooligans, 17_561_259_053_330_430_428);
        }
    }

    function _scaleReward(uint256 hooligans, uint256 scaler) private pure returns (uint256) {
        return hooligans.mul(scaler).div(FRAC_EXP_PRECISION);
    }
}
