import React, { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useAccount as useWagmiAccount } from 'wagmi';
import { Typography } from '@mui/material';
import { GridColumns } from '@mui/x-data-grid';
import { Token } from '~/classes';
import { GuvnorFirmBalance, WithdrawalCrate } from '~/state/guvnor/firm';
import { displayFullBN, displayUSD } from '~/util';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { ZERO_BN } from '~/constants';
import useFirmTokenToFiat from '~/hooks/hooliganhorde/useFirmTokenToFiat';
import TableCard from '../../Common/TableCard';

import { FC } from '~/types';

type RowData = WithdrawalCrate & { id: BigNumber };

const Withdrawals: FC<{
  token: Token;
  firmBalance: GuvnorFirmBalance | undefined;
}> = ({ token, firmBalance }) => {
  const getUSD = useFirmTokenToFiat();
  const currentGameday = useGameday();
  const account = useWagmiAccount();

  const rows: RowData[] = useMemo(() => {
    const data: RowData[] = [];
    if (firmBalance) {
      if (firmBalance.claimable.amount.gt(0)) {
        data.push({
          id: currentGameday,
          amount: firmBalance.claimable.amount,
          gameday: currentGameday,
        });
      }
      if (firmBalance.withdrawn?.crates?.length > 0) {
        data.push(
          ...firmBalance.withdrawn.crates.map((crate) => ({
            id: crate.gameday,
            ...crate,
          }))
        );
      }
    }
    return data;
  }, [firmBalance, currentGameday]);

  const columns = useMemo(
    () =>
      [
        {
          field: 'gameday',
          flex: 2,
          headerName: 'Gamedays to Arrival',
          align: 'left',
          headerAlign: 'left',
          valueParser: (value: BigNumber) => value.toNumber(),
          renderCell: (params) => {
            const gamedaysToArrival = params.value.minus(currentGameday);
            return gamedaysToArrival.lte(0) ? (
              <Typography color="primary">Claimable</Typography>
            ) : (
              <Typography>{gamedaysToArrival.toFixed()}</Typography>
            );
          },
          sortable: false,
        },
        {
          field: 'amount',
          flex: 2,
          headerName: 'Withdrawn Amount',
          align: 'right',
          headerAlign: 'right',
          renderCell: (params) => (
            <Typography>
              {displayFullBN(
                params.value,
                token.displayDecimals,
                token.displayDecimals
              )}
              <Typography
                display={{ xs: 'none', md: 'inline' }}
                color="text.secondary"
              >
                {' '}
                (~{displayUSD(getUSD(token, params.row.amount))})
              </Typography>
            </Typography>
          ),
          sortable: false,
        },
      ] as GridColumns,
    [token, getUSD, currentGameday]
  );

  const amount = firmBalance?.withdrawn.amount;
  const state = !account
    ? 'disconnected'
    : !currentGameday
    ? 'loading'
    : 'ready';

  return (
    <TableCard
      title={`${token.name} Withdrawals`}
      rows={rows}
      columns={columns}
      amount={amount}
      value={getUSD(token, amount || ZERO_BN)}
      state={state}
      sort={{ field: 'gameday', sort: 'asc' }}
      token={token}
    />
  );
};

export default Withdrawals;
