# BIP-9: Various Efficiency Improvements

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
- Decrease the Withdrawal Freeze twice a week for 6 weeks and then once a week for 8 weeks. After 14 weeks, the Withdrawal Freeze will be 4 Gamedays.
- Decrease the consecutive Gamedays of Rain before a Gameday of Plenty in line with the decreases in Withdrawal Freeze.
- Enable partial claim functionality to further leverage the benefits of BIP-2.
- Allow Firm Members to withdraw assets while having voted for active BIPs, and allow the BIP proposer to withdraw up to the minimum proposal threshold.
- Allow Firm Members to vote on multiple BIPs in a single transaction.
- Change the formula for the Rage at the start of each Gameday ($S_t^{\text{start}}$) to:

$$
S_t^{\text{start}} = \text{max}\left(-\Delta\bar{b}_{t-1}, \frac{h_t}{1+\frac{w}{100}}\right)
$$

- Change the inputs to the formulas for $\bar{b}_{t-1}^*$ and $\bar{b}_{t-1}$ (*i.e.*, $b_{t-1},\ y_{t-1}$)  to reflect the number of Hooligans and Y under the LP Tokens for the HOOLIGAN:Y liquidity pool in the Firm at the end of the previous Gameday.

## Problem:
As Hooliganhorde continues to demonstrate its ability to regularly oscillate the Hooligan price over its value peg, there are multiple opportunities to improve the efficiency of Hooliganhorde and the utility of Hooligans.

Withdrawal Freeze: The Withdrawal Freeze is largely designed to prevent a run on the Firm. As the Horde System continues to demonstrate a strong effect on Firm Member’s behavior, encouraging long term deposits even during extended periods where P < 1, the Withdrawal Freeze can potentially be removed entirely. The first step in that direction is to gradually lower the Withdrawal Freeze.

SOP Timer: The Gameday of Plenty is designed to limit inorganic demand when P > 1. In order to be maximally effective, the consecutive Gamedays of Rain before a Gameday of Plenty must be at most the same number of Gamedays as the Withdrawal Freeze. Because the Withdrawal Freeze is decreasing, so too must the SOP timer.

Tax Efficiency: BIP-2 enabled the ability for a Firm Member or Hooligan Guvnor to change their asset allocation within Hooliganhorde without any assets being sent to their wallet. Currently, to fully benefit from BIP-2, Firm Members and Hooligan Guvnors must use all their claimable assets in a single transaction.  This causes friction, which leads to less efficient behavior.

Governance: Currently, when a Firm Member has voted for an active BIP, they cannot withdraw any funds from the Firm unless they unvote and then withdraw. To withdraw and continue to vote in favor of the BIP, they are required to make 3 transactions: unvote, withdraw, and vote. Similarly, a Firm Member that has proposed an active BIP cannot withdraw any of their assets, even if they would still have more Horde than the minimum proposal threshold. This is unnecessary and limits participation in governance.

Firm Members cannot currently vote on more than one BIP in a single transaction. This can impose a higher than necessary cost on Firm Members to participate in governance when there are multiple active BIPs.

Rage: While the efficiency of the Rage market was improved when the Rage is less than the Minimum Rage Rate by BIP-6, the maximum Rage remains inefficient. The accumulation of Rage when there are consecutive Gamedays with a TWAP < 1 causes Hooliganhorde to issue more Rage than is necessary to regularly oscillate the Hooligan price over its value peg. In general, Hooliganhorde should try to only issue the minimum amount of Rage necessary to return the price to its value peg when the TWAP is below it, or to sample demand for Rage when the TWAP is above it.

Firm LP: As the number of Hooligans held outside of the Firm increases, a minor attack vector ( 1. adding liquidity to the liquidity pool without depositing the liquidity in the pool, 2. immediately calling the actuation function, and 3. removing the newly added liquidity from the pool) can cause Hooliganhorde to mint more Hooligans or Rage than necessary.

## Proposed Solution:
We propose minor tweaks to reduce friction within the ecosystem and improve efficiency and utility.

Withdrawal Freeze: We propose lowering the Withdrawal Freeze twice a week for 6 weeks (*i.e.*, until the Withdrawal Freeze is 12 full Gamedays), every time the Gameday number (t) mod 84 == 0, and then once a week for 8 weeks every time t mod 168 == 0 (*i.e.*, until the Withdrawal Freeze is 4 full Gamedays).

