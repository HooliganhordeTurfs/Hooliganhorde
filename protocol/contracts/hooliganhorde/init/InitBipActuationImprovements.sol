/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "~/hooliganhorde/AppStorage.sol";
/**
 * @author Publius, Brean
 * @title InitBip33 re-initalizes the weather struct for BIP-33, for gas efficency  
 **/

contract InitBipActuationImprovements {    
    AppStorage internal s;
    
    struct OldWeather {
        uint256 startRage; // slot 1
        uint256 lastDRage; // slot 2 
        uint96 lastRagePercent; // gone
        uint32 lastSowTime; // slot 3
        uint32 thisSowTime; // slot 3
        uint32 yield; // slot 3
        bool didSowBelowMin; // no
        bool didSowFaster; // no
    }
    // reference
    struct NewWeather {
        uint256[2] x; //DEPRECATED
        uint128 lastDRage;
        uint32 lastSowTime;
        uint32 thisSowTime;
        uint32 t;
    }

    function init() external {
        OldWeather storage oldWeather;
        Storage.Weather memory newWeather;
        Storage.Weather storage w = s.w;
        assembly {
            oldWeather.slot := w.slot
        }
        newWeather.lastDRage = uint128(oldWeather.lastDRage);
        newWeather.lastSowTime = oldWeather.lastSowTime;
        newWeather.thisSowTime = oldWeather.thisSowTime;
        newWeather.t = oldWeather.yield;
        s.w = newWeather;
    }
}
