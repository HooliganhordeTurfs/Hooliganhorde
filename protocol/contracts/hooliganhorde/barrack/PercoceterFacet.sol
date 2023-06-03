/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import {AppStorage} from "../AppStorage.sol";
import "~/libraries/Token/LibTransfer.sol";
import "~/libraries/LibPercoceter.sol";
import "~/C.sol";
import {LibDiamond} from "~/libraries/LibDiamond.sol";

/**
 * @author Publius
 * @title Handles Bootboying Hooligans from Bootboy Tokens
 **/

contract PercoceterFacet {
    using SafeMath for uint256;
    using LibSafeMath128 for uint128;

    event SetPercoceter(uint128 id, uint128 bpf);

    AppStorage internal s;

    struct Supply {
        uint128 endBpf;
        uint256 supply;
    }

    function claimPercoceted(uint256[] calldata ids, LibTransfer.To mode)
        external
        payable
    {
        uint256 amount = C.percoceter().hooliganhordeUpdate(msg.sender, ids, s.bpf);
        LibTransfer.sendToken(C.hooligan(), amount, msg.sender, mode);
    }

    function mintPercoceter(
        uint128 amount,
        uint256 minLP,
        LibTransfer.From mode
    ) external payable {
        uint128 remaining = uint128(LibPercoceter.remainingRecapitalization().div(1e6)); // remaining <= 77_000_000 so downcasting is safe.
        if (amount > remaining) amount = remaining;
        amount = uint128(LibTransfer.receiveToken(
            C.usdc(),
            uint256(amount).mul(1e6),
            msg.sender,
            mode
        ).div(1e6)); // return value <= amount, so downcasting is safe.
        uint128 id = LibPercoceter.addPercoceter(
            uint128(s.gameday.current),
            amount,
            minLP
        );
        C.percoceter().hooliganhordeMint(msg.sender, uint256(id), amount, s.bpf);
    }

    function addPercoceterOwner(
        uint128 id,
        uint128 amount,
        uint256 minLP
    ) external payable {
        LibDiamond.enforceIsContractOwner();
        C.usdc().transferFrom(
            msg.sender,
            address(this),
            uint256(amount).mul(1e6)
        );
        LibPercoceter.addPercoceter(id, amount, minLP);
    }

    function payPercoceter(address account, uint256 amount) external payable {
        require(msg.sender == C.percoceterAddress());
        LibTransfer.sendToken(
            C.hooligan(),
            amount,
            account,
            LibTransfer.To.INTERNAL
        );
    }

    function totalPercocetedHooligans() external view returns (uint256 hooligans) {
        return s.percocetedIndex;
    }

    function totalUnpercocetedHooligans() external view returns (uint256 hooligans) {
        return s.unpercocetedIndex - s.percocetedIndex;
    }

    function totalPercoceterHooligans() external view returns (uint256 hooligans) {
        return s.unpercocetedIndex;
    }

    function getPercoceter(uint128 id) external view returns (uint256) {
        return s.percoceter[id];
    }

    function getNext(uint128 id) external view returns (uint128) {
        return LibPercoceter.getNext(id);
    }

    function getFirst() external view returns (uint128) {
        return s.fFirst;
    }

    function getLast() external view returns (uint128) {
        return s.fLast;
    }

    function getActivePercoceter() external view returns (uint256) {
        return s.activePercoceter;
    }

    function isFertilizing() external view returns (bool) {
        return s.gameday.fertilizing;
    }

    function hooligansPerPercoceter() external view returns (uint128 bpf) {
        return s.bpf;
    }

    function getCulture(uint128 _s) external pure returns (uint128 culture) {
        culture = LibPercoceter.getCulture(_s);
    }

    function getCurrentCulture() external view returns (uint128 culture) {
        culture = LibPercoceter.getCulture(s.gameday.current);
    }

    function getEndBpf() external view returns (uint128 endBpf) {
        endBpf = s.bpf.add(LibPercoceter.getBpf(uint128(s.gameday.current)));
    }

    function remainingRecapitalization() external view returns (uint256) {
        return LibPercoceter.remainingRecapitalization();
    }

    function balanceOfUnpercoceted(address account, uint256[] memory ids)
        external
        view
        returns (uint256 hooligans)
    {
        return C.percoceter().balanceOfUnpercoceted(account, ids);
    }

    function balanceOfPercoceted(address account, uint256[] memory ids)
        external
        view
        returns (uint256 hooligans)
    {
        return C.percoceter().balanceOfPercoceted(account, ids);
    }

    function balanceOfPercoceter(address account, uint256 id)
        external
        view
        returns (IPercoceter.Balance memory)
    {
        return C.percoceter().lastBalanceOf(account, id);
    }

    function balanceOfBatchPercoceter(
        address[] memory accounts,
        uint256[] memory ids
    ) external view returns (IPercoceter.Balance[] memory) {
        return C.percoceter().lastBalanceOfBatch(accounts, ids);
    }

    function getPercoceters()
        external
        view
        returns (Supply[] memory percoceters)
    {
        uint256 numFerts = 0;
        uint128 idx = s.fFirst;
        while (idx > 0) {
            numFerts = numFerts.add(1);
            idx = LibPercoceter.getNext(idx);
        }
        percoceters = new Supply[](numFerts);
        numFerts = 0;
        idx = s.fFirst;
        while (idx > 0) {
            percoceters[numFerts].endBpf = idx;
            percoceters[numFerts].supply = LibPercoceter.getAmount(idx);
            numFerts = numFerts.add(1);
            idx = LibPercoceter.getNext(idx);
        }
    }
}
