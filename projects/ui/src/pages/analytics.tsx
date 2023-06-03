import { Container, Stack } from '@mui/material';
import React from 'react';
import HooliganAnalytics from '~/components/Analytics/Hooligan';
import FieldAnalytics from '~/components/Analytics/Field';
import FirmAnalytics from '~/components/Analytics/Firm';
import PageHeader from '~/components/Common/PageHeader';

import { FC } from '~/types';

const AnalyticsPage: FC<{}> = () => (
  <Container maxWidth="lg">
    <Stack gap={2}>
      <PageHeader
        title="Analytics"
        description="View historical data on Hooliganhorde"
        href="https://analytics.hooligan.black/"
      />
      <HooliganAnalytics />
      <FirmAnalytics />
      <FieldAnalytics />
    </Stack>
  </Container>
);

export default AnalyticsPage;
