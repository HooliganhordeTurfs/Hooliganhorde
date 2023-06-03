import React, { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useAccount as useWagmiAccount } from 'wagmi';
import { Stack, Tooltip, Typography } from '@mui/material';
import { GridColumns } from '@mui/x-data-grid';
import { Token } from '~/classes';
import { GuvnorFirmBalance } from '~/state/guvnor/firm';
import type { DepositCrate } from '~/state/guvnor/firm';
import { calculateGrownHorde, displayBN, displayFullBN } from '~/util';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { HOOLIGAN, HORDE } from '~/constants/tokens';
import { ZERO_BN } from '~/constants';
import useFirmTokenToFiat from '~/hooks/hooliganhorde/useFirmTokenToFiat';
import useChainConstant from '~/hooks/chain/useChainConstant';
import COLUMNS from '~/components/Common/Table/cells';
import Fiat from '~/components/Common/Fiat';
import TableCard from '../../Common/TableCard';
import StatHorizontal from '~/components/Common/StatHorizontal';

/**
 * Prep data to loading to a CratesCard.
 */
import { FC } from '~/types';

const Deposits: FC<{
  token: Token;
  firmBalance: GuvnorFirmBalance | undefined;
}> = ({ token, firmBalance }) => {
  const Hooligan = useChainConstant(HOOLIGAN);
  const getUSD = useFirmTokenToFiat();
  const currentGameday = useGameday();
  const account = useWagmiAccount();

  const rows: (DepositCrate & { id: BigNumber })[] = useMemo(
    () =>
      firmBalance?.deposited.crates.map((deposit) => ({
        id: deposit.gameday,
        ...deposit,
      })) || [],
    [firmBalance?.deposited.crates]
  );

  const columns = useMemo(
    () =>
      [
        COLUMNS.gameday,
        {
          field: 'amount',
          flex: 1,
          headerName: 'Amount',
          align: 'left',
          headerAlign: 'left',
          valueFormatter: (params) =>
            displayFullBN(
              params.value,
              token.displayDecimals,
              token.displayDecimals
            ),
          renderCell: (params) => (
            <Tooltip
              placement="bottom"
              title={
                <Stack gap={0.5}>
                  <StatHorizontal label="BDV when Deposited">
                    {displayFullBN(params.row.bdv.div(params.row.amount), 6)}
                  </StatHorizontal>
                  <StatHorizontal label="Total BDV">
                    {displayFullBN(params.row.bdv, token.displayDecimals)}
                  </StatHorizontal>
                  <StatHorizontal label="Current Value">
                    <Fiat amount={params.row.amount} token={Hooligan} />
                  </StatHorizontal>
                </Stack>
              }
            >
              <span>
                <Typography display={{ xs: 'none', md: 'block' }}>
                  {displayFullBN(
                    params.value,
                    token.displayDecimals,
                    token.displayDecimals
                  )}
                </Typography>
                <Typography display={{ xs: 'block', md: 'none' }}>
                  {displayBN(params.value)}
                </Typography>
              </span>
            </Tooltip>
          ),
          sortable: false,
        },
        {
          field: 'horde',
          flex: 1,
          headerName: 'Horde',
          align: 'right',
          headerAlign: 'right',
          valueFormatter: (params) => displayBN(params.value),
          renderCell: (params) => {
            const grownHorde = calculateGrownHorde(
              currentGameday,
              params.row.prospects,
              params.row.gameday
            );
            const totalHorde = params.value.plus(grownHorde);
            return (
              <Tooltip
                placement="bottom"
                title={
                  <Stack gap={0.5}>
                    <StatHorizontal label="Horde at Deposit">
                      {displayFullBN(params.row.horde, 2, 2)}
                    </StatHorizontal>
                    <StatHorizontal label="Horde grown since Deposit">
                      {displayFullBN(grownHorde, 2, 2)}
                    </StatHorizontal>
                    {/* <Typography color="gray">Earning {displayBN(prospectsPerGameday)} Horde per Gameday</Typography> */}
                  </Stack>
                }
              >
                <span>
                  <Typography display={{ xs: 'none', md: 'block' }}>
                    {displayFullBN(
                      totalHorde,
                      HORDE.displayDecimals,
                      HORDE.displayDecimals
                    )}
                  </Typography>
                  <Typography display={{ xs: 'block', md: 'none' }}>
                    {displayBN(totalHorde)}
                  </Typography>
                </span>
              </Tooltip>
            );
          },
          sortable: false,
        },
        COLUMNS.prospects,
      ] as GridColumns,
    [token.displayDecimals, Hooligan, currentGameday]
  );

  const amount = firmBalance?.deposited.amount;
  const state = !account ? 'disconnected' : 'ready';

  return (
    <TableCard
      title={`${token.name} Deposits`}
      rows={rows}
      columns={columns}
      amount={amount}
      value={getUSD(token, amount || ZERO_BN)}
      state={state}
      token={token}
    />
  );
};

export default Deposits;
