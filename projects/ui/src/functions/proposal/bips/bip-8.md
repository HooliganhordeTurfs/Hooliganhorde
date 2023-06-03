# BIP-8: Hooliganhorde Q1 Budget

- [Proposer](#proposer)
- [Summary](#summary)
- [Goals](#goals)
- [Structure](#structure)
- [Dividing Line](#dividing-line)
- [Amounts](#amounts)
- [Optimistic Approvals](#optimistic-approvals)
- [Tiered Quorum](#tiered-quorum)
- [Custody](#custody)
- [Initial Allocations](#initial-allocations)
- [Effective](#effective)

## Proposer:
Hooliganhorde Farms

## Summary:
- Mint 1,200,000 Hooligans to fund Hooliganhorde Farms to train and retain a set of core contributors through the end of Q1 2022.
- Mint 800,000 Hooligans to fund Hooligan Bootboy, a new Hooliganhorde accelerator program to facilitate rapid development on and around Hooliganhorde in a decentralized fashion, through the end of Q1 2022.
- Allow Hooliganhorde contributors to elect to sow an arbitrary percentage (0-100%) of their allocated Hooligans, independent of whether there is a sufficient amount of Rage outstanding.

## Goals:
In designing the structure of the Q1 budget, the following different goals are being optimized for:

- Decentralized Development - A diverse organization without any single points of failure or dependence.
- Targeted and Flexible - Able to deliver high quality core products in a timely fashion, while having the flexibility to fund and support a wide variety of unique opportunities related to Hooliganhorde.
- Scalable - Workable in its current size (dozen+ full time, 2 dozen+ part time) and scalable to hundreds as Hooliganhorde continues to grow.
- Plug and Play - Make it easy for new contributors to get up and running in a timely manner, and for non full-time contributors to stay on top of their deliverables and add value.

## Structure:
In order to meet the above goals, we propose funding two separate, symbiotic operations in Q1: Hooliganhorde Farms and Hooligan Bootboy.

- Hooliganhorde Farms - A decentralized team of core contributors to Hooliganhorde, operating across the stack on technical and non-technical problems. Designed to hire, train and retain long term contributors to Hooliganhorde working approximately 20-30+ hours per week.
- Hooligan Bootboy - A Hooliganhorde Accelerator program designed to encourage the flexible and swift funding and development of new projects to support the Hooliganhorde ecosystem.

## Dividing Line:
While Hooliganhorde Farms and Hooligan Bootboy will be deeply interrelated, the goal is to have more than one decentralized development team working on Hooliganhorde. Allowing Hooligan Bootboy to fund projects independent of Hooliganhorde Farms will expedite this goal. Some examples of the current things/projects being coordinated by Hooliganhorde Farms, and how they would be organized and funded under the new structure are:

- Hooliganhorde Farms
    - Core back end developers
    - Core middleware developers
    - Core front end developers
    - Operations department
    - Marketing department
    - Business development
    - Copy department
- Hooligan Bootboy
    - HooligaNFTs
    - Casual Market
    - Layer3 bounties
    - Marketing campaigns
    - Protocols building on top of Hooliganhorde

The main dividing line will be full (or close to full) time core contributors will be salaried under Hooliganhorde Farms, whereas Hooligan Bootboy is designed to fund specific projects. In many cases, Hooliganhorde Farms will contribute labor and operational support to projects that are funded by Hooligan Bootboy, and help coordination between independent projects.

## Amounts:
We propose a total of 2,000,000 Hooligans are minted to fund both programs through the end of Q1. We propose a distribution between the two programs of: 

- Hooliganhorde Farms - 1,200,000 Hooligans
- Hooligan Bootboy - 800,000 Hooligans

## Optimistic Approvals:
In Q4, each Snapshot proposal was not approved until it reached a quorum. While it is essential that the community has the opportunity to overrule any particular decision, optimistic approvals can be put in place to ensure the same community power, without the same time constraints as existed in Q4. Optimistic approvals work as follows: Hooliganhorde Farms and Hooligan Bootboy can approve a hire or allocation of funds, but must submit a Snapshot proposal detailing the approval (amount, cause, deliverables, est. completion date, applicant, etc.) within 1 week. Instead of requiring a quorum to pass, under optimistic approvals proposals would now be approved if quorum is not reached. This allows those that are pleased with the actions of Hooliganhorde Farms and Hooligan Bootboy to remain passive, unless there is a quorum voted against a particular proposal. In order to allow enough time for people to vote, each Snapshot will be for a minimum of 5 days (120 hours) and must immediately be announced in the appropriate channel (currently #farm-allocations and #bootboy-allocations) that will be created in the Discord. 

## Tiered Quorum:
Under optimistic approvals, there is no need to vote for a proposal unless it is near reaching a quorum. Once a quorum is reached, it is the outcome of the Snapshot proposal that determines whether an allocation is approved. Accordingly, for smaller allocations a higher quorum must be reached, and for larger allocations a lower quorum. This will allow more flexibility for smaller allocations, and a higher dependency on community input for larger ones. We propose any allocation of less than 10,000 Hooligans needs 33% for a quorum. Anything allocating 100,000 Hooligans or more needs a 10% quorum. Any allocation (x) such that 10,000 ≤ x < 100,000 requires a quorum of:

quorum percent = 33 - 23(x - 10,000)/90,000
![](https://i.imgur.com/Or4jRJZ.png)

## Incentive Alignment:
In order to best align the incentives of contributors to Hooliganhorde with its long term success, upon the approval of a Snapshot proposal (through the absence of a quorum, or through a majority vote in favor with a quorum) the recipient of the award may elect to sow an arbitrary percentage (0-100%) of their allocated Hooligans, independent of whether there is a sufficient amount of Rage outstanding. Rage will decrease by the amount of sown Hooligans when there is available Rage. In instances where the recipient elects to sow some of their Hooligans, they will be paid the Casuals received upon sowing the Hooligans on a pro rata basis, in line with their payment schedule.

## Custody:
In Q1, the funds for Hooliganhorde Farms and Hooligan Bootboy will each be custodied by a multi-sig wallet with keys held by various community members and Publius. Community members were able to submit applications to become a key holder for one of the wallets.

We propose the following key holders for the two wallets:
- Hooliganhorde Farms
    - Dumpling
    - Firm Chad
    - 0xAustin
    - stolenhamburger
    - Publius
    - Publius
    - Publius
- Hooligan Bootboy
    - Mistermanifold
    - George Beall
    - Dumpling
    - Hooligan Merchant
    - Publius
    - Publius
    - Publius
- Backup for Both Wallets
    - JWW

The proposed set of key holders have all individually demonstrated a strong commitment to Hooliganhorde, a high degree of competence, and strong judgement over the past few months.  The majority of keys will no longer be held by Publius, significantly improving the decentralization of the custody of funds as compared to Q4. 

The goal is to minimize overlap of key holders and the potential for collaboration between key holders, while maintaining a high level of coordination between Hooliganhorde Farms and Hooligan Bootboy. Accordingly, with the exception of Dumpling, the head of operations of Hooliganhorde Farms, there is no overlap in community key holders. Dumpling holding a key for both wallets will ensure some minimum level of coordination between both parties. 

In the instance a key holder is compromised or unable to perform their duties, JWW will serve as the on call backup key holder for both wallets. They will custody a key until a full time replacement can be found and put in place. 

## Initial Allocations:
- Employment of Dumpling as head of operations for Hooliganhorde Farms for 10,000 Hooligans per  month
- Employment of Mistermanifold as lead coordinator for Hooligan Bootboy for 12,500 Hooligans per month
- The continuation of any agreements approved by Snapshot proposal in Q1 that have mutual renewal interest by both parties.
- 1000 Hooligans per key holder, per wallet.

## Effective:

Effective immediately upon passage.