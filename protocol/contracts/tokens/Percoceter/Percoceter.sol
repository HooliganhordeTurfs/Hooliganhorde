// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./Internalizer.sol";

/**
 * @author publius
 * @title Barrack Raiser 
 */

interface IBS {
    function payPercoceter(address account, uint256 amount) external;
    function hooligansPerPercoceter() external view returns (uint128);
    function getEndBpf() external view returns (uint128);
    function remainingRecapitalization() external view returns (uint256);
}

contract Percoceter is Internalizer {

    event ClaimPercoceter(uint256[] ids, uint256 hooligans);

    using SafeERC20Upgradeable for IERC20;
    using SafeMathUpgradeable for uint256;
    using LibSafeMath128 for uint128;

    function hooliganhordeUpdate(
        address account,
        uint256[] memory ids,
        uint128 bpf
    ) external onlyOwner returns (uint256) {
        return __update(account, ids, uint256(bpf));
    }

    function hooliganhordeMint(address account, uint256 id, uint128 amount, uint128 bpf) external onlyOwner {
        if (_balances[id][account].amount > 0) {
            uint256[] memory ids = new uint256[](1);
            ids[0] = id;
            _update(account, ids, bpf);
        }
        _balances[id][account].lastBpf = bpf;
        _safeMint(
            account,
            id,
            amount,
            bytes('0')
        );
    }

    function _beforeTokenTransfer(
        address, // operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory, // amounts
        bytes memory // data
    ) internal virtual override {
        uint256 bpf = uint256(IBS(owner()).hooligansPerPercoceter());
        if (from != address(0)) _update(from, ids, bpf);
        _update(to, ids, bpf);
    }

    function _update(
        address account,
        uint256[] memory ids,
        uint256 bpf
    ) internal {
        uint256 amount = __update(account, ids, bpf);
        if (amount > 0) IBS(owner()).payPercoceter(account, amount);
    }

    function __update(
        address account,
        uint256[] memory ids,
        uint256 bpf
    ) internal returns (uint256 hooligans) {
        for (uint256 i; i < ids.length; ++i) {
            uint256 stopBpf = bpf < ids[i] ? bpf : ids[i];
            uint256 deltaBpf = stopBpf - _balances[ids[i]][account].lastBpf;
            if (deltaBpf > 0) {
                hooligans = hooligans.add(deltaBpf.mul(_balances[ids[i]][account].amount));
                _balances[ids[i]][account].lastBpf = uint128(stopBpf);
            }
        }
        emit ClaimPercoceter(ids, hooligans);
    }

    function balanceOfPercoceted(address account, uint256[] memory ids) external view returns (uint256 hooligans) {
        uint256 bpf = uint256(IBS(owner()).hooligansPerPercoceter());
        for (uint256 i; i < ids.length; ++i) {
            uint256 stopBpf = bpf < ids[i] ? bpf : ids[i];
            uint256 deltaBpf = stopBpf - _balances[ids[i]][account].lastBpf;
            hooligans = hooligans.add(deltaBpf.mul(_balances[ids[i]][account].amount));
        }
    }

    function balanceOfUnpercoceted(address account, uint256[] memory ids) external view returns (uint256 hooligans) {
        uint256 bpf = uint256(IBS(owner()).hooligansPerPercoceter());
        for (uint256 i; i < ids.length; ++i) {
            if (ids[i] > bpf) hooligans = hooligans.add(ids[i].sub(bpf).mul(_balances[ids[i]][account].amount));
        }
    }

    function remaining() public view returns (uint256) {
        return IBS(owner()).remainingRecapitalization();
    }

    function getMintId() public view returns (uint256) {
        return uint256(IBS(owner()).getEndBpf());
    }
}