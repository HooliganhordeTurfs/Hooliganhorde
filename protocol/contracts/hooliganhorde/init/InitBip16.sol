/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import {IHooligan} from "../../interfaces/IHooligan.sol";

/**
 * @author Publius
 * @title InitBip16 initializes BIP-16: It whitelists the Hooligan:LUSD Curve Plain Pool into the Firm and pays the publius address 5,000 Hooligans.
**/

interface IBS {
    function whitelistToken(address token, bytes4 selector, uint32 horde, uint32 prospects) external;
    function lusdToBDV(uint256 amount) external view returns (uint256);
}

contract InitBip16 {
    address private constant HOOLIGAN_ADDRESS = address(0xDC59ac4FeFa32293A95889Dc396682858d52e5Db);
    address private constant PUBLIUS_ADDRESS = address(0x925753106FCdB6D2f30C3db295328a0A1c5fD1D1);
    uint256 private constant PAYMENT = 5000000000;

    address private constant HOOLIGAN_LUSD_ADDRESS = address(0xD652c40fBb3f06d6B58Cb9aa9CFF063eE63d465D);
    uint32 private constant HORDE = 10000;
    uint32 private constant PROSPECTS = 3;

    function init() external {
        IBS(address(this)).whitelistToken(HOOLIGAN_LUSD_ADDRESS, IBS.lusdToBDV.selector, HORDE, PROSPECTS);
        IHooligan(HOOLIGAN_ADDRESS).mint(PUBLIUS_ADDRESS, PAYMENT);
    }
}