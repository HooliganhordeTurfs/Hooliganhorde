/**
 * SPDX-License-Identifier: MIT
 **/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./Firm.sol";

/**
 * @author Publius
 * @title Token Firm
 **/
contract TokenFirm is Firm {
    uint32 private constant ASSET_PADDING = 100;

    using SafeMath for uint256;
    using LibSafeMath32 for uint32;

    event AddDeposit(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount,
        uint256 bdv
    );
    event RemoveDeposits(
        address indexed account,
        address indexed token,
        uint32[] gamedays,
        uint256[] amounts,
        uint256 amount
    );
    event RemoveDeposit(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount
    );

    event AddWithdrawal(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount
    );
    event RemoveWithdrawals(
        address indexed account,
        address indexed token,
        uint32[] gamedays,
        uint256 amount
    );
    event RemoveWithdrawal(
        address indexed account,
        address indexed token,
        uint32 gameday,
        uint256 amount
    );

    event DepositApproval(
        address indexed owner,
        address indexed spender,
        address token,
        uint256 amount
    );

    struct AssetsRemoved {
        uint256 tokensRemoved;
        uint256 hordeRemoved;
        uint256 prospectsRemoved;
        uint256 bdvRemoved;
    }

    struct AssetsAdded {
        uint256 hordeAdded;
        uint256 prospectsAdded;
        uint256 bdvAdded;
    }

    /**
     * Getters
     **/

    function getDeposit(
        address account,
        address token,
        uint32 gameday
    ) external view returns (uint256, uint256) {
        return LibTokenFirm.tokenDeposit(account, token, gameday);
    }

    function getWithdrawal(
        address account,
        address token,
        uint32 gameday
    ) external view returns (uint256) {
        return LibTokenFirm.tokenWithdrawal(account, token, gameday);
    }

    function getTotalDeposited(address token) external view returns (uint256) {
        return s.firmBalances[token].deposited;
    }

    function getTotalWithdrawn(address token) external view returns (uint256) {
        return s.firmBalances[token].withdrawn;
    }

    function tokenSettings(address token)
        external
        view
        returns (Storage.FirmSettings memory)
    {
        return s.ss[token];
    }

    function withdrawFreeze() public view returns (uint8) {
        return s.gameday.withdrawGamedays;
    }

    /**
     * Internal
     **/

    // Deposit

    function _deposit(
        address account,
        address token,
        uint256 amount
    ) internal {
        (uint256 prospects, uint256 horde) = LibTokenFirm.deposit(
            account,
            token,
            _gameday(),
            amount
        );
        LibFirm.depositFirmAssets(account, prospects, horde);
    }

    // Withdraw

    function _withdrawDeposits(
        address account,
        address token,
        uint32[] calldata gamedays,
        uint256[] calldata amounts
    ) internal {
        require(
            gamedays.length == amounts.length,
            "Firm: Crates, amounts are diff lengths."
        );
        AssetsRemoved memory ar = removeDeposits(
            account,
            token,
            gamedays,
            amounts
        );
        _withdraw(
            account,
            token,
            ar.tokensRemoved,
            ar.hordeRemoved,
            ar.prospectsRemoved
        );
    }

    function _withdrawDeposit(
        address account,
        address token,
        uint32 gameday,
        uint256 amount
    ) internal {
        (uint256 hordeRemoved, uint256 prospectsRemoved, ) = removeDeposit(
            account,
            token,
            gameday,
            amount
        );
        _withdraw(account, token, amount, hordeRemoved, prospectsRemoved);
    }

    function _withdraw(
        address account,
        address token,
        uint256 amount,
        uint256 horde,
        uint256 prospects
    ) private {
        uint32 arrivalGameday = _gameday() + s.gameday.withdrawGamedays;
        addTokenWithdrawal(account, token, arrivalGameday, amount);
        LibTokenFirm.decrementDepositedToken(token, amount);
        LibFirm.withdrawFirmAssets(account, prospects, horde);
    }

    function removeDeposit(
        address account,
        address token,
        uint32 gameday,
        uint256 amount
    )
        private
        returns (
            uint256 hordeRemoved,
            uint256 prospectsRemoved,
            uint256 bdv
        )
    {
        bdv = LibTokenFirm.removeDeposit(account, token, gameday, amount);
        prospectsRemoved = bdv.mul(s.ss[token].prospects);
        hordeRemoved = bdv.mul(s.ss[token].horde).add(
            LibFirm.hordeReward(prospectsRemoved, _gameday() - gameday)
        );
        emit RemoveDeposit(account, token, gameday, amount);
    }

    function removeDeposits(
        address account,
        address token,
        uint32[] calldata gamedays,
        uint256[] calldata amounts
    ) internal returns (AssetsRemoved memory ar) {
        for (uint256 i; i < gamedays.length; ++i) {
            uint256 crateBdv = LibTokenFirm.removeDeposit(
                account,
                token,
                gamedays[i],
                amounts[i]
            );
            ar.bdvRemoved = ar.bdvRemoved.add(crateBdv);
            ar.tokensRemoved = ar.tokensRemoved.add(amounts[i]);
            ar.hordeRemoved = ar.hordeRemoved.add(
                LibFirm.hordeReward(
                    crateBdv.mul(s.ss[token].prospects),
                    _gameday() - gamedays[i]
                )
            );
        }
        ar.prospectsRemoved = ar.bdvRemoved.mul(s.ss[token].prospects);
        ar.hordeRemoved = ar.hordeRemoved.add(
            ar.bdvRemoved.mul(s.ss[token].horde)
        );
        emit RemoveDeposits(account, token, gamedays, amounts, ar.tokensRemoved);
    }

    function addTokenWithdrawal(
        address account,
        address token,
        uint32 arrivalGameday,
        uint256 amount
    ) private {
        s.a[account].withdrawals[token][arrivalGameday] = s
        .a[account]
        .withdrawals[token][arrivalGameday].add(amount);
        s.firmBalances[token].withdrawn = s.firmBalances[token].withdrawn.add(
            amount
        );
        emit AddWithdrawal(account, token, arrivalGameday, amount);
    }

        // Claim

    function _claimWithdrawal(
        address account,
        address token,
        uint32 gameday
    ) internal returns (uint256) {
        uint256 amount = _removeTokenWithdrawal(account, token, gameday);
        s.firmBalances[token].withdrawn = s.firmBalances[token].withdrawn.sub(
            amount
        );
        emit RemoveWithdrawal(msg.sender, token, gameday, amount);
        return amount;
    }

    function _claimWithdrawals(
        address account,
        address token,
        uint32[] calldata gamedays
    ) internal returns (uint256 amount) {
        for (uint256 i; i < gamedays.length; ++i) {
            amount = amount.add(
                _removeTokenWithdrawal(account, token, gamedays[i])
            );
        }
        s.firmBalances[token].withdrawn = s.firmBalances[token].withdrawn.sub(
            amount
        );
        emit RemoveWithdrawals(msg.sender, token, gamedays, amount);
        return amount;
    }

    function _removeTokenWithdrawal(
        address account,
        address token,
        uint32 gameday
    ) private returns (uint256) {
        require(
            gameday <= s.gameday.current,
            "Claim: Withdrawal not receivable"
        );
        uint256 amount = s.a[account].withdrawals[token][gameday];
        delete s.a[account].withdrawals[token][gameday];
        return amount;
    }

    // Transfer

    function _transferDeposit(
        address sender,
        address recipient,
        address token,
        uint32 gameday,
        uint256 amount
    ) internal returns (uint256) {
        (uint256 horde, uint256 prospects, uint256 bdv) = removeDeposit(
            sender,
            token,
            gameday,
            amount
        );
        LibTokenFirm.addDeposit(recipient, token, gameday, amount, bdv);
        LibFirm.transferFirmAssets(sender, recipient, prospects, horde);
        return bdv;
    }

    function _transferDeposits(
        address sender,
        address recipient,
        address token,
        uint32[] calldata gamedays,
        uint256[] calldata amounts
    ) internal returns (uint256[] memory) {
        require(
            gamedays.length == amounts.length,
            "Firm: Crates, amounts are diff lengths."
        );
        AssetsRemoved memory ar;
        uint256[] memory bdvs = new uint256[](gamedays.length);

        for (uint256 i; i < gamedays.length; ++i) {
            uint256 crateBdv = LibTokenFirm.removeDeposit(
                sender,
                token,
                gamedays[i],
                amounts[i]
            );
            LibTokenFirm.addDeposit(
                recipient,
                token,
                gamedays[i],
                amounts[i],
                crateBdv
            );
            ar.bdvRemoved = ar.bdvRemoved.add(crateBdv);
            ar.tokensRemoved = ar.tokensRemoved.add(amounts[i]);
            ar.hordeRemoved = ar.hordeRemoved.add(
                LibFirm.hordeReward(
                    crateBdv.mul(s.ss[token].prospects),
                    _gameday() - gamedays[i]
                )
            );
            bdvs[i] = crateBdv;
        }
        ar.prospectsRemoved = ar.bdvRemoved.mul(s.ss[token].prospects);
        ar.hordeRemoved = ar.hordeRemoved.add(
            ar.bdvRemoved.mul(s.ss[token].horde)
        );
        emit RemoveDeposits(sender, token, gamedays, amounts, ar.tokensRemoved);
        LibFirm.transferFirmAssets(
            sender,
            recipient,
            ar.prospectsRemoved,
            ar.hordeRemoved
        );
        return bdvs;
    }

    function _spendDepositAllowance(
        address owner,
        address spender,
        address token,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = depositAllowance(owner, spender, token);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "Firm: insufficient allowance");
            _approveDeposit(owner, spender, token, currentAllowance - amount);
        }
    }
        
    function _approveDeposit(address account, address spender, address token, uint256 amount) internal {
        s.a[account].depositAllowances[spender][token] = amount;
        emit DepositApproval(account, spender, token, amount);
    }

    function depositAllowance(
        address account,
        address spender,
        address token
    ) public view virtual returns (uint256) {
        return s.a[account].depositAllowances[spender][token];
    }

    function _gameday() private view returns (uint32) {
        return s.gameday.current;
    }
}
