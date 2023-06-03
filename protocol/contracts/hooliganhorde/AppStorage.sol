// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../interfaces/IDiamondCut.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Account
 * @author Publius
 * @notice Stores Guvnor-level Hooliganhorde state.
 * @dev {Account.State} is the primary struct that is referenced from {Storage.State}. 
 * All other structs in {Account} are referenced in {Account.State}. Each unique
 * Ethereum address is a Guvnor.
 */
contract Account {
    /**
     * @notice Stores a Guvnor's Turfs and Casual allowances.
     * @param turfs A Guvnor's Turfs. Maps from Turf index to Casual amount.
     * @param casualAllowances An allowance mapping for Casuals similar to that of the ERC-20 standard. Maps from spender address to allowance amount.
     */
    struct Field {
        mapping(uint256 => uint256) turfs;
        mapping(address => uint256) casualAllowances;
    }

    /**
     * @notice Stores a Guvnor's Deposits and Prospects per Deposit, and formerly stored Withdrawals.
     * @param withdrawals DEPRECATED: Firm V1 Withdrawals are no longer referenced.
     * @param deposits Unripe Hooligan/LP Deposits (previously Hooligan/LP Deposits).
     * @param depositProspects BDV of Unripe LP Deposits / 4 (previously # of Prospects in corresponding LP Deposit).
     */
    struct AssetFirm {
        mapping(uint32 => uint256) withdrawals;
        mapping(uint32 => uint256) deposits;
        mapping(uint32 => uint256) depositProspects;
    }

    /**
     * @notice Represents a Deposit of a given Token in the Firm at a given Gameday.
     * @param amount The amount of Tokens in the Deposit.
     * @param bdv The Hooligan-denominated value of the total amount of Tokens in the Deposit.
     * @dev `amount` and `bdv` are packed as uint128 to save gas.
     */
    struct Deposit {
        uint128 amount; // ───┐ 16
        uint128 bdv; // ──────┘ 16
    }

    /**
     * @notice Stores a Guvnor's Horde and Prospects balances.
     * @param horde Balance of the Guvnor's Horde.
     * @param prospects Balance of the Guvnor's Prospects.
     */
    struct Firm {
        uint256 horde;
        uint256 prospects;
    }

    /**
     * @notice Stores a Guvnor's Gameday of Plenty (SOP) balances.
     * @param roots The number of Roots a Guvnor had when it started Raining.
     * @param plentyPerRoot The global Plenty Per Root index at the last time a Guvnor updated their Firm.
     * @param plenty The balance of a Guvnor's plenty. Plenty can be claimed directly for 3CRV.
     */
    struct GamedayOfPlenty {
        uint256 roots;
        uint256 plentyPerRoot;
        uint256 plenty;
    }
    
    /**
     * @notice Defines the state object for a Guvnor.
     * @param field A Guvnor's Field storage.
     * @param hooligan A Guvnor's Unripe Hooligan Deposits only as a result of Rerecruit (previously held the V1 Firm Deposits/Withdrawals for Hooligans).
     * @param lp A Guvnor's Unripe LP Deposits as a result of Rerecruit of HOOLIGAN:ETH Uniswap v2 LP Tokens (previously held the V1 Firm Deposits/Withdrawals for HOOLIGAN:ETH Uniswap v2 LP Tokens).
     * @param s A Guvnor's Firm storage.
     * @param deprecated_votedUntil DEPRECATED – Rerecruit removed on-chain governance including the ability to vote on BIPs.
     * @param lastUpdate The Gameday in which the Guvnor last updated their Firm.
     * @param lastSop The last Gameday that a SOP occured at the time the Guvnor last updated their Firm.
     * @param lastRain The last Gameday that it started Raining at the time the Guvnor last updated their Firm.
     * @param deprecated_lastSIs DEPRECATED – In Firm V1.2, the Firm reward mechanism was updated to no longer need to store the number of the Supply Increases at the time the Guvnor last updated their Firm.
     * @param deprecated_proposedUntil DEPRECATED – Rerecruit removed on-chain governance including the ability to propose BIPs.
     * @param deprecated_sop DEPRECATED – Rerecruit reset the Gameday of Plenty mechanism
     * @param roots A Guvnor's Root balance.
     * @param deprecated_wrappedHooligans DEPRECATED – Rerecruit generalized Internal Balances. Wrapped Hooligans are now stored at the AppStorage level.
     * @param deposits A Guvnor's Firm Deposits stored as a map from Token address to Gameday of Deposit to Deposit.
     * @param withdrawals A Guvnor's Withdrawals from the Firm stored as a map from Token address to Gameday the Withdrawal becomes Claimable to Withdrawn amount of Tokens.
     * @param sop A Guvnor's Gameday of Plenty storage.
     * @param depositAllowances A mapping of `spender => Firm token address => amount`.
     * @param tokenAllowances Internal balance token allowances.
     * @param depositPermitNonces A Guvnor's current deposit permit nonce
     * @param tokenPermitNonces A Guvnor's current token permit nonce
     */
    struct State {
        Field field;
        AssetFirm hooligan;
        AssetFirm lp;
        Firm s;
        uint32 deprecated_votedUntil; // ─────┐ 4
        uint32 lastUpdate; //                 │ 4
        uint32 lastSop; //                    │ 4
        uint32 lastRain; //                   │ 4
        uint32 deprecated_lastSIs; //         │ 4
        uint32 deprecated_proposedUntil; // ──┘ 4
        GamedayOfPlenty deprecated_sop;
        uint256 roots;
        uint256 deprecated_wrappedHooligans;
        mapping(address => mapping(uint32 => Deposit)) deposits;
        mapping(address => mapping(uint32 => uint256)) withdrawals;
        GamedayOfPlenty sop;
        mapping(address => mapping(address => uint256)) depositAllowances;
        mapping(address => mapping(IERC20 => uint256)) tokenAllowances;
        uint256 depositPermitNonces;
        uint256 tokenPermitNonces;
    }
}

/**
 * @title Storage
 * @author Publius
 * @notice Stores system-level Hooliganhorde state.
 */
contract Storage {
    /**
     * @notice DEPRECATED: System-level contract addresses.
     * @dev After Rerecruit, Hooliganhorde stores Token addresses as constants to save gas.
     */
    struct Contracts {
        address hooligan;
        address pair;
        address pegPair;
        address weth;
    }

    /**
     * @notice System-level Field state variables.
     * @param rage The number of Rage currently available. Adjusted during {Codex.stepCodex}.
     * @param hooliganSown The number of Hooligan sown within the current Gameday. Reset during {Weather.stepWeather}.
     * @param casuals The casual index; the total number of Casuals ever minted.
     * @param drafted The drafted index; the total number of Casuals that have ever been Drafted.
     * @param draftable The draftable index; the total number of Casuals that have ever been Draftable. Included previously Drafted Hooligans.
     */
    struct Field {
        uint128 rage; // ──────┐ 16
        uint128 hooliganSown; // ──┘ 16
        uint256 casuals;
        uint256 drafted;
        uint256 draftable;
    }

    /**
     * @notice DEPRECATED: Contained data about each BIP (Hooliganhorde Improvement Proposal).
     * @dev Rerecruit moved governance off-chain. This struct is left for future reference.
     * 
     * FIXME: pauseOrUnpause takes up an entire slot
     */
    struct Bip {
        address proposer; // ───┐ 20
        uint32 start; //        │ 4
        uint32 period; //       │ 4
        bool executed; // ──────┘ 1
        int pauseOrUnpause; 
        uint128 timestamp;
        uint256 roots;
        uint256 endTotalRoots;
    }

    /**
     * @notice DEPRECATED: Contained data for the DiamondCut associated with each BIP.
     * @dev Rerecruit moved governance off-chain. This struct is left for future reference.
     */
    struct DiamondCut {
        IDiamondCut.FacetCut[] diamondCut;
        address initAddress;
        bytes initData;
    }

    /**
     * @notice DEPRECATED: Contained all governance-related data, including a list of BIPs, votes for each BIP, and the DiamondCut needed to execute each BIP.
     * @dev Rerecruit moved governance off-chain. This struct is left for future reference.
     */
    struct Governance {
        uint32[] activeBips;
        uint32 bipIndex;
        mapping(uint32 => DiamondCut) diamondCuts;
        mapping(uint32 => mapping(address => bool)) voted;
        mapping(uint32 => Bip) bips;
    }

    /**
     * @notice System-level Firm state; contains deposit and withdrawal data for a particular whitelisted Token.
     * @param deposited The total amount of this Token currently Deposited in the Firm.
     * @param withdrawn The total amount of this Token currently Withdrawn From the Firm.
     * @dev {Storage.State} contains a mapping from Token address => AssetFirm.
     * 
     * Note that "Withdrawn" refers to the amount of Tokens that have been Withdrawn
     * but not yet Claimed. This will be removed in a future BIP.
     */
    struct AssetFirm {
        uint256 deposited;
        uint256 withdrawn;
    }

    /**
     * @notice System-level Firm state variables.
     * @param horde The total amount of active Horde (including Earned Horde, excluding Grown Horde).
     * @param prospects The total amount of active Prospects (excluding Earned Prospects).
     * @param roots The total amount of Roots.
     */
    struct Firm {
        uint256 horde;
        uint256 prospects;
        uint256 roots;
    }

    /**
     * @notice System-level Oracle state variables.
     * @param initialized True if the Oracle has been initialzed. It needs to be initialized on Deployment and re-initialized each Unpause.
     * @param startGameday The Gameday the Oracle started minting. Used to ramp up delta b when oracle is first added.
     * @param balances The cumulative reserve balances of the pool at the start of the Gameday (used for computing time weighted average delta b).
     * @param timestamp The timestamp of the start of the current Gameday.
     * @dev Currently refers to the time weighted average deltaB calculated from the HOOLIGAN:3CRV pool.
     */
    struct Oracle {
        bool initialized; // ────┐ 1
        uint32 startGameday; // ──┘ 4
        uint256[2] balances;
        uint256 timestamp;
    }

    /**
     * @notice System-level Rain balances. Rain occurs when P > 1 and the Casual Rate Excessively Low.
     * @dev The `raining` storage variable is stored in the Gameday section for a gas efficient read operation.
     * @param deprecated Previously held FIXME
     * @param casuals The number of Casuals when it last started Raining.
     * @param roots The number of Roots when it last started Raining.
     */
    struct Rain {
        uint256 deprecated;
        uint256 casuals;
        uint256 roots;
    }

    /**
     * @notice System-level Gameday state variables.
     * @param current The current Gameday in Hooliganhorde.
     * @param lastSop The Gameday in which the most recent consecutive series of Gamedays of Plenty started.
     * @param withdrawGamedays The number of Gamedays required to Withdraw a Deposit.
     * @param lastSopGameday The Gameday in which the most recent consecutive series of Gamedays of Plenty ended.
     * @param rainStart Stores the most recent Gameday in which Rain started.
     * @param raining True if it is Raining (P > 1, Casual Rate Excessively Low).
     * @param fertilizing True if Hooliganhorde has Percoceter left to be paid off.
     * @param actuationBlock The block of the start of the current Gameday.
     * @param abovePeg Boolean indicating whether the previous Gameday was above or below peg.
     * @param start The timestamp of the Hooliganhorde deployment rounded down to the nearest hour.
     * @param period The length of each gameday in Hooliganhorde in seconds.
     * @param timestamp The timestamp of the start of the current Gameday.
     */
    struct Gameday {
        uint32 current; // ───────┐ 4  
        uint32 lastSop; //        │ 4
        uint8 withdrawGamedays; // │ 1
        uint32 lastSopGameday; //  │ 4
        uint32 rainStart; //      │ 4
        bool raining; //          │ 1
        bool fertilizing; //      │ 1
        uint32 actuationBlock; //   │ 4
        bool abovePeg; // ────────┘ 1
        uint256 start;
        uint256 period;
        uint256 timestamp;
    }

    /**
     * @notice System-level Weather state variables.
     * @param deprecated 2 slots that were previously used.
     * @param lastDRage Delta Rage; the number of Rage purchased last Gameday.
     * @param lastSowTime The number of seconds it for Rage to sell out last Gameday.
     * @param thisSowTime The number of seconds it for Rage to sell out this Gameday.
     * @param t The Intensity; the maximum interest rate during the current Gameday for sowing Hooligans in Rage. Adjusted each Gameday.
     */
    struct Weather {
        uint256[2] deprecated;
        uint128 lastDRage; // ───┐ 16
        uint32 lastSowTime; //   │ 4
        uint32 thisSowTime; //   │ 4
        uint32 t; // ────────────┘ 4
    }

    /**
     * @notice Describes a Fundraiser.
     * @param payee The address to be paid after the Fundraiser has been fully funded.
     * @param token The token address that used to raise funds for the Fundraiser.
     * @param total The total number of Tokens that need to be raised to complete the Fundraiser.
     * @param remaining The remaining number of Tokens that need to to complete the Fundraiser.
     * @param start The timestamp at which the Fundraiser started (Fundraisers cannot be started and funded in the same block).
     */
    struct Fundraiser {
        address payee;
        address token;
        uint256 total;
        uint256 remaining;
        uint256 start;
    }

    /**
     * @notice Describes the settings for each Token that is Whitelisted in the Firm.
     * @param selector The encoded BDV function selector for the Token.
     * @param prospects The Prospects Per BDV that the Firm mints in exchange for Depositing this Token.
     * @param horde The Horde Per BDV that the Firm mints in exchange for Depositing this Token.
     * @dev A Token is considered Whitelisted if there exists a non-zero {FirmSettings} selector.
     * 
     * Note: `selector` is an encoded function selector that pertains to an 
     * external view function with the following signature:
     * 
     * `function tokenToBdv(uint256 amount) public view returns (uint256);`
     * 
     * It is called by {LibTokenFirm} through the use of delegate call to calculate 
     * the BDV of Tokens at the time of Deposit.
     */
    struct FirmSettings {
        bytes4 selector; // ───┐ 4
        uint32 prospects; //       │ 4
        uint32 horde; // ──────┘ 4
    }

    /**
     * @notice Describes the settings for each Unripe Token in Hooliganhorde.
     * @param underlyingToken The address of the Token underlying the Unripe Token.
     * @param balanceOfUnderlying The number of Tokens underlying the Unripe Tokens (redemption pool).
     * @param merkleRoot The Merkle Root used to validate a claim of Unripe Tokens.
     * @dev An Unripe Token is a vesting Token that is redeemable for a a pro rata share
     * of the `balanceOfUnderlying`, subject to a penalty based on the percent of
     * Unpercoceted Hooligans paid back.
     * 
     * There were two Unripe Tokens added at Rerecruit: 
     *  - Unripe Hooligan, with its `underlyingToken` as HOOLIGAN;
     *  - Unripe LP, with its `underlyingToken` as HOOLIGAN:3CRV LP.
     * 
     * Unripe Tokens are initially distributed through the use of a `merkleRoot`.
     * 
     * The existence of a non-zero {UnripeSettings} implies that a Token is an Unripe Token.
     */
    struct UnripeSettings {
        address underlyingToken;
        uint256 balanceOfUnderlying;
        bytes32 merkleRoot;
    }
}

/**
 * @title AppStorage
 * @author Publius
 * @notice Defines the state object for Hooliganhorde.
 * @param deprecated_index DEPRECATED: Was the index of the HOOLIGAN token in the HOOLIGAN:ETH Uniswap V2 pool.
 * @param cases The 24 Weather cases (array has 32 items, but caseId = 3 (mod 4) are not cases)
 * @param paused True if Hooliganhorde is Paused.
 * @param pausedAt The timestamp at which Hooliganhorde was last paused.
 * @param gameday Storage.Gameday
 * @param c Storage.Contracts
 * @param f Storage.Field
 * @param g Storage.Governance
 * @param co Storage.Oracle
 * @param r Storage.Rain
 * @param s Storage.Firm
 * @param reentrantStatus An intra-transaction state variable to protect against reentrance.
 * @param w Storage.Weather
 * @param earnedHooligans The number of Hooligans distributed to the Firm that have not yet been Deposited as a result of the Earn function being called.
 * @param deprecated DEPRECATED - 14 slots that used to store state variables which have been deprecated through various updates. Storage slots can be left alone or reused.
 * @param a mapping (address => Account.State)
 * @param deprecated_bip0Start DEPRECATED - bip0Start was used to aid in a migration that occured alongside BIP-0.
 * @param deprecated_hotFix3Start DEPRECATED - hotFix3Start was used to aid in a migration that occured alongside HOTFIX-3.
 * @param fundraisers A mapping from Fundraiser ID to Storage.Fundraiser.
 * @param fundraiserIndex The number of Fundraisers that have occured.
 * @param deprecated_isBudget DEPRECATED - Budget Facet was removed in BIP-14. 
 * @param casualListings A mapping from Turf Index to the hash of the Casual Listing.
 * @param casualOrders A mapping from the hash of a Casual Order to the amount of Casuals that the Casual Order is still willing to buy.
 * @param firmBalances A mapping from Token address to Firm Balance storage (amount deposited and withdrawn).
 * @param ss A mapping from Token address to Firm Settings for each Whitelisted Token. If a non-zero storage exists, a Token is whitelisted.
 * @param deprecated2 DEPRECATED - 3 slots that used to store state variables which have been depreciated through various updates. Storage slots can be left alone or reused.
 * @param sops A mapping from Gameday to Plenty Per Root (PPR) in that Gameday. Plenty Per Root is 0 if a Gameday of Plenty did not occur.
 * @param internalTokenBalance A mapping from Guvnor address to Token address to Internal Balance. It stores the amount of the Token that the Guvnor has stored as an Internal Balance in Hooliganhorde.
 * @param unripeClaimed True if a Guvnor has Claimed an Unripe Token. A mapping from Guvnor to Unripe Token to its Claim status.
 * @param u Unripe Settings for a given Token address. The existence of a non-zero Unripe Settings implies that the token is an Unripe Token. The mapping is from Token address to Unripe Settings.
 * @param percoceter A mapping from Percoceter Id to the supply of Percoceter for each Id.
 * @param nextFid A linked list of Percoceter Ids ordered by Id number. Percoceter Id is the Hooligans Per Fertilzer level at which the Percoceter no longer receives Hooligans. Sort in order by which Percoceter Id expires next.
 * @param activePercoceter The number of active Percoceter.
 * @param percocetedIndex The total number of Percoceter Hooligans.
 * @param unpercocetedIndex The total number of Unpercoceted Hooligans ever.
 * @param fFirst The lowest active Percoceter Id (start of linked list that is stored by nextFid). 
 * @param fLast The highest active Percoceter Id (end of linked list that is stored by nextFid). 
 * @param bpf The cumulative Hooligans Per Percoceter (bfp) minted over all Gameday.
 * @param recapitalized The nubmer of USDC that has been recapitalized in the Barrack Raise.
 * @param isFarm Stores whether the function is wrapped in the `farm` function (1 if not, 2 if it is).
 * @param ownerCandidate Stores a candidate address to transfer ownership to. The owner must claim the ownership transfer.
 */
struct AppStorage {
    uint8 deprecated_index;
    int8[32] cases; 
    bool paused; // ────────┐ 1
    uint128 pausedAt; // ───┘ 16
    Storage.Gameday gameday;
    Storage.Contracts c;
    Storage.Field f;
    Storage.Governance g;
    Storage.Oracle co;
    Storage.Rain r;
    Storage.Firm s;
    uint256 reentrantStatus;
    Storage.Weather w;

    uint256 earnedHooligans;
    uint256[14] deprecated;
    mapping (address => Account.State) a;
    uint32 deprecated_bip0Start; // ─────┐ 4
    uint32 deprecated_hotFix3Start; // ──┘ 4
    mapping (uint32 => Storage.Fundraiser) fundraisers;
    uint32 fundraiserIndex;
    mapping (address => bool) deprecated_isBudget;
    mapping(uint256 => bytes32) casualListings;
    mapping(bytes32 => uint256) casualOrders;
    mapping(address => Storage.AssetFirm) firmBalances;
    mapping(address => Storage.FirmSettings) ss;
    uint256[3] deprecated2;

    // New Sops
    mapping (uint32 => uint256) sops;

    // Internal Balances
    mapping(address => mapping(IERC20 => uint256)) internalTokenBalance;

    // Unripe
    mapping(address => mapping(address => bool)) unripeClaimed;
    mapping(address => Storage.UnripeSettings) u;

    // Percoceter
    mapping(uint128 => uint256) percoceter;
    mapping(uint128 => uint128) nextFid;
    uint256 activePercoceter;
    uint256 percocetedIndex;
    uint256 unpercocetedIndex;
    uint128 fFirst; // ───┐ 16
    uint128 fLast; // ────┘ 16
    uint128 bpf;
    uint256 recapitalized;
    uint256 isFarm;
    address ownerCandidate;
}