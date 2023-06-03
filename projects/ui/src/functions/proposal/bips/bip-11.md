# BIP-11: Guvnors Market

- [Proposer](#proposer)
- [Summary](#summary)
- [Problem](#problem)
- [Proposed Solution](#proposed-solution)
- [Economic Rationale](#economic-rationale)
- [Effective](#effective)
- [Award](#award)

## Proposer:
Hooliganhorde Farms

## Summary:
- Launch the Guvnors Market as a decentralized way to buy and sell Casuals through Hooliganhorde.

## Problem:
Currently, there is no way to exchange Casuals in a decentralized fashion. Accordingly, there is little liquidity around Casuals, and trades require trusting a third party. 

## Proposed Solution:
We propose the Guvnors Market, a decentralized Casual exchange. The Guvnors market will support Casual Orders to purchase Casuals and Casual Listings to sell Casuals. 

### *Casual Orders*

Anyone with Hooligans not in the Firm can Order Casuals.

A Casual Order has three inputs: (1) the maximum number of Casuals to be purchased, (2) the maximum price per Casual, denominated in Hooligans, and (3) the maximum place in the Casual Line (i.e., the number of Casuals that will become Draftable before a given Casual) to purchase from.

A Casual Order can be Cancelled at any time until it is Filled. To facilitate instant clearance, Hooligans are locked in a Casual Order until it is entirely Filled or Cancelled. Hooligans can only be locked in a single Casual Order at a time.

### *Casual Listings*

Casuals that grow from Hooligans that were Sown in the same transaction form a Turf. Anyone with a Turf can List a whole or partial Turf for Hooligans. By default, the portion of a Turf in a partial Casual Listing that is farthest from the front of the Casual Line is Listed.

A Casual Listing has five inputs: (1) the Turf being Listed, (2) the difference between the front of the portion of the Turf included in the Casual Listing from the front of the whole Turf, denominated in Casuals, where a null input Lists from the back of the Turf, (3) the number of Casuals in the Turf for sale, where a null input Lists the whole Turf, (4) the minimum price per Casual, denominated in Hooligans, and (5) the maximum number of total Draftable Casuals over all Gamedays before the Casual Listing expires.

A Casual Listing can be Cancelled at any time until it is entirely Filled. Turfs can only be Listed in a single Casual Listing at a time. Casual Listings are automatically Cancelled if the owner of the Turf transfers or re-Lists any Casuals in the Turf.

### *Clearance*

An outstanding Casual Order can be entirely or partially Filled at any time by a seller. If the Casual Order is partially Filled, the rest of the Casual Order remains Listed. Similarly, an outstanding Casual Listing can be entirely or partially Filled at any time by a buyer. If the Casual Listing is partially Filled, the rest of the Casual Listing remains Listed.

In instances where $0 < h_t$ causes a Casual Order and Casual Listing that previously were not overlapping to overlap, either the buyer or seller can Fill their order at their preferred price.

## Economic Rationale:
Liquidity and price discovery for Casuals is an important step in the evolution of the Hooliganhorde ecosystem. 

## Effective:
Immediately upon commitment.

## Award:
4000 Hooligans to Hooliganhorde Farms and 1000 Hooligans to Dumpling to cover deployment costs.