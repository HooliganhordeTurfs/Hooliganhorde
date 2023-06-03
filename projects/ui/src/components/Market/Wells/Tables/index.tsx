import React from 'react';
import { Tab, Tabs, useMediaQuery } from '@mui/material';
import { DataGridProps } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import BigNumber from 'bignumber.js';
import useTabs from '~/hooks/display/useTabs';
import { CasualListing } from '~/state/guvnor/market';
import COLUMNS from '~/components/Common/Table/cells';
import useMarketData from '~/hooks/hooliganhorde/useMarketData';
import TabTable from '~/components/Common/Table/TabTable';
import { Module, ModuleContent } from '~/components/Common/Module';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import { FC } from '~/types';

// TODO: dummy type
export type WellActivityData = {
  hash: string;
  label: string;
  totalValue: BigNumber;
  tokenAmount0: BigNumber;
  tokenAmount1: BigNumber;
  account: string;
  time: string;
};

const SLUGS = ['all', 'swaps', 'adds', 'removes'];

const WellActivity: FC<{}> = () => {
  const theme = useTheme();
  const [tab, handleChangeTab] = useTabs(SLUGS, 'hooligan');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const data = useMarketData();

  /// Data Grid setup
  const columns: DataGridProps['columns'] = !isMobile
    ? [
        // COLUMNS.listingId(1.3),
        // // index
        // COLUMNS.turfIndex(data.draftableIndex, 1),
        // // pricePerCasual
        // COLUMNS.pricePerCasual(1),
        // // amount
        // maxDraftableIndex
        COLUMNS.label(
          2.5,
          <Tabs value={tab} onChange={handleChangeTab}>
            <Tab label="All" />
            <Tab label="Swaps" />
            <Tab label="Adds" />
            <Tab label="Removes" />
          </Tabs>
        ),
        COLUMNS.totalValue(1),
        COLUMNS.tokenAmount('tokenAmount0', HOOLIGAN[1], 1),
        COLUMNS.tokenAmount('tokenAmount1', CASUALS, 1),
        COLUMNS.account(1),
        COLUMNS.time(1),
      ]
    : [];

  const N = 30;
  const mockWellActivityData = new Array(N).fill(null).map((_, i) => ({
    label: 'Swap ETH for HOOLIGAN',
    totalValue: new BigNumber(3000 * Math.random()),
    tokenAmount0: new BigNumber(Math.random()),
    tokenAmount1: new BigNumber(3000 * Math.random()),
    account: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    time: '5 minutes ago',
  }));

  return (
    <Module sx={{ py: 2, px: 1 }}>
      {/* <ModuleTabs value={tab} onChange={handleChangeTab}> */}
      {/*  <Tab label="All" /> */}
      {/*  <Tab label="Swaps" /> */}
      {/*  <Tab label="Adds" /> */}
      {/*  <Tab label="Removes" /> */}
      {/* </ModuleTabs> */}
      <ModuleContent>
        <TabTable
          columns={columns}
          rows={mockWellActivityData}
          loading={data.loading}
          maxRows={8}
          getRowId={(row: CasualListing) => `${row.account}-${row.id}`}
        />
      </ModuleContent>
    </Module>
  );
};

export default WellActivity;