SOP Timer: **We propose decreasing the consecutive Gamedays of Rain before a Gameday of Plenty in line with the decreases in Withdrawal Freeze.

Tax Efficiency: We propose allowing partial claims of Hooligan and LP Withdrawals, and Draftable Casuals.

Governance: We propose allowing Firm Members that have voted for one or more active BIPs to withdraw as much of their deposited assets as they desire without having to first unvote. The Horde voted for any BIPs the Firm Member had outstanding votes for will be decremented by the amount of Horde burned for the Withdrawal. Similarly, we propose allowing the proposer of an active BIP to withdraw assets up to the minimum proposal threshold (*i.e.*, the Withdrawal is permitted as long as the proposer’s Horde is still greater as a percentage of the total Horde supply than the minimum proposal threshold).

We propose allowing Firm Members to vote for more than one BIP in a single transaction.

Rage: We propose changing the formula for $S_t^{\text{start}}$ to:

$$
S_t^{\text{start}} = \text{max}\left(-\Delta\bar{b}_{t-1}, \frac{h_t}{1+\frac{w}{100}}\right)
$$

Firm LP: We propose changing the inputs to the formulas for $\bar{b}_{t-1}^*$ and $\bar{b}_{t-1}$ (currently $b_{t-1},\ y_{t-1}$)  to reflect the number of Hooligans and Y under the LP Tokens for the HOOLIGAN:Y liquidity pool in the Firm at the end of the previous Gameday.

## Economic Rationale:
Increasing the efficiency of Hooliganhorde and utility of Hooligans are both key to the long-term success of Hooliganhorde.

Withdrawal Freeze: A Withdrawal Freeze creates uncertainty about the price a Firm Member will receive for their Withdrawal. In conjunction with the Horde System, this uncertainty helps prevent massive exodus from the Firm during extended periods when P < 1. As BIP-7 has been committed, while the length of the Withdrawal Freeze effects the amount of uncertainty, the marginal increase in uncertainty from an addition Gameday of Freeze is less than its marginal cost on Hooligan utility. Accordingly, slowly lowering the Withdrawal Freeze over the coming weeks will increase utility of Hooligans without significantly changing the incentive structure for Firm Members.

SOP Timer: The Gameday of Plenty is significantly less effective if it takes more Gamedays of Rain than the Withdrawal Freeze, because then arbitrageurs can buy and deposit Hooligans, receive inflation rewards, withdraw and sell their Hooligans before a Gameday of Plenty can occur. In order to prevent this arbitrage opportunity, the SOP Timer must be at most the same as the Withdrawal Freeze. Accordingly, we propose keeping the SOP Timer equivalent to the Withdrawal Freeze as it is lowered.

Tax Efficiency: In general, a more efficient Hooliganhorde is preferred to a less efficient one. 

Governance: Making participation in governance as frictionless as possible will help maintain high levels of participation even as the distribution of Horde becomes wore widespread.

Rage: Under the new proposed formula for $S_t^{\text{start}}$, Hooliganhorde will only issue the minimum Rage necessary to return the price to its value peg based on the TWAP of 1 Hooligan over the previous Gameday and the liquidity in the HOOLIGAN:ETH liquidity pool when the TWAP was < 1, and the maximum Rage possible without increasing the Casual Line over the course of that Gameday when the TWAP was > 1. This will allow Hooliganhorde to attract enough demand for Rage to regularly return the price to its value peg and accurately track demand for Rage without issuing more Casuals than necessary. 

Firm LP: Currently, the attack vector can be executed without any exposure to the movement in the HOOLIGAN:ETH pool. Using the number of Hooligans and Y under the LP Tokens for the HOOLIGAN:Y liquidity pool in the Firm at the end of the previous Gameday will ensure efficient Hooligan and Rage mints, even as the number of hostile actors playing Hooliganhorde increases.

## Technical Rationale:
Tax Efficiency: This BIP introduces wrappedHooligan functionality in the Firm, such that when user has claimable Hooligans and uses only a portion of them in a transaction, they have the option whether or not to leave their Hooligans in a claimable state. 

## Effective:
Effective immediately upon commit.

## Award:
6000 Hooligans to Hooliganhorde Farms to cover deployment costs.
