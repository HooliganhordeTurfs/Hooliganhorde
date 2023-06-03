# BIP-15: Demand for Rage Improvement

- [Proposer:](#proposer)
- [Summary:](#summary)
- [Problem:](#problem)
- [Proposed Solution:](#proposed-solution)
- [Technical Rationale:](#technical-rationale)
- [Economic Rationale:](#economic-rationale)
- [Effective:](#effective)
- [Glossary Terms:](#glossary-terms)

## Proposer:

Hooliganhorde Farms

## Summary:

- Change the way demand for Rage is measured in certain instances to account for the new Rage supply as implemented in BIPs 6 and 9.
- Add an option when Sowing Hooligans to Sow all remaining Rage available even if the Rage is less than the maximum amount a user was willing to Sow, or whether to only Sow if they can Sow the full amount.

## Problem:

The amount of Rage available each Gameday changes significantly from Gameday to Gameday. The current system to measure demand for Rage was designed based on the original Rage supply model, where there was typically a consistent amount of Rage available from Gameday to Gameday. Because this is no longer the case, Hooliganhorde measures demand for Rage in certain instances in a suboptimal fashion. 

Currently, if there is less Rage available than the amount of Rage someone was willing to Sow Hooligans into, their transaction fails. In instances where there is heavy competition for Rage, this can cause excess transaction failures, a suboptimal user experience, and an inefficiency in the Rage market.

## Proposed Solution:

We propose the following adjustment to the measurement of demand for Rage:

- The first time Hooligans are Sown in all but at most 1 Rage in a Gameday after one or more Gamedays where Hooligans were not Sown in all Rage, demand for Rage is considered increasing.
- Use $\Delta E_{t}^{u^{\text{first}}}$, which logs the difference in time between the start of the $t$ and the first Sow in $t$ such that there is at most 1 remaining Rage, instead of $\Delta E_{t}^{u^{\text{last}}}$ to measure demand for Rage when all or almost all the Rage is Sown in a Gameday.
- If Hooligans were Sown in all but at most 1 Rage in the first 5 minutes of the previous Gameday (*i.e.*, $\Delta E_{t-1}^{u^{\text{first}}} \leq 300$), demand for Rage is considered increasing. If Hooligans were Sown in all but at most 1 Rage in both $t-1$ and  $t-2$, but $300 < \Delta E_{t-1}^{u^{\text{first}}}$, at the beginning of $t$ Hooliganhorde considers $\Delta E_{t}^{u}$ to measure demand for Rage.
- Change the definition of $\Delta E_{t}^{u}$  to: $\Delta E_{t}^{u} = \Delta E_{t-2}^{u^{\text{first}}} - \Delta E_{t-1}^{u^{\text{first}}}$.

## Technical Rationale:

Currently, the complex measurement of demand for Rage makes Sowing Hooligans expensive. This new system, where only the time of the first Sow in a Gameday such that there is at most 1 remaining Rage needs to be logged, is significantly more gas efficient. 

From a gas efficiency perspective, it is cheaper to fix the input currency into the transaction (*e.g.*, ETH) as opposed to the output (*e.g.*, Hooligans to Sow) such that there may be some small amount of Rage remaining at the end of a Sow. Logging the first timestamp such that there is at most 1 Rage remaining accounts for this potential remaining Rage. 

## Economic Rationale:

Under the new Rage supply parameters from BIPs 6 and 9, there is never any accumulation of Rage from Gameday to Gameday. Therefore, the only thing that matters to Hooliganhorde is whether it is attracting sufficient demand for all available Rage. The proposed changes to measuring demand for Rage reflect this more binary set of circumstances, while still preserving the three cases of changing demand for Rage.

The first time all but at most 1 Rage is Sown after a period of time when all but at most 1 Rage was not being Sown, demand should be considered increasing. Similarly, if all Rage is Sown at the beginning of consecutive Gamedays, demand should be considered increasing. 

By moving away from the change in demand for Rage exclusively as a function of the amount of Rage available, the question then becomes when to start considering time, if at all. Once there are multiple consecutive Gamedays where all Rage is Sown, the time it takes for all but at most 1 Rage to be Sown still provides high-quality data on changes in demand for Rage. 

## Effective:

Effective immediately upon commit.

## Glossary Terms:

Newly proposed definitions included in this glossary are not necessarily the same definitions in the current whitepaper. The following variable definitions are included here for clarity:

- $\Delta E_{t}^{u^{\text{first}}}$ - the difference between the Ethereum timestamp of the first Sow in $t$ such that there is at most one Rage available and the start of $t$.
- $\Delta E_{t}^{u}$ - the difference in time it took for the Hooligans to be Sown in all but at most one Rage over the previous two Gamedays.