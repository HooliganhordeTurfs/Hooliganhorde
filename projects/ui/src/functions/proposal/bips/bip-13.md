# BIP-13: Adjustment to Weather Changes

- [Proposer](#proposer)
- [Summary](#summary)
- [Problem](#problem)
- [Proposed Solution](#proposed-solution)
- [Economic Rationale](#economic-rationale)
- [Technical Rationale](#technical-rationale)
- [Effective](#effective)

## Summary:

- Adjust the Weather Change case when $1 < P$, the Casual Rate ($R^{D}$) is excessively high (i.e., $R^{D^{upper}} < R^{D}$), and demand for Rage is decreasing, from 1 to 0.

## Problem:

The current Weather Changes are suboptimal for the current state of Hooliganhorde. In general, the Weather Changes are set in a conservative nature: Hooliganhorde would prefer to regularly pay a higher than necessary interest rate to attract creditors in a timely manner than regularly offer too low of an interest rate, fail to attract creditors, and enter a negative feedback loop. When the debt level is greater than $R^{D^{upper}}$ Hooliganhorde is particularly conservative in its Weather Changes. BIP-9 radically improved the overall efficiency of the model but introduced new complexity around measuring demand for Rage, which has resulted in suboptimal Weather Changes. Now, as the price has once again started to oscillate more closely around $1 even with an excessively high debt level, it is an appropriate time for Hooliganhorde to be slightly less aggressive in raising the Weather when there is decreasing demand for Rage with $1 < P$. 

## Proposed Solution:

We propose the following adjustment to the Hooliganhorde Weather Changes in the cases when $1 < P$ and $R^{D^{upper}} < R^D$:

- When the demand for Rage is decreasing, the Weather Change is 0% (previously 1%).
    
![](https://i.imgur.com/J9Oykok.png)

## Technical Rationale:

Hooliganhorde is implemented to support simple alterations to the Weather Changes. There are no technical modifications necessary related to the Weather Changes.

## Economic Rationale:

While the changes to the amount of Rage implemented in BIP-9 have been overall positive (*e.g.*, the rate at which the Casual Rate was increasing has decreased dramatically), it also created an inefficiency in the measurement of demand for Rage, which in turn has resulted in some sub-optimal adjustments to the Weather. In particular, because the formula for the Rage at the start of each Gameday ($S_t^{\text{start}}$) was changed to $S_t^{\text{start}} = \text{max}\left(-\Delta\bar{b}_{t-1}, \frac{h_t}{1+\frac{w}{100}}\right)$, most times there is a liquidity and time weighted average shortage of Hooligans in the HOOLIGAN:ETH Uniswap V2 over the previous Gameday, there is very little Rage available the next Gameday. Accordingly, when gas fees are considered, it is unlikely for anyone to sow Hooligans in the scarce amount of Rage, which makes measuring demand for Rage during that Gameday particularly difficult. Changing the 1 to a 0 in the case where there is decreasing demand for Rage with $1 < P$ will offer a rough temporary solution to this inefficiency.

To date, Hooliganhorde Farms has avoided proposing any short-term fixes to the protocol in favor of one-time upgrades that implement the desired final state of a given portion of the model. However, the cost to Hooliganhorde of refraining from making this change, (*i.e.*, the Weather continuing to increase during most Gamedays after $1 < P$) while a better mechanism for measurement of demand for Rage is designed is likely to be significant over extended periods of time. Because the design for measurement of Rage is far from completed, it makes sense to make this short-term change.

## Effective:

Effective immediately upon commit.