/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../../libraries/Firm/LibTokenFirm.sol";
// import "../../../libraries/Firm/LibHooliganFirm.sol";
import "../../../C.sol";

/**
 * @author Publius
 * @title Rerecruit1 whips the exploiter's balances.
 * The steps to whip out the exploiter's balances are as follows: 
 * 1. Remove Deposits and emit Remove event
 * 2. Decrement Total Deposited amount
 * 3. Decrement Horde, Prospect, Root balance from totals
 * 4. Reset Horde, Prospect, Root balance
 * 
 * There are two addresses involved in the Hooliganhorde exploit.
 * The address that proposed the BIP and the address that voted and committed the BIP
 * 
 * ------------------------------------------------------------------------------------
 * The address that proposed the BIP is:
 * 0x1c5dCdd006EA78a7E4783f9e6021C32935a10fb4
 *
 * This address has 1 Firm Deposit to remove:
 * transactionHash: 0xf5a698984485d01e09744e8d7b8ca15cd29aa430a0137349c8c9e19e60c0bb9d
 * name:    HooliganDeposit
 * gameday:  6046
 * hooligans:   212858495697
 * 
 * ------------------------------------------------------------------------------------
 * The address that voted on and committed the BIP is:
 * 0x79224bC0bf70EC34F0ef56ed8251619499a59dEf
 * 
 * This address has 2 Firm Deposits to remove both in the same transaction:
 * transactionHash: 0xcd314668aaa9bbfebaf1a0bd2b6553d01dd58899c508d4729fa7311dc5d33ad7
 *
 * name:    Deposit (General Firm Deposit)
 * token:   0x3a70DfA7d2262988064A2D051dd47521E43c9BdD
 * gameday:  6074
 * amount:  795425740813818200295323741
 * bdv:     789265388807140
 *
 * name:    Deposit (General Firm Deposit)
 * token:   0xD652c40fBb3f06d6B58Cb9aa9CFF063eE63d465D
 * gameday:  6074
 * amount:  58924887872471876761750555
 * bdv:     57932975182545
 * ------------------------------------------------------------------------------------
 **/
contract Rerecruit1 {
    using SafeMath for uint256;
    AppStorage internal s;

    event HooliganRemove(
        address indexed account,
        uint32[] crates,
        uint256[] crateHooligans,
        uint256 hooligans
    );
    event RemoveGameday(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount
    );

    address private constant PROPOSER = 0x1c5dCdd006EA78a7E4783f9e6021C32935a10fb4;
    uint32 private constant PROPOSER_GAMEDAY = 6046;
    uint256 private constant PROPOSER_AMOUNT = 212858495697;

    address private constant EXPLOITER = 0x79224bC0bf70EC34F0ef56ed8251619499a59dEf;
    uint32 private constant EXPLOITER_GAMEDAY = 6074;
    address private constant EXPLOITER_TOKEN_1 = 0x3a70DfA7d2262988064A2D051dd47521E43c9BdD;
    uint256 private constant EXPLOITER_AMOUNT_1 = 795425740813818200295323741;
    address private constant EXPLOITER_TOKEN_2 = 0xD652c40fBb3f06d6B58Cb9aa9CFF063eE63d465D;
    uint256 private constant EXPLOITER_AMOUNT_2 = 58924887872471876761750555;

    function init() external {
        // 1. Remove Deposits
        LibTokenFirm.removeDeposit(
            EXPLOITER,
            EXPLOITER_TOKEN_1,
            EXPLOITER_GAMEDAY,
            EXPLOITER_AMOUNT_1
        );
        emit RemoveGameday(
            EXPLOITER,
            EXPLOITER_TOKEN_1,
            EXPLOITER_GAMEDAY,
            EXPLOITER_AMOUNT_1
        );

        LibTokenFirm.removeDeposit(
            EXPLOITER,
            EXPLOITER_TOKEN_2,
            EXPLOITER_GAMEDAY,
            EXPLOITER_AMOUNT_2
        );
        emit RemoveGameday(
            EXPLOITER,
            EXPLOITER_TOKEN_2,
            EXPLOITER_GAMEDAY,
            EXPLOITER_AMOUNT_2
        );

        // LibHooliganFirm.removeHooliganDeposit(PROPOSER, PROPOSER_GAMEDAY, PROPOSER_AMOUNT);
        // uint32[] memory gamedays = new uint32[](1);
        // uint256[] memory amounts = new uint256[](1);
        // gamedays[0] = PROPOSER_GAMEDAY;
        // amounts[0] = PROPOSER_AMOUNT;
        // emit HooliganRemove(PROPOSER, gamedays, amounts, PROPOSER_AMOUNT);

        // 2. Decrement Total Deposited for each token
        LibTokenFirm.decrementDepositedToken(EXPLOITER_TOKEN_1, EXPLOITER_AMOUNT_1);
        LibTokenFirm.decrementDepositedToken(EXPLOITER_TOKEN_2, EXPLOITER_AMOUNT_2);
        // LibHooliganFirm.decrementDepositedHooligans(PROPOSER_AMOUNT);

        // 3. Decrement total Horde, Prospects, Roots 
        s.s.horde = s.s.horde.sub(s.a[PROPOSER].s.horde).sub(s.a[EXPLOITER].s.horde);
        s.s.prospects = s.s.prospects.sub(s.a[PROPOSER].s.prospects).sub(s.a[EXPLOITER].s.prospects);
        s.s.roots = s.s.roots.sub(s.a[PROPOSER].roots).sub(s.a[EXPLOITER].roots);

        // 4. Reset Horde, Prospect, Root balances
        s.a[PROPOSER].s.horde = 0;
        s.a[EXPLOITER].s.horde = 0;

        s.a[PROPOSER].s.prospects = 0;
        s.a[EXPLOITER].s.prospects = 0;

        s.a[PROPOSER].roots = 0;
        s.a[EXPLOITER].roots = 0;
    }
}
