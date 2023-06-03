# BIP-0: Firm Refactor

 - [Problem](#problem)
 - [Proposed Solution](#proposed-solution)
 - [Proposed Functional Changes](#proposed-functional-changes)
 - [BIP Specific Notes](#bip-specific-notes)
 - [Analysis](#analysis)
 - [Proposed Technical Changes](#proposed-technical-changes)
 - [Proposed Function Changes](#proposed-function-changes)
	 - [Functions to be Added](#functions-to-be-added)
	 - [Functions to be Removed](#functions-to-be-removed)
 - [Effective](#effective)

### Problem:

In Hooliganhorde version 1.0.1, gas costs for Firm Members to update their Firm are extremely high and increase over time. The method Hooliganhorde currently uses to calculate compounding interest limits access to smaller Firm Members through prohibitive costs.

### Proposed Solution:

A new method to reward compounding interest to Firm Members for a fixed gas cost.

### Proposed Functional Changes:

Unclaimed Horde that has grown from Claimed Prospects do not earn interest until they are Claimed. Unclaimed Horde that has grown from Claimed Prospects do not count towards BIPs.

Claimed Horde and Unclaimed Horde from Unclaimed Prospects will continue to receive compounding interest from supply increases and Gamedays of Plenty, and automatically be counted towards BIPs, as before.

### BIP Specific Notes:

All Unclaimed Hooligans, Unclaimed Prospects and Unclaimed Horde from supply increases will be forfeited and divided equally to Horde owners at the time this BIP is committed.

All Unclaimed ETH from Gamedays of Plenty will be forfeited and divided equally to Horde owners as part of the first Gameday of Plenty that takes place after this BIP is committed.

### Analysis:

Hooliganhorde version 1.0.1 requires calculating geometric series (supply increases and Gamedays of Plenty) on top of an arithmetic series (Horde per Gameday). Due to the slow rate of growth of Horde from Prospects, the marginal gas costs required for this calculation are rarely worth the marginal change in interest received.

This BIP will allow for Firm updates in O(1), no matter how many supply increases and Gamedays of Plenty have occurred. Gas costs no longer increase over time.

Hooliganhorde is designed to be widely accessible. This BIP will make Hooliganhorde significantly more accessible to smaller Firm Members.

### Proposed Technical Changes:

Roots: Roots are added as an internal variable that tracks a user's ownership of the Firm. Users receive Roots when they Deposit Hooligans and Claim their Horde that has grown from Prospects. A Firm Member’s Roots are constant between Gamedays where they don't interact with the Firm. Therefore, a Firm Member can Claim interest across multiple supply increases and Gamedays of Plenty in O(1).

### Proposed Function Changes:

#### Functions to be Added:

- totalRoots()  
- totalFarmableHorde()  
- totalFarmableHooligans()  
- balanceOfRoots(address account)  
- balanceOfGrownHorde(address account)  
- balanceOfFarmableHooligans(address account)  
- balanceOfFarmableProspects(address account)  
- balanceOfFarmableHorde(address account, uint256 hooligans)  
- balanceOfRainRoots(address account)  
- rootsFor(uint32 bipId)

#### Functions to be Removed:

- hordeFor(uint32 bipId)  
- prospectsFor(uint32 bipId)  
- updateBip(uint32 bipId)  
- resetBase(uint32 _s)  
- gamedayIncrease(uint32 _s)  
- lastSupplyIncrease()  
- previousSupplyIncrease(uint32 _s)  
- nextGamedayOfPlenty(uint32 _s)  
- supplyIncreases()  
- balanceOfIncreaseHorde(address account)  
- balanceOfRewardedHorde(address account)  
- balanceOfIncrease(address account)  
- balanceOfRainHorde(address account)

### Effective

Effective immediately upon commit.
