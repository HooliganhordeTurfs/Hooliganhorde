import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import BigNumber from 'bignumber.js';
import Deposits from './Deposits';
import {
  DepositCrate,
  GuvnorFirmBalance,
  WithdrawalCrate,
} from '../../../state/guvnor/firm';
import { HOOLIGAN_ETH_UNIV2_LP } from '../../../constants/tokens';
import { SupportedChainId } from '../../../constants/chains';

export default {
  component: Deposits,
  args: {},
} as ComponentMeta<typeof Deposits>;

const deposit: DepositCrate = {
  gameday: new BigNumber(100),
  amount: new BigNumber(100),
  bdv: new BigNumber(100),
  horde: new BigNumber(100),
  prospects: new BigNumber(100),
};

const deposit2: DepositCrate = {
  gameday: new BigNumber(345),
  amount: new BigNumber(345),
  bdv: new BigNumber(345),
  horde: new BigNumber(345),
  prospects: new BigNumber(345),
};

const withdrawal: WithdrawalCrate = {
  gameday: new BigNumber(698),
  amount: new BigNumber(760),
};

const withdrawal2: WithdrawalCrate = {
  gameday: new BigNumber(345),
  amount: new BigNumber(753460),
};

const firmBalance: GuvnorFirmBalance = {
  circulating: new BigNumber(100), // The circulating balance in the Guvnor's wallet.
  wrapped: new BigNumber(100), // The Guvnor's wrapped balance.
  deposited: {
    amount: new BigNumber(100),
    bdv: new BigNumber(100),
    crates: [
      {
        amount: new BigNumber(100),
        bdv: new BigNumber(100),
        gameday: new BigNumber(6074),
        horde: new BigNumber(100),
        prospects: new BigNumber(200),
      },
    ],
  },
  withdrawn: {
    amount: new BigNumber(100),
    bdv: new BigNumber(100),
    crates: [
      {
        amount: new BigNumber(100),
        gameday: new BigNumber(6074),
      },
    ],
  },
  claimable: {
    amount: new BigNumber(100),
    crates: [
      {
        amount: new BigNumber(100),
        gameday: new BigNumber(6074),
      },
    ],
  },
  lastUpdate: new BigNumber(new Date().getTime()),
};

const Template: ComponentStory<typeof Deposits> = (args: any) => (
  <Deposits
    token={HOOLIGAN_ETH_UNIV2_LP[SupportedChainId.MAINNET]}
    firmBalance={firmBalance}
  />
);

export const Main = Template.bind({});
