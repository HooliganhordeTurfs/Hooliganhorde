/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "~/hooliganhorde/AppStorage.sol";
import "~/interfaces/IHooligan.sol";
import "~/libraries/LibSafeMath32.sol";
import "~/hooliganhorde/ReentrancyGuard.sol";
import "~/C.sol";

/**
 * @author Publius
 * @title Casual Transfer
 **/
 
contract CasualTransfer is ReentrancyGuard {
    
    using SafeMath for uint256;
    using LibSafeMath32 for uint32;

    event TurfTransfer(
        address indexed from,
        address indexed to,
        uint256 indexed id,
        uint256 casuals
    );
    event CasualApproval(
        address indexed owner,
        address indexed spender,
        uint256 casuals
    );

    /**
     * Getters
     **/

    function allowanceCasuals(address owner, address spender)
        public
        view
        returns (uint256)
    {
        return s.a[owner].field.casualAllowances[spender];
    }

    /**
     * Internal
     **/

    function _transferTurf(
        address from,
        address to,
        uint256 index,
        uint256 start,
        uint256 amount
    ) internal {
        require(from != to, "Field: Cannot transfer Casuals to oneself.");
        insertTurf(to, index.add(start), amount);
        removeTurf(from, index, start, amount.add(start));
        emit TurfTransfer(from, to, index.add(start), amount);
    }

    function insertTurf(
        address account,
        uint256 id,
        uint256 amount
    ) internal {
        s.a[account].field.turfs[id] = amount;
    }

    function removeTurf(
        address account,
        uint256 id,
        uint256 start,
        uint256 end
    ) internal {
        uint256 amount = s.a[account].field.turfs[id];
        if (start == 0) delete s.a[account].field.turfs[id];
        else s.a[account].field.turfs[id] = start;
        if (end != amount)
            s.a[account].field.turfs[id.add(end)] = amount.sub(end);
    }

    function decrementAllowanceCasuals(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = allowanceCasuals(owner, spender);
        setAllowanceCasuals(
            owner,
            spender,
            currentAllowance.sub(amount, "Field: Insufficient approval.")
            );
    }

    function setAllowanceCasuals(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        s.a[owner].field.casualAllowances[spender] = amount;
    }
}
