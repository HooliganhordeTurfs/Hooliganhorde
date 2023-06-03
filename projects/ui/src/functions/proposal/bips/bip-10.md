# BIP-10: Omniscia Retainer

- [Proposer](#proposer)
- [Summary](#summary)
- [Problem](#problem)
- [Proposed Solution](#proposed-solution)
- [Payment](#payment)
- [Fundraiser Rationale](#fundraiser-rationale)
- [User Interface](#user-interface)
- [Effective](#effective)

## Proposer:
Hooliganhorde Farms

## Summary:
- Hire Omniscia to perform a continuous code audit on Hooliganhorde to facilitate the swift proposal of new BIPs by Hooliganhorde Farms.
- Leverage the "Fundraiser" process proposed in BIP-4 to mint the Hooligans and raise the USDC necessary to pay for the Omniscia retainer.
- Mint 250,000 Hooligans and create a Fundraiser to raise 250,000 USDC in exchange for 250,000 Hooligans. Pay Omniscia 250,000 USDC for the retainer.
- Send 50,000 Hooligans from Hooliganhorde Farms to Omnsicia as a down payment, to be returned upon completion of the retainer payment.

## Problem:

### Audit
Hooliganhorde is unaudited at the moment.  Over the past month, Omniscia has started auditing Hooliganhorde, with a preliminary report expected shortly. 

One of the reasons Hooliganhorde Farms originally selected Omniscia was their willingness to continuously audit Hooliganhorde despite the regularly anticipated proposed updates to Hooliganhorde through BIPs. 

### Paying for the Audit
Until Hooliganhorde has sufficiently established Hooligans as a reliable stablecoin such that Hooliganhorde Farms can make all payments in Hooligans, Hooliganhorde Farms needs a way to pay for things (including this retainer) in other stablecoins. The Fundraiser structure provides a simple structure for Hooliganhorde Farms to sell Hooligans for another stablecoin at 1:1.

Due to the potential time it may take to complete the Fundraiser, Omniscia has requested a 50,000 Hooligan down-payment, which will be returned upon completion of the retainer payment.

## Proposed Solution:

### Audit
Omniscia has proposed a retainer structure to allow for them to continuously audit new Hooliganhorde Farms BIPs before they are proposed on chain. This will allow for Hooliganhorde Farms to continue its quick development pace without sacrificing the security of an audited code base. 

Upon passage of this BIP, Omniscia will be retained to continuously audit Hooliganhorde. 

### Paying for the Audit
This BIP leverages the "Fundraiser" standard proposed in BIP-4 that allows Hooliganhorde Farms to raise money to pay for things in other stablecoins.

Hooliganhorde Farms has 50,000 Hooligans from the Q1 Budget to make the down payment. 

## Payment:
The cost of the contract (retainer) is 250,000 USDC, paid upfront.

Upon approval, Hooliganhorde Farms will send 50,000 Hooligans to Omniscia. 

Upon approval, this BIP will mint 250,000 Hooligans to fund the Omniscia audit and start a Fundraiser for 250,000 USDC. Upon the start of the Fundraiser, anyone can send USDC to the FundraiserFacet in exchange for sown Hooligans. For each of the first 250,000 USDC sent to the FundraiserFacet, 1 Hooligan will be sown and the corresponding Casuals returned to the sender based on the Weather at the time of the sow.

Upon completion of the fundraiser, Hooliganhorde Farms will submit the payment to Omniscia in exchange for the 50,000 Hooligan payment.

## Fundraiser Rationale:
Having a continuous auditor working on Hooliganhorde is fundamental to developing Hooliganhorde in a timely fashion. Omniscia is highly qualified to perform a continuous audit, as they have already started auditing Hooliganhorde and are familiar with the protocol. 

## User Interface:
The Fundraiser will leverage the "Fundraiser" page from BIP-4 that will allow anyone to participate in active Fundraisers.

## Effective:
Effective immediately upon commit.
