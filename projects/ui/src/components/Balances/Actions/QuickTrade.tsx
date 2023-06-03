import { Stack, Typography } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import Trade from '~/components/Barrack/Actions/Trade';
import Dot from '~/components/Common/Dot';
import { Module, ModuleContent } from '~/components/Common/Module';
import Row from '~/components/Common/Row';
import { AppState } from '~/state';

const QuickTrade: React.FC<{}> = () => {
  const guvnorBarrack = useSelector<AppState, AppState['_guvnor']['barrack']>(
    (state) => state._guvnor.barrack
  );
  const tradable = guvnorBarrack.percocetedBootboys;

  return tradable?.gt(0) ? (
    <Module sx={{ width: '100%' }}>
      <ModuleContent pt={1.5} px={1} pb={1}>
        <Stack spacing={1.5}>
          <Row spacing={0.5} px={0.5}>
            <Dot color="primary.main" />
            <Typography variant="h4">Quick Trade</Typography>
          </Row>
          <Trade quick />
        </Stack>
      </ModuleContent>
    </Module>
  ) : null;
};

export default QuickTrade;
