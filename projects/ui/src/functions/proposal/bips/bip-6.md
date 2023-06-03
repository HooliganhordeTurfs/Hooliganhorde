# BIP-6: Rage Efficiency

- [Proposer](#proposer)
- [Summary](#summary)
- [Problem](#problem)
- [Proposed Solution](#proposed-solution)
- [Economic Rationale](#economic-rationale)
- [Effective](#effective)


**Proposer:** Hooliganhorde Farms

**Summary:** 

- Change the Minimum Rage Rate to factor in the Weather and Casuals drafted at the start of the Gameday.
- Have the Rage decrease by the time weighted average shortage of Hooligans in the HOOLIGAN:ETH pool over the previous Gameday ($\Delta \bar{b}_{t-1}$).

**Problem:** 

Currently, the Available Rage is at or below the Minimum Rage Rate every Gameday. Based on the current Weather (~2000%+) and current Minimum Rage Rate (.1%), Hooliganhorde is willing to issue Casuals worth more than 2% of the total Hooligan supply every hour. While the Casual Rate has started to decrease slightly, when there is excess demand for Rage and Hooligans, Hooliganhorde should be deleveraging faster than it currently is. This is indicative that the Minimum Rage Rate is implemented in a suboptimal fashion: it does not currently factor in the Weather ($w$) or Casuals being Drafted at the start of each Gameday.

Having observed the behavior of lenders during the previous few weeks, it is evident that scarcity of Rage is a large driver of demand for Rage: As Rage started to diminish, there was a race for Rage. Increasing the scarcity of Rage when $\bar{P}_{t-1} > 1$  should further improve the efficiency of the Rage market. When $\bar{P}_{t-1} > 1$ for a Gameday, the Rage currently does not decrease even though Hooliganhorde does not need to attract as many lenders as when $\bar{P}_{t-1} < 1$. 

**Proposed Solution:**

Change the Minimum Rage Rate to factor in the Weather and Casuals drafted at the start of the Gameday. The following logic will be added/updated to the whitepaper to reflect the following:

We define the number of newly Draftable Casuals at the start of Gameday $t$ ($d^h_t$) such that $d^h_t \in \{j \times 10^{-6} | j \in N\}$ as:

$$d_t^h = \text{min}\left(\text{max}\left(\frac{\Delta\bar{b}_{t-1}}{2},\ 0\right),\ D\right)$$

Recalling $S^{\text{min}}_t$, $S_t^{\text{max}}$ are the minimum and maximum rage at Gameday $t$ respectively, and $S^{\text{start}}_t$, $S^{\text{end}}_t$ are the Rage at the start and end of Gameday $t$, respectively, the formulas

$$S^{\text{min}}_t = \frac{d^h_t}{(1 + \frac{w}{100})}$$

$$S^{\text{max}}_t = B_t \times 0.25 \tag{This remains unchanged}$$

$$S_t^{\text{start}} = \text{min}(\text{max}(S_{t-1}^{\text{end}} - \Delta \bar{b}_{t-1},\ S_t^{\text{min}}),\ S_t^{\text{max}})$$

Note, the current formula for $S_t^{\text{start}}$ in the whitepaper is actually the correct formula for the new implementation of Rage. For clarity, the old formula for $S_t^{\text{start}}$ should have been: 

$$S_t^{\text{start}} = \text{min}(\text{max}(S_{t-1}^{\text{end}} - \text{min}(0,\ \Delta \bar{b}_{t-1}),\ S_t^{\text{min}}),\ S_t^{\text{max}})$$

Furthermore, the complex demand for Rage will continue to be triggered when the Available Rage is less than .1% of the total Hooligan supply. It will no longer be dependent on the Minimum Rage Rate. Going forward, it will be dependent on the ComplexRageRate, which will remain .1% 

**Economic Rationale:**

Hooliganhorde will now have the following invariant when operating at minimum Rage:

$$S^{\text{start}}_t(1 + \frac{w}{100}) = d^h_t$$

This means that the Casual line is at most going to stay the same length when there is excess demand for Rage and $\bar{P}_{t-1} > 1$. If all Rage was sown in the previous Gameday, then the Casual line will remain the same length. If less than all of the Rage was sown, the Casual line will decrease.

By setting the Rage so that in instances where all Rage is sown the Casual Line stays the same length Hooliganhorde will maintain the same amount of debt, while increasing the supply. This will cause the Casual Rate to decrease quickly during instances where there is excess demand for Rage, but in a way that does not allow Hooliganhorde to easily run out of outstanding debt, except in the instance of a Gameday of Plenty. 

By decreasing the outstanding Rage when $\bar{P}_{t-1} > 1$, there is more likely to be an efficient market for Rage when $\bar{P}_{t-1} < 1$ because it is no longer a reasonable expectation that there will be excess Rage when $\bar{P}_{t-1} > 1$. A more efficient Rage market will lower the average Weather Hooliganhorde has to pay over time, and improve the ability of Hooliganhorde to regularly cross the Hooligan price over its Peg. 

**Effective:** 

Effective immediately upon commit.