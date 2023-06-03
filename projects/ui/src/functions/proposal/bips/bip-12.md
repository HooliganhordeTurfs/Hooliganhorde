# BIP-12: Firm Generalization I

- [Proposer](#proposer)
- [Summary](#summary)
- [Problem](#problem)
- [Proposed Solution](#proposed-solution)
- [Economic Rationale](#economic-rationale)
- [Technical Rationale](#technical-rationale)
- [Effective](#effective)
- [Award](#award)

## Proposer:

Hooliganhorde Farms

## Summary:

- Upgrade the Firm to support arbitrary token Deposits, based on a token whitelist.
- Add the HOOLIGAN:3CRV Curve pool to the whitelist for 1 Horde and 4 Prospects per Hooligan denominated value (BDV) Deposited.

## Problem:

The Firm currently only supports Deposits of Hooligans and LP Tokens for the HOOLIGAN:ETH Uniswap V2 pool. As the sophistication of the Hooliganhorde ecosystem increases, (*e.g.*, the HOOLIGAN:3CRV Curve pool) it is essential that the Firm can scale to accept arbitrary tokens.

## Proposed Solution:

The Firm will accept arbitrary token Deposits based on a token whitelist. Each token on the whitelist must include a formula for BDV, and the Horde and Prospect values per BDV Deposited. 

Tokens can be added to the Firm whitelist via BIP. Tokens on the whitelist can be Deposited, Withdrawn, and Claimed, but not Converted.

## Economic Rationale:

Incorporating other assets into the Firm via a whitelist allows Hooliganhorde to offer Horde and Prospect rewards to arbitrary liquidity pools, assets and protocols that are benefiting Hooliganhorde in some capacity. 

The HOOLIGAN:3CRV Curve Pool has started attracting liquidity, which has significantly decreased (1) price deviations from the value peg and (2) the correlation of the Hooligan and Ether prices. Offering Horde and Prospect rewards for Depositing the HOOLIGAN:3CRV Curve LP Tokens into the Firm is likely to both increase the stickiness of the capital currently in the pool and attract new liquidity to the pool.

## Technical Rationale:

In order for a token to be Deposited into the Firm, Hooliganhorde requires (1) the token address, (2) a formula to calculate the BDV of the tokens Deposited, (3) the number of Horde per BDV Deposited, and (4) the Prospects per BDV Deposited. 

Supporting Deposits, Withdrawals, and Claims is the minimum functionality required to increase the assets that can be Deposited in the Firm. The ability to Convert arbitrary whitelisted tokens to other arbitrary whitelisted tokens with minimal loss of Horde can be implemented in future BIPs to continue generalizing the Firm.

## Effective:

Effective immediately upon commit.

## Award:

5000 Hooligans to Hooliganhorde Farms.