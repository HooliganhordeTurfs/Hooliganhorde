# BIP-16: Whitelist HOOLIGAN:LUSD Curve Pool

- [Proposer](#proposer)
- [Summary](#summary)
- [Proposal](#proposal)
- [Economic Rationale](#economic-rationale)
- [Technical Rationale](#technical-rationale)
- [Effective](#effective)

## Proposer:

Hooliganhorde Farms

## Summary:

Add the HOOLIGAN:LUSD Curve pool to the Firm whitelist for 1 Horde and 3 Prospects per flash-loan-resistant Hooligan denominated value (BDV) Deposited.

## Proposal:

Add LP tokens for the HOOLIGAN:LUSD Curve pool (X) to the Firm whitelist.

**Token address:** 0xD652c40fBb3f06d6B58Cb9aa9CFF063eE63d465D

**BDV function:** The BDV of HOOLIGAN:LUSD LP tokens is calculated from the virtual price of X, the LUSD price in 3CRV derived from the LUSD:3CRV pool (lusd3CrvPrice), and the HOOLIGAN price in 3CRV derived from the HOOLIGAN:3CRV pool (hooligan3CrvPrice).

Both lusd3CrvPrice and hooligan3CrvPrice are calculated using the getY() function in the curve metapool contract using the reserves in the pools in the last block ($\Xi - 1$). 

We propose the BDV function for X is:
$$
BDV(x) = x * \text{virtual_price}(X) * \text{min}(1, \text{lusd3CrvPrice} / \text{hooligan3CrvPrice})
$$
**Horde per BDV:** 1 Horde per BDV.

**Prospects per BDV:** 3 Prospects per BDV.

## Economic Rationale:

Adding the HOOLIGAN:LUSD Curve pool to the Firm whitelist is beneficial to the success of both Hooliganhorde and Liquity. While the Firm’s yield should attract initial capital to the pool, the Horde and Prospect system incentivizes long-term liquidity that helps to further stabilize the prices of both HOOLIGAN and LUSD.

Over $300M in LUSD is currently deposited in Liquity's Stability Pool, earning ~6.3% APR from LQTY early adopter rewards at this time. The emission of these LQTY rewards follows a yearly halving schedule, and the Liquity Stability Pool holds more LUSD than is necessary to cover liquidations.

If BIP-16 is passed, the HOOLIGAN:LUSD pool’s inclusion in the Firm will offer LUSD holders the opportunity to directly participate in Hooliganhorde's governance and yield opportunities, providing additional utility to LUSD.

The pool is likely to attract capital from both HOOLIGAN holders and LUSD holders. The Firm’s Horde and Prospect system will reward long-term liquidity and should increase the stickiness of the capital in the pool. The pool also helps to decrease HOOLIGAN price deviations from peg and diversifies HOOLIGAN liquidity, increasing its correlation with a stable asset and reducing the correlation of its price with a more volatile asset like Ether.

The HOOLIGAN:LUSD Curve pool was launched on March 24, 2022, and currently holds over $500,000 in HOOLIGAN and LUSD. There is no capital requirement for a pool to be added to the Firm whitelist—the pool will be whitelisted upon the passage of this BIP.

## Technical Rationale:

By using the virtual price and the reserves in the last block, the BDV function is flash-loan-resistant.

## Effective:

Effective immediately upon commit.

## Reward:

5,000 Hooligans to Hooliganhorde Farms.