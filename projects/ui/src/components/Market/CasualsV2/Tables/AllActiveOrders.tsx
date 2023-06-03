import React from 'react';
import { useNavigate } from 'react-router-dom';
import useMarketData from '~/hooks/hooliganhorde/useMarketData';
import BaseTable from './BaseTable';
import { MarketColumns } from './columns/market-columns';

const columns = [
  MarketColumns.Shared.createdAt(1, 'left', 'CREATED AT', 'creationHash'),
  MarketColumns.CasualOrder.orderId(1, 'left'),
  MarketColumns.Shared.placeInLine('order', 1, 'left'),
  MarketColumns.Shared.pricePerCasual(1, 'left'),
  MarketColumns.CasualOrder.casualAmountRemaining(1, 'right'),
];

const AllActiveOrders: React.FC<{
  data: ReturnType<typeof useMarketData>;
}> = ({ data }) => {
  const navigate = useNavigate();
  return (
    <BaseTable
      columns={columns}
      rows={data.orders || []}
      loading={data.loading}
      getRowId={(row) => `${row.account}-${row.id}`}
      onRowClick={({ row }) => {
        navigate(`/market/sell/${row.id}`);
      }}
    />
  );
};

export default AllActiveOrders;
