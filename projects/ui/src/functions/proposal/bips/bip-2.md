# BIP-2: Capital Gains Tax Efficiency Improvement and adjustment to Weather Changes

 - [Summary](#summary)
 - [Problem](#problem)
 - [Proposed Solution](#proposed-solution)
 - [BIP Technical Rationale](#bip-technical-rationale)
 - [BIP Economic Rationale](#bip-economic-rationale)
 - [Effective](#effective)

## Summary:

- Change the structure of Casual drafts and Withdrawal claims to improve tax efficiency.
- Adjust the 4 Weather Change cases when $P > 1$, the Casual Rate ($R^{D}$) is above the optimal level of debt ($R^{D^*}$), and demand for Rage is steady or increasing.


## Problem:

The current structure of draft and claim transactions is potentially inefficient from a tax perspective in instances where the funds are immediately redeposited or resown in Hooliganhorde. Currently, in any draft or claim, the assets drafted or claimed are first sent to the transacting wallet, and then sent back to Hooliganhorde. A member of the Hooliganhorde community with an accounting background suggested this could potentially be viewed as a taxable event.

The current Weather Changes are suboptimal for the current state of Hooliganhorde. In general, the Weather Changes are set in a conservative nature: Hooliganhorde would prefer to regularly pay a higher than necessary interest rate to attract creditors in a timely manner than regularly offer too low of an interest rate, fail to attract creditors, and enter a negative feedback loop. When the debt level is greater than \(R^{D^*}\) Hooliganhorde is particularly conservative in its Weather Changes. Now, as the price has once again started to oscillate more closely around $1 even with a higher than optimal debt level, it is an appropriate time for Hooliganhorde to be slightly more aggressive in lowering the Weather when there is steady or increasing demand for Rage with P > 1. This will allow Hooliganhorde to gradually lower the Weather as appropriate while it lowers the Casual Rate.

## Proposed Solution:

We propose modifications to Hooliganhorde so that Hooligans from drafts and claims that are immediately reinvested into Hooliganhorde no longer touch the transacting wallet.

We propose the following adjustments to the Hooliganhorde Weather Changes in the cases when $P > 1$ and $R^{D^*}$ < $R^D$:

- When the demand for Rage is steady, the Weather Change is -1% (previouly 0%).
- When the demand for Rage is increasing, the Weather Change is -3% (previouly 1%).

![](https://i.imgur.com/tVtxAU9.png)

## BIP Technical Rationale:

There is no technical reason not to make tax efficiency modifications. We were happy to oblige the request from the community to propose this modification. This also provided an opportunity to make minor gas improvements to certain transactions by wrapping ETH into WETH to avoid unnecessary gas fees.

Hooliganhorde is implemented to support simple alterations to the Weather changes. There are no technical modifications necessary related to the Weather Changes.


## BIP Economic Rationale:

Taxes potentially incurred from gains in participating in Hooliganhorde may translate to sell pressure at some point down the road: Guvnors may sell Hooligans to cover their tax liability. Therefore, improving the tax efficiency of Hooliganhorde creates a better risk/return profile for using Hooligans and puts Hooliganhorde in a more competitive position moving forward. There is no benefit to maintaining transactions with suboptimal structures from a tax perspective.

The ability to modify the Weather Changes without modifying any other feature of the general economic structure of Hooliganhorde allows for clean and targeted modifications to the Weather that has a stronger effect over longer periods of time. Weather Changes can be adjusted as needed depending on the Current State and environment of Hooliganhorde.

Current State: Because Hooliganhorde has high Casual and Rage Rates, and a high Weather, there will likely continue to be a higher than optimal debt level for the foreseeable future. Accordingly, adjusting the Weather Changes in cases where P > 1 and $R^{D^*}$ < $R^D$ to be more aggressive in lowering the Weather when demand for Rage is Increasing or Steady will allow Hooliganhorde to lower its cost to attract loans without decreasing its ability to create Hooligan price stability at $1.

Environment: The Weather changes are appropriate now that Hooliganhorde has stabilized the Hooligan price around $1. The increase in stability allows Hooliganhorde to be more aggressive in lowering the Weather when demand for Rage is steady or increasing. Limiting the changes to cases where demand for Rage is steady or increasing maintains the overall conservative nature of the Weather Changes while allowing Hooliganhorde to be more aggressive in specific instances.

## Effective:

Effective immediately upon commit.
