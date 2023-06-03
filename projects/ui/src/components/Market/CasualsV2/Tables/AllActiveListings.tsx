import React, { useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { DataGridProps } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import useMarketData from '~/hooks/hooliganhorde/useMarketData';
import { MarketColumns } from './columns/market-columns';
import BaseTable from './BaseTable';
import { CasualListing } from '~/state/guvnor/market';

const AllActiveListings: React.FC<{
  data: ReturnType<typeof useMarketData>;
}> = ({ data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const columns: DataGridProps['columns'] = useMemo(() => {
    const c = [
      MarketColumns.Shared.createdAt(1, 'left', 'CREATED AT', 'creationHash'),
      MarketColumns.CasualListing.listingId(1, 'left'),
      MarketColumns.Shared.placeInLine('listing', 1, 'left'),
      MarketColumns.Shared.pricePerCasual(1, 'left'),
      MarketColumns.CasualListing.remainingAmount(0.7, 'left'),
    ];

    // FIXME: MUI must provide a performant way to hide columns depending on screen size
    if (!isMobile) {
      c.push(MarketColumns.Shared.expiry(1, 'right'));
    }

    return c;
  }, [isMobile]);

  return (
    <BaseTable
      columns={columns}
      rows={data.listings || []}
      loading={data.loading}
      getRowId={(row: CasualListing) => `${row.account}-${row.id}`}
      onRowClick={({ row }) => {
        navigate(`/market/buy/${row.id.toString()}`);
      }}
    />
  );
};

export default AllActiveListings;
