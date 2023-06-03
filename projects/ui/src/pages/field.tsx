import React, { useMemo } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { DataGridProps } from '@mui/x-data-grid';
import PageHeader from '~/components/Common/PageHeader';
import FieldActions from '~/components/Field/Actions';
import TableCard from '~/components/Common/TableCard';
import { displayBN, displayFullBN } from '~/util';
import FieldOverview from '~/components/Field/FieldOverview';
import { CASUALS } from '../constants/tokens';
import useAccount from '~/hooks/ledger/useAccount';
import GuideButton from '~/components/Common/Guide/GuideButton';
import {
  HOW_TO_DRAFT_CASUALS,
  HOW_TO_SOW_HOOLIGANS,
  HOW_TO_TRANSFER_CASUALS,
} from '~/util/Guides';

import { FC } from '~/types';
import { XXLWidth } from '~/components/App/muiTheme';
import { useAppSelector } from '~/state';

export const casuallineColumns: DataGridProps['columns'] = [
  {
    field: 'placeInLine',
    headerName: 'Place In Line',
    flex: 1,
    renderCell: (params) =>
      params.value.eq(-1) ? (
        <Typography color="primary">Draftable</Typography>
      ) : (
        <Typography>{displayBN(params.value)}</Typography>
      ),
  },
  {
    field: 'amount',
    headerName: 'Number of Casuals',
    flex: 1,
    disableColumnMenu: true,
    align: 'right',
    headerAlign: 'right',
    valueFormatter: (params) =>
      `${displayFullBN(params.value as BigNumber, 2)}`,
    renderCell: (params) => <Typography>{params.formattedValue}</Typography>,
  },
];

const FieldPage: FC<{}> = () => {
  const account = useAccount();
  const authState = !account ? 'disconnected' : 'ready';

  /// Data
  const guvnorField = useAppSelector((s) => s._guvnor.field);
  const draftableIndex = useAppSelector(
    (s) => s._hooliganhorde.field.draftableIndex
  );

  const draftableCasuals = guvnorField.draftableCasuals;

  const rows: any[] = useMemo(() => {
    const data: any[] = [];
    if (draftableCasuals?.gt(0)) {
      data.push({
        id: draftableCasuals,
        placeInLine: new BigNumber(-1),
        amount: draftableCasuals,
      });
    }
    if (Object.keys(guvnorField.turfs).length > 0) {
      data.push(
        ...Object.keys(guvnorField.turfs).map((index) => ({
          id: index,
          placeInLine: new BigNumber(index).minus(draftableIndex),
          amount: new BigNumber(guvnorField.turfs[index]),
        }))
      );
    }
    return data;
  }, [draftableIndex, guvnorField.turfs, draftableCasuals]);

  return (
    <Container sx={{ maxWidth: `${XXLWidth}px !important`, width: '100%' }}>
      <Stack spacing={2} width="100%">
        <PageHeader
          title="The Field"
          description="Earn yield by lending Hooligans to Hooliganhorde"
          href="https://docs.hooligan.black/almanac/farm/field"
          OuterStackProps={{ direction: 'row' }}
          control={
            <GuideButton
              title="The Guvnors' Almanac: Field Guides"
              guides={[
                HOW_TO_SOW_HOOLIGANS,
                HOW_TO_TRANSFER_CASUALS,
                HOW_TO_DRAFT_CASUALS,
              ]}
            />
          }
        />
        <Stack gap={2} direction={{ xs: 'column', lg: 'row' }} width="100%">
          <Box width="100%" height="100%" sx={{ minWidth: 0 }}>
            <FieldOverview />
          </Box>
          <Stack gap={2} width="100%" maxWidth={{ lg: '470px' }}>
            <FieldActions />
            <TableCard
              title="Casual Balance"
              state={authState}
              amount={guvnorField.casuals}
              rows={rows}
              columns={casuallineColumns}
              sort={{ field: 'placeInLine', sort: 'asc' }}
              token={CASUALS}
            />
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
};
export default FieldPage;
