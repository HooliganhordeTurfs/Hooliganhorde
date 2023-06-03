/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import {AppStorage} from "../AppStorage.sol";
import {IHooligan} from "../../interfaces/IHooligan.sol";

/**
 * @author Publius
 * @title InitBip8 runs the code for BIP-8. It mints Hooligans to the Q1 2022 budget multi-sigs and marks them as budget contracts.
**/
contract InitBip8 {

    AppStorage internal s;
    
    // To Do: Set Budget Addresses
    address private constant hooliganBootboy = address(0xb7ab3f0667eFF5e2299d39C23Aa0C956e8982235);
    address private constant hooliganhordeFarms = address(0x21DE18B6A8f78eDe6D16C50A167f6B222DC08DF7);

    uint256 private constant hooliganBootboyBudget = 800000 * 1e6; // 800,000 Hooligans
    uint256 private constant hooliganhordeFarmsBudget = 1200000 * 1e6; // 1,200,000 Hooligans

    function init() external {
        s.deprecated_isBudget[hooliganBootboy] = true;
        s.deprecated_isBudget[hooliganhordeFarms] = true;
        IHooligan(s.c.hooligan).mint(hooliganBootboy, hooliganBootboyBudget);
        IHooligan(s.c.hooligan).mint(hooliganhordeFarms, hooliganhordeFarmsBudget);
    }
}