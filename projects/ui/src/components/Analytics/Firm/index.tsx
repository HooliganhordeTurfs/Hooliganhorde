import { Alert, Box, Card, Link, Tab, Tabs, Typography } from '@mui/material';
import React from 'react';
import {
  HOOLIGAN,
  HOOLIGAN_CRV3_LP,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
} from '~/constants/tokens';
import { HOOLIGANHORDE_ADDRESSES } from '~/constants';
import { clearApolloCache } from '~/util';
import useTabs from '~/hooks/display/useTabs';
import Horde from '~/components/Analytics/Firm/Horde';
import Prospects from '~/components/Analytics/Firm/Prospects';
import DepositedAsset from '~/components/Analytics/Firm/DepositedAsset';
import WarningIcon from '~/components/Common/Alert/WarningIcon';
import APY from '~/components/Analytics/Firm/APY';
import { FC } from '~/types';

const SLUGS = [
  'deposited_hooligan',
  'deposited_lp',
  'deposited_urhooligan',
  'deposited_urlp',
  'horde',
  'prospects',
  'hooligan_vAPY',
  'lp_vAPY',
];

const FirmAnalytics: FC<{}> = () => {
  const [tab, handleChangeTab] = useTabs(SLUGS, 'firm');
  return (
    <Card>
      <Tabs
        value={tab}
        onChange={handleChangeTab}
        sx={{ px: 2, pt: 2, pb: 1.5 }}
      >
        <Tab label="Deposited HOOLIGAN" />
        <Tab label="Deposited HOOLIGAN3CRV" />
        <Tab label="Deposited urHOOLIGAN" />
        <Tab label="Deposited urHOOLIGAN3CRV" />
        <Tab label="Horde" />
        <Tab label="Prospects" />
        <Tab label="Hooligan vAPY" />
        <Tab label="LP vAPY" />
      </Tabs>
      {tab === 0 && (
        <DepositedAsset
          asset={HOOLIGAN[1]}
          account={HOOLIGANHORDE_ADDRESSES[1]}
          height={300}
        />
      )}
      {tab === 1 && (
        <DepositedAsset
          asset={HOOLIGAN_CRV3_LP[1]}
          account={HOOLIGANHORDE_ADDRESSES[1]}
          height={300}
        />
      )}
      {tab === 2 && (
        <DepositedAsset
          asset={UNRIPE_HOOLIGAN[1]}
          account={HOOLIGANHORDE_ADDRESSES[1]}
          height={300}
        />
      )}
      {tab === 3 && (
        <DepositedAsset
          asset={UNRIPE_HOOLIGAN_CRV3[1]}
          account={HOOLIGANHORDE_ADDRESSES[1]}
          height={300}
        />
      )}
      {tab === 4 && <Horde height={300} />}
      {tab === 5 && <Prospects height={300} />}
      {tab === 6 && <APY height={300} metric="Hooligan" />}
      {tab === 7 && <APY height={300} metric="LP" />}
    </Card>
  );
};
export default FirmAnalytics;
