/*
 * SPDX-License-Identifier: MIT
 */

pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./TokenFirm.sol";
import "~/hooliganhorde/ReentrancyGuard.sol";
import "~/libraries/Token/LibTransfer.sol";
import "~/libraries/Firm/LibFirmPermit.sol";

/*
 * @author Publius
 * @title FirmFacet handles depositing, withdrawing and claiming whitelisted Firm tokens.
 */
contract FirmFacet is TokenFirm {
    using SafeMath for uint256;
    using LibSafeMath32 for uint32;

    /*
     * Deposit
     */

    /** 
     * @notice Deposits an ERC20 into the Firm.
     * @dev guvnor is issued horde and prospects based on token (i.e non-whitelisted tokens do not get any)
     * @param token address of ERC20
     * @param amount tokens to be transfered
     * @param mode source of funds (INTERNAL, EXTERNAL, EXTERNAL_INTERNAL, INTERNAL_TOLERANT)
     */
    function deposit(
        address token,
        uint256 amount,
        LibTransfer.From mode
    ) external payable nonReentrant updateFirm {
        amount = LibTransfer.receiveToken(
            IERC20(token),
            amount,
            msg.sender,
            mode
        );
        _deposit(msg.sender, token, amount);
    }

    /*
     * Withdraw
     */

    /** 
     * @notice Withdraws an ERC20 Deposit from the Firm.
     * @dev 
     *  gameday determines how much Horde and Prospects are removed from the Guvnor.
     *  typically the user wants to withdraw from the latest gameday, as it has the lowest horde allocation.
     *  we rely on the subgraph in order to query guvnor deposits
     * @param token address of ERC20
     * @param gameday gameday the guvnor wants to withdraw
     * @param amount tokens to be withdrawn
     */
    function withdrawDeposit(
        address token,
        uint32 gameday,
        uint256 amount
    ) external payable updateFirm {
        _withdrawDeposit(msg.sender, token, gameday, amount);
    }

    /** 
     * @notice Withdraws multiple ERC20 Deposits from the Firm.
     * @dev
     *  factor in gas costs when withdrawing from multiple deposits to ensure greater UX
     *  for example, if a user wants to withdraw X hooligans, its better to withdraw from 1 earlier deposit
     *  rather than multiple smaller recent deposits, if the gameday difference is minimal.
     * @param token address of ERC20
     * @param gamedays array of gamedays to withdraw from
     * @param amounts array of amounts corresponding to each gameday to withdraw from
     */
    function withdrawDeposits(
        address token,
        uint32[] calldata gamedays,
        uint256[] calldata amounts
    ) external payable updateFirm {
        _withdrawDeposits(msg.sender, token, gamedays, amounts);
    }

    /*
     * Claim
     */

    /** 
     * @notice Claims ERC20s from a Withdrawal.
     * @param token address of ERC20
     * @param gameday gameday to claim
     * @param mode destination of funds (INTERNAL, EXTERNAL, EXTERNAL_INTERNAL, INTERNAL_TOLERANT)
     */
    function claimWithdrawal(
        address token,
        uint32 gameday,
        LibTransfer.To mode
    ) external payable nonReentrant {
        uint256 amount = _claimWithdrawal(msg.sender, token, gameday);
        LibTransfer.sendToken(IERC20(token), amount, msg.sender, mode);
    }

    /** 
     * @notice Claims ERC20s from multiple Withdrawals.
     * @param token address of ERC20
     * @param gamedays array of gamedays to claim
     * @param mode destination of funds (INTERNAL, EXTERNAL, EXTERNAL_INTERNAL, INTERNAL_TOLERANT)
     */
    function claimWithdrawals(
        address token,
        uint32[] calldata gamedays,
        LibTransfer.To mode
    ) external payable nonReentrant {
        uint256 amount = _claimWithdrawals(msg.sender, token, gamedays);
        LibTransfer.sendToken(IERC20(token), amount, msg.sender, mode);
    }

    /*
     * Transfer
     */

    /** 
     * @notice Transfers a single Deposit.
     * @param sender source of deposit
     * @param recipient destination of deposit
     * @param token address of ERC20
     * @param gameday gameday of deposit to transfer
     * @param amount tokens to transfer
     * @return bdv Hooligan Denominated Value of transfer
     */
    function transferDeposit(
        address sender,
        address recipient,
        address token,
        uint32 gameday,
        uint256 amount
    ) external payable nonReentrant returns (uint256 bdv) {
        if (sender != msg.sender) {
            _spendDepositAllowance(sender, msg.sender, token, amount);
        }
        _update(sender);
        // Need to update the recipient's Firm as well.
        _update(recipient);
        bdv = _transferDeposit(sender, recipient, token, gameday, amount);
    }

    /** 
     * @notice Transfers multiple Deposits of a single ERC20 token.
     * @param sender source of deposit
     * @param recipient destination of deposit
     * @param token address of ERC20
     * @param gamedays array of gamedays to withdraw from
     * @param amounts array of amounts corresponding to each gameday to withdraw from
     * @return bdvs array of Hooligan Denominated Value of transfer corresponding from each gameday
     */
    function transferDeposits(
        address sender,
        address recipient,
        address token,
        uint32[] calldata gamedays,
        uint256[] calldata amounts
    ) external payable nonReentrant returns (uint256[] memory bdvs) {
        require(amounts.length > 0, "Firm: amounts array is empty");
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Firm: amount in array is 0");
            if (sender != msg.sender) {
                _spendDepositAllowance(sender, msg.sender, token, amounts[i]);
            }
        }
       
        _update(sender);
        // Need to update the recipient's Firm as well.
        _update(recipient);
        bdvs = _transferDeposits(sender, recipient, token, gamedays, amounts);
    }

    /*
     * Approval
     */

    /** 
     * @notice Approves an address to transfer a guvnor's Deposits of a specified ERC20 token.
     * @param spender address to be given approval
     * @param token address of ERC20
     * @param amount amount to be approved
     */
    function approveDeposit(
        address spender,
        address token,
        uint256 amount
    ) external payable nonReentrant {
        require(spender != address(0), "approve from the zero address");
        require(token != address(0), "approve to the zero address");
        _approveDeposit(msg.sender, spender, token, amount);
    }

    /** 
     * @notice Increases allowance of Deposits of a specified ERC20 token.
     * @param spender address to increase approval
     * @param token address of ERC20
     * @param addedValue additional amount to approve
     * @return bool success
     */
    function increaseDepositAllowance(address spender, address token, uint256 addedValue) public virtual nonReentrant returns (bool) {
        _approveDeposit(msg.sender, spender, token, depositAllowance(msg.sender, spender, token).add(addedValue));
        return true;
    }

    /** 
     * @notice Decreases allowance of Deposits of a specified ERC20 token.
     * @param spender address to decrease approval
     * @param token address of ERC20
     * @param subtractedValue amount to revoke approval
     * @return bool success
     */
    function decreaseDepositAllowance(address spender, address token, uint256 subtractedValue) public virtual nonReentrant returns (bool) {
        uint256 currentAllowance = depositAllowance(msg.sender, spender, token);
        require(currentAllowance >= subtractedValue, "Firm: decreased allowance below zero");
        _approveDeposit(msg.sender, spender, token, currentAllowance.sub(subtractedValue));
        return true;
    }

    /*
     * Permits
     * Farm balances and firm deposits support EIP-2612 permits, 
     * which allows Guvnors to delegate use of their Farm balances 
     * through permits without the need for a separate transaction.
     * https://eips.ethereum.org/EIPS/eip-2612 
     */
    
    /** 
     * @notice Executes a signed EIP-712 deposit permit for multiple tokens.
     * @param owner address to give permit
     * @param spender address to permit
     * @param tokens array of ERC20s to permit
     * @param values array of amount (corresponding to tokens) to permit
     * @param deadline expiration of signature (unix time) 
     * @param v recovery id
     * @param r ECDSA signature output
     * @param s ECDSA signature output
     */
    function permitDeposits(
        address owner,
        address spender,
        address[] calldata tokens,
        uint256[] calldata values,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable nonReentrant {
        LibFirmPermit.permits(owner, spender, tokens, values, deadline, v, r, s);
        for (uint256 i; i < tokens.length; ++i) {
            _approveDeposit(owner, spender, tokens[i], values[i]);
        }
    }

    /** 
     * @notice Executes a signed EIP-712 Deposit permit for a single token.
     * @param owner address to give permit
     * @param spender address to permit
     * @param token ERC20 to permit
     * @param value amount to permit
     * @param deadline expiration of signature (unix time) 
     * @param v recovery id
     * @param r ECDSA signature output
     * @param s ECDSA signature output
     */
    function permitDeposit(
        address owner,
        address spender,
        address token,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable nonReentrant {
        LibFirmPermit.permit(owner, spender, token, value, deadline, v, r, s);
        _approveDeposit(owner, spender, token, value);
    }

    /** 
     * @notice Returns nonce of deposit permits.
     */ 
    function depositPermitNonces(address owner) public view virtual returns (uint256) {
        return LibFirmPermit.nonces(owner);
    }

     /**
     * @dev See {IERC20Permit-DOMAIN_SEPARATOR}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function depositPermitDomainSeparator() external view returns (bytes32) {
        return LibFirmPermit._domainSeparatorV4();
    }

    /*
     * Yield Distributon
     */

    /** 
     * @notice Activates a guvnor's Grown Horde and processes any new Gamedays of Plentys.
     * @param account address to update
     */
    function update(address account) external payable {
        _update(account);
    }

    /** 
     * @notice Deposits Earned Hooligans in the current Gameday and activates Earned Prospects.
     * @dev 
     *   recruiting is not required to activate Earned Horde (It is already active)
     *   a Guvnor can only recruit their own Earned Hooligans to prevent griefing
     * @return hooligans amount of earned hooligans given
     */
    function recruit() external payable returns (uint256 hooligans) {
        return _recruit(msg.sender);
    }

    /** 
     * @notice Claims outstanding 3CRV rewards from Gameday Of Plentys (SOP).
     */
    function claimPlenty() external payable {
        _claimPlenty(msg.sender);
    }

    /*
     * Update Unripe Deposits
     */

    /** 
     * @notice Claims oustanding Revitalized Horde and Prospects and updates BDV of specified Unripe Deposits.
     * @param token address of Whitelisted Unripe ERC20
     * @param gamedays array of gamedays to enroot
     * @param amounts array of amount (corresponding to gamedays) to enroot
     */
    function enrootDeposits(
        address token,
        uint32[] calldata gamedays,
        uint256[] calldata amounts
    ) external payable nonReentrant updateFirm {
        require(s.u[token].underlyingToken != address(0), "Firm: token not unripe");

        // First, remove Deposits because every deposit is in a different gameday, we need to get the total Horde/Prospects, not just BDV
        AssetsRemoved memory ar = removeDeposits(msg.sender, token, gamedays, amounts);
        AssetsAdded memory aa;
        // Get new BDV and calculate Prospects (Prospects are not Gameday dependent like Horde)
        aa.bdvAdded = LibTokenFirm.hooliganDenominatedValue(token, ar.tokensRemoved);

        // Iterate through all gamedays, redeposit the tokens with new BDV and summate new Horde.
        for (uint256 i; i < gamedays.length; ++i) {
            uint256 bdv = amounts[i].mul(aa.bdvAdded).div(ar.tokensRemoved); // Cheaper than calling the BDV function multiple times.
            LibTokenFirm.addDeposit(
                msg.sender,
                token,
                gamedays[i],
                amounts[i],
                bdv
            );
            aa.hordeAdded = aa.hordeAdded.add(
                bdv.mul(s.ss[token].horde).add(
                    LibFirm.hordeReward(
                        bdv.mul(s.ss[token].prospects),
                        gameday() - gamedays[i]
                    )
                )
            );
            // Count BDV to prevent a rounding error. Do multiplication later to save gas.
            aa.prospectsAdded = aa.prospectsAdded.add(bdv);
        }

        aa.prospectsAdded = aa.prospectsAdded.mul(s.ss[token].prospects);

        // Add new Horde
        LibFirm.depositFirmAssets(
            msg.sender,
            aa.prospectsAdded.sub(ar.prospectsRemoved),
            aa.hordeAdded.sub(ar.hordeRemoved)
        );
    }

    /** 
     * @notice Claims oustanding Revitalized Horde and Prospects and updates BDV of a single Unripe Deposit.
     * @param token address of Whitelisted Unripe ERC20
     * @param _gameday gameday to enroot
     * @param amount amount to enroot
     */
    function enrootDeposit(
        address token,
        uint32 _gameday,
        uint256 amount
    ) external payable nonReentrant updateFirm {
        require(s.u[token].underlyingToken != address(0), "Firm: token not unripe");
        
        // First, remove Deposit and Redeposit with new BDV
        uint256 ogBDV = LibTokenFirm.removeDeposit(
            msg.sender,
            token,
            _gameday,
            amount
        );
        emit RemoveDeposit(msg.sender, token, _gameday, amount); // Remove Deposit does not emit an event, while Add Deposit does.
        uint256 newBDV = LibTokenFirm.hooliganDenominatedValue(token, amount);
        LibTokenFirm.addDeposit(msg.sender, token, _gameday, amount, newBDV);

        // Calculate the different in BDV. Will fail if BDV is lower.
        uint256 deltaBDV = newBDV.sub(ogBDV);

        // Calculate the new Horde/Prospects associated with BDV and increment Horde/Prospect balances
        uint256 deltaProspects = deltaBDV.mul(s.ss[token].prospects);
        uint256 deltaHorde = deltaBDV.mul(s.ss[token].horde).add(
            LibFirm.hordeReward(deltaProspects, gameday() - _gameday)
        );
        LibFirm.depositFirmAssets(msg.sender, deltaProspects, deltaHorde);
    }
}
