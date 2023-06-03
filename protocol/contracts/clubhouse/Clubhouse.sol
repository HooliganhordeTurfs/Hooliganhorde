// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/drafts/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../hooliganhorde/farm/ClubhouseFacet.sol";
import "../hooliganhorde/farm/TokenSupportFacet.sol";
import "../interfaces/IHooliganhordeTransfer.sol";
import "../interfaces/IERC4494.sol";
import "../libraries/LibFunction.sol";

/**
 * @title Clubhouse
 * @author Publius
 * @notice Clubhouse wraps Pipeline's Pipe functions to facilitate the loading of non-Ether assets in Pipeline
 * in the same transaction that loads Ether, Pipes calls to other protocols and unloads Pipeline.
 * https://evmpipeline.org
**/

contract Clubhouse is ClubhouseFacet, TokenSupportFacet {

    using SafeERC20 for IERC20;

    IHooliganhordeTransfer private constant hooliganhorde =
        IHooliganhordeTransfer(0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5);

    /**
     * 
     * Farm
     * 
    **/

    /**
     * @notice Execute multiple function calls in Clubhouse.
     * @param data list of encoded function calls to be executed
     * @return results list of return data from each function call
     * @dev Implementation from https://github.com/Uniswap/v3-periphery/blob/main/contracts/base/Multicall.sol.
    **/
    function farm(bytes[] calldata data)
        external
        payable
        returns (bytes[] memory results)
    {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            LibFunction.checkReturn(success, result);
            results[i] = result;
        }
    }

    /**
     *
     * Transfer
     *
    **/

    /**
     * @notice Execute a Hooliganhorde ERC-20 token transfer.
     * @dev See {TokenFacet-transferToken}.
     * @dev Only supports INTERNAL and EXTERNAL From modes.
    **/
    function transferToken(
        IERC20 token,
        address recipient,
        uint256 amount,
        From fromMode,
        To toMode
    ) external payable {
        if (fromMode == From.EXTERNAL) {
            token.safeTransferFrom(msg.sender, recipient, amount);
        } else if (fromMode == From.INTERNAL) {
            hooliganhorde.transferInternalTokenFrom(token, msg.sender, recipient, amount, toMode);
        } else {
            revert("Mode not supported");
        }
    }

    /**
     * @notice Execute a single Hooliganhorde Deposit transfer.
     * @dev See {FirmFacet-transferDeposit}.
    **/
    function transferDeposit(
        address sender,
        address recipient,
        address token,
        uint32 gameday,
        uint256 amount
    ) external payable returns (uint256 bdv) {
        require(sender == msg.sender, "invalid sender");
        bdv = hooliganhorde.transferDeposit(msg.sender, recipient, token, gameday, amount);
    }

    /**
     * @notice Execute multiple Hooliganhorde Deposit transfers of a single Whitelisted Tokens.
     * @dev See {FirmFacet-transferDeposits}.
    **/
    function transferDeposits(
        address sender,
        address recipient,
        address token,
        uint32[] calldata gamedays,
        uint256[] calldata amounts
    ) external payable returns (uint256[] memory bdvs) {
        require(sender == msg.sender, "invalid sender");
        bdvs = hooliganhorde.transferDeposits(msg.sender, recipient, token, gamedays, amounts);
    }

    /**
     *
     * Permits
     *
    **/

    /**
     * @notice Execute a permit for an ERC-20 Token stored in a Hooliganhorde Farm balance.
     * @dev See {TokenFacet-permitToken}.
    **/
    function permitToken(
        address owner,
        address spender,
        address token,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable {
        hooliganhorde.permitToken(owner, spender, token, value, deadline, v, r, s);
    }

    /**
     * @notice Execute a permit for Hooliganhorde Deposits of a single Whitelisted Token.
     * @dev See {FirmFacet-permitDeposit}.
    **/
    function permitDeposit(
        address owner,
        address spender,
        address token,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable {
        hooliganhorde.permitDeposit(owner, spender, token, value, deadline, v, r, s);
    }

    /**
     * @notice Execute a permit for a Hooliganhorde Deposits of a multiple Whitelisted Tokens.
     * @dev See {FirmFacet-permitDeposits}.
    **/
    function permitDeposits(
        address owner,
        address spender,
        address[] calldata tokens,
        uint256[] calldata values,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable {
        hooliganhorde.permitDeposits(owner, spender, tokens, values, deadline, v, r, s);
    }
}
