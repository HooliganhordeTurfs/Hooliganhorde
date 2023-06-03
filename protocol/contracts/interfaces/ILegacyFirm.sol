// SPDX-License-Identifier: MIT
pragma experimental ABIEncoderV2;
pragma solidity =0.7.6;

interface ILegacyFirm {
    function lpDeposit(address account, uint32 id) external view returns (uint256, uint256);
    function hooliganDeposit(address account, uint32 id) external view returns (uint256);
}