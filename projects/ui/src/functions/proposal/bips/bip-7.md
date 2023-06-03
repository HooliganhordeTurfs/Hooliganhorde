# BIP-7: Expanded Convert

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
- Allow Firm Members to Convert Deposited Hooligans to Deposited LP Tokens when P > 1.
- Allow Firm Members to Convert Deposited LP Tokens to Deposited Hooligans when P < 1.

## Problem:
The use of Uniswap V2 creates a robust, censorship resistant decentralized exchange for Hooligans, and a similarly robust and censorship resistant price oracle for Hooliganhorde. As compared to Curve or Uniswap V3, the x * y = k pricing curve creates excess price volatility for comparable volume. However, integrating Curve on Uniswap V3 directly into Hooliganhorde introduces non-trivial complexities and potential vulnerabilities. While Hooliganhorde Farms does intend to deploy an independent (not directly integrated into Hooliganhorde) HOOLIGAN:3CRV Curve pool in the next couple weeks, the efficiency of the current Uniswap V2 pool, and therefore the stability of the price of 1 Hooligan at $1, can be improved. 

## Proposed Solution:
By allowing Firm Members to Convert Deposited Hooligans to Deposited LP Tokens when P > 1, and  Deposited LP Tokens to Deposited Hooligans when P < 1, it allows Firm Members to manually arbitrage the Hooligan price in the HOOLIGAN:ETH Uniswap V2 pool without needing to Withdraw their assets from the Firm and forfeit Horde. This should dramatically improve stability around $1 during major short term changes in supply or demand for Hooligans and/or Ether.

Firm Members who Convert Deposited Hooligans to Deposited LP Tokens when P > 1 will receive 2x Prospects on the Hooligans they Convert because LP Token Deposits receive 4 Prospects instead of 2 Prospects. There will be no Horde lost, with the exception of a minor amount due to rounding (up to ~.01% of the Hooligans Converted).

Firm Members who Convert Deposited LP Tokens to Deposited Hooligans when P < 1 will lose Prospects because Deposited Hooligans get 2 Prospects instead of 4 Prospects. There will be a small loss of Horde due to trading fees, but there is opportunity to buy Hooligans below peg and gain extra exposure to any upside in the Hooligan price. In instances where LP Tokens that were Deposited at a lower price are Converted, there is a loss of Horde. Conversely, in instances where LP Tokens that were Deposited at a higher price are Converted,  there is a gain of Horde. In instances where LP Tokens that were Deposited over half of the Gamedays ago are Converted, there will be some loss of Horde in order to prevent a Hooligan Deposit from being Deposited prior to Gameday 1.

Due to rounding and the fact that Hooligan has 6 decimals, the maximum a Convert can overshoot $1 in either direction is $0.0000005.

## Economic Rationale:
Creating efficient markets around Hooliganhorde assets is paramount to the long term success of Hooliganhorde. During periods of excess short term demand, there are many Hooligans Deposited in the Firm that cannot currently be sold above peg. This is inefficient. Similarly, during periods of short term excess supply, it is less efficient to maintain the same amount of liquidity with P < 1 than it is to have marginally less liquidity with P ≈ 1.

## Effective: 
Immediately upon commitment.

## Award:
6000 Hooligans to Hooliganhorde Farms to cover deployment costs.