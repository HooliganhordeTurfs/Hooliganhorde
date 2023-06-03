/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../interfaces/IDiamondCut.sol";

/**
 * @author Publius
 * @title App Storage Old defines the legacy state object for Hooliganhorde. It is used for migration.
**/
contract AccountOld {
    struct Field {
        mapping(uint256 => uint256) turfs;
        mapping(address => uint256) casualAllowances;
    }

    struct AssetFirm {
        mapping(uint32 => uint256) withdrawals;
        mapping(uint32 => uint256) deposits;
        mapping(uint32 => uint256) depositProspects;
    }

    struct Firm {
        uint256 horde;
        uint256 prospects;
    }

    struct GamedayOfPlenty {
        uint256 base;
        uint256 horde;
    }

    struct State {
        Field field;
        AssetFirm hooligan;
        AssetFirm lp;
        Firm s;
        uint32 lockedUntil;
        uint32 lastUpdate;
        uint32 lastSupplyIncrease;
        GamedayOfPlenty sop;
    }
}

contract GamedayOld {
    struct Global {
        uint32 current;
        uint256 start;
        uint256 period;
        uint256 timestamp;
    }

    struct State {
        uint256 increaseBase;
        uint256 hordeBase;
        uint32 next;
    }

    struct GamedayOfPlenty {
        uint256 base;
        uint256 increaseBase;
        uint32 rainGameday;
        uint32 next;
    }

    struct ResetBases {
        uint256 increaseMultiple;
        uint256 hordeMultiple;
        uint256 sopMultiple;
    }
}

contract StorageOld {
    struct Contracts {
        address hooligan;
        address pair;
        address pegPair;
        address weth;
    }

    // Field

    struct Field {
        uint256 rage;
        uint256 casuals;
        uint256 drafted;
        uint256 draftable;
    }

    // Governance

    struct Bip {
        address proposer;
        uint256 prospects;
        uint256 horde;
        uint256 increaseBase;
        uint256 hordeBase;
        uint32 updated;
        uint32 start;
        uint32 period;
        bool executed;
        int pauseOrUnpause;
        uint128 timestamp;
        uint256 endTotalHorde;
    }

    struct DiamondCut {
        IDiamondCut.FacetCut[] diamondCut;
        address initAddress;
        bytes initData;
    }

    struct Governance {
        uint32[] activeBips;
        uint32 bipIndex;
        mapping(uint32 => DiamondCut) diamondCuts;
        mapping(uint32 => mapping(address => bool)) voted;
        mapping(uint32 => Bip) bips;
    }

    // Firm

    struct AssetFirm {
        uint256 deposited;
        uint256 withdrawn;
    }

    struct IncreaseFirm {
        uint32 lastSupplyIncrease;
        uint256 increase;
        uint256 increaseBase;
        uint256 horde;
        uint256 hordeBase;
    }

    struct GamedayOfPlenty {
        uint256 weth;
        uint256 base;
        uint32 last;
    }

    struct Firm {
        uint256 horde;
        uint256 prospects;
    }

    struct Oracle {
        bool initialized;
        uint256 cumulative;
        uint256 pegCumulative;
        uint32 timestamp;
        uint32 pegTimestamp;
    }

    struct Rain {
        uint32 start;
        bool raining;
        uint256 casuals;
        uint256 horde;
        uint256 hordeBase;
        uint256 increaseHorde;
    }

    struct Weather {
        uint256 startRage;
        uint256 lastDRage;
        uint96 lastRagePercent;
        uint32 lastSowTime;
        uint32 nextSowTime;
        uint32 yield;
        bool didSowBelowMin;
        bool didSowFaster;
    }
}

struct AppStorageOld {
    uint8 index;
    int8[32] cases;
    bool paused;
    uint128 pausedAt;
    GamedayOld.Global gameday;
    StorageOld.Contracts c;
    StorageOld.Field f;
    StorageOld.Governance g;
    StorageOld.Oracle o;
    StorageOld.Rain r; // Remove `hordeBase` and `increaseBase`
    StorageOld.Firm s; // Added `roots`, Set `horde` and `prospects` in `InitBip0`
    // Added reentrantStatus.
    StorageOld.Weather w; // 3 slots
    StorageOld.AssetFirm hooligan; // 2 slots
    StorageOld.AssetFirm lp; // 2 slots
    StorageOld.IncreaseFirm si; // 5 slots
    StorageOld.GamedayOfPlenty sop; // 3 slots
    mapping (uint32 => GamedayOld.State) gamedays;
    mapping (uint32 => GamedayOld.GamedayOfPlenty) sops;
    mapping (uint32 => GamedayOld.ResetBases) rbs;
    mapping (address => AccountOld.State) a;
}

/*
 * As a part of Bip-0 OldAppStorage was migrated to AppStorage. Several state variables were remapped, removed or shuffled.
 *
 * 2 memory slots (hordeBase and increaseBase) were removed from Rain.
 * 1 memory slot was added to Firm (roots). reentrantStatus (was depreciated1) was added after Firm
 * Thus, 2 memory slots were removed and 2 were added, so the storage mapping is contained.
 * The in-between memory slots in Firm were migrated in InitBip0
 *
 * IncreaseFirm changed from 5 slots to 2 slots.
 * V1IncreaseFirm was added after GamedayOfPlenty with 3 slots.
 * Thus, IncreaseFirm and GamedayOfPlenty map to IncreaseFirm, GamedayOfPlenty and V1IncreaseFirm accounting for 8 total slots.
 * Required migrations (such as GamedayOfPlenty shifting) were accounted for in InitBip0
 * Thus, no memory was shifted unintentionally as 5 slots map to 5 slots
 *
 * gamedays, sops, and rbs were removed. Mappings take up 1 slot, so 3 slots were removed.
 * They were replaced with unclaimedRoots, v2SIHooligans, sops
 * gamedays was changed to unclaimedRoots (1 slot -> 1 slot)
 * sops was changed to v2SIHooligans (1 slot -> 1 slot)
 * rbs was changed to sops (1 slot -> 1 slot, Note: This sops variable in AppStorage is completely different than sops variable in AppStorageOld).
 * No memory was shifted unintentionally as 3 slots map to 3 slots
 *
 * a remains at the same place in memory, so no memory should have been changed.
 * The Account struct changed slightly, but no memory slots were shifted.
 *
 * bip0Horde, hotFix3Horde, fundraiser, fundraiserIndex were added to the end of the state.
 * Because these variables were appended to the end of the state, no variables were overwritten by doing so.
 *
 */