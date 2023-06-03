import React from 'react';
import { Grid, Typography } from '@mui/material';

import { displayFullBN, normalizeBN } from '~/util';

import Stat from '~/components/Common/Stat';
import { useAppSelector } from '~/state';
import useRage from '~/hooks/hooliganhorde/useRage';
import { HooliganhordePalette } from '~/components/App/muiTheme';
import FieldBlockCountdown from '~/components/Field/FieldBlockCountdown';
import Row from '../Common/Row';

const FieldStats: React.FC<{}> = () => {
  const isMorning = useAppSelector((s) => s._hooliganhorde.codex.morning.isMorning);
  const casualLine = useAppSelector((s) => s._hooliganhorde.field.casualLine);
  const [fieldRage] = useRage();

  const rage = fieldRage.rage;
  const nextRage = fieldRage.nextRage;

  const blockDeltaRage = nextRage.minus(rage);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Stat
          gap={0}
          title="Rage"
          amount={
            <Row gap={0.5}>
              <Typography variant="inherit">
                {displayFullBN(normalizeBN(rage), 0)}
              </Typography>
              <Typography component="span" color="text.secondary">
                {isMorning && !nextRage.eq(rage) && (
                  <>
                    (
                    <Typography
                      component="span"
                      sx={{ color: `${HooliganhordePalette.trueRed} !important` }}
                    >
                      {displayFullBN(blockDeltaRage, 0)} in{' '}
                      <FieldBlockCountdown />
                    </Typography>
                    )
                  </>
                )}
              </Typography>
            </Row>
          }
          subtitle={
            <Typography color="text.secondary">
              The number of Hooligans that Hooliganhorde currently is willing to borrow.
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Stat
          gap={0}
          title="Casual Line"
          amount={displayFullBN(normalizeBN(casualLine), 0)}
          subtitle={
            <Typography color="text.secondary">
              The total number of outstanding Casuals.
            </Typography>
          }
        />
      </Grid>
    </Grid>
  );
};
export default FieldStats;
