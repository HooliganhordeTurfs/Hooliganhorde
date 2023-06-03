import React from 'react';

import { Card, Tabs, Tab } from '@mui/material';
import useTabs from '~/hooks/display/useTabs';
import DraftedCasuals from './DraftedCasuals';
import CasualRate from './CasualRate';
import Casuals from './Casuals';
import Intensity from './Intensity';
import Sown from './Sown';
import TotalSowers from './TotalSowers';
import RRoR from './RRoR';
import { FC } from '~/types';

const SLUGS = [
  'rror',
  'intensity',
  'casuals',
  'casualrate',
  'sown',
  'drafted',
  'sowers',
];

const FieldAnalytics: FC<{}> = () => {
  const [tab, handleChangeTab] = useTabs(SLUGS, 'field');
  return (
    <Card>
      <Tabs
        value={tab}
        onChange={handleChangeTab}
        sx={{ px: 2, pt: 2, pb: 1.5 }}
      >
        <Tab label="RRoR" />
        <Tab label="Max Intensity" />
        <Tab label="Casuals" />
        <Tab label="Casual Rate" />
        <Tab label="Sown" />
        <Tab label="Drafted" />
        <Tab label="Total Sowers" />
      </Tabs>
      {tab === 0 && <RRoR height={300} />}
      {tab === 1 && <Intensity height={300} />}
      {tab === 2 && <Casuals height={300} />}
      {tab === 3 && <CasualRate height={300} />}
      {tab === 4 && <Sown height={300} />}
      {tab === 5 && <DraftedCasuals height={300} />}
      {tab === 6 && <TotalSowers height={300} />}
    </Card>
  );
};

export default FieldAnalytics;
