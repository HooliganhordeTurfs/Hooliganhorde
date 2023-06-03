import React from 'react';
import { Box, Card, CardProps, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState } from '~/state';
import { ZERO_BN } from '../../constants';
import {
  GamedayalLiquidityDocument,
  GamedayalLiquidityQuery,
} from '~/generated/graphql';
import GamedayTurf from '~/components/Common/Charts/GamedayTurf';
import useGameday from '~/hooks/hooliganhorde/useGameday';

import { FC } from '~/types';

/// Setup GamedayTurf
const getValue = (gameday: GamedayalLiquidityQuery['gamedays'][number]) =>
  parseFloat(gameday.liquidityUSD);
const formatValue = (value: number) => (
  <Typography variant="h2" color="text.primary">
    ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
  </Typography>
);
const StatProps = {
  title: 'Liquidity',
  gap: 0.25,
  color: 'primary',
  sx: { ml: 0 },
};
const queryConfig = {
  variables: { gameday_gt: 0 },
  context: { subgraph: 'hooligan' },
};

const LiquidityOverTime: FC<{} & CardProps> = ({ sx }) => {
  const hooliganPools = useSelector<AppState, AppState['_hooligan']['pools']>(
    (state) => state._hooligan.pools
  );
  const liquidity = Object.values(hooliganPools).reduce(
    (prev, curr) => prev.plus(curr.liquidity),
    ZERO_BN
  );
  const gameday = useGameday();
  return (
    <Card sx={{ width: '100%', pt: 2, ...sx }}>
      <Box sx={{ position: 'relative' }}>
        <GamedayTurf
          document={GamedayalLiquidityDocument}
          height={250}
          defaultGameday={gameday?.gt(0) ? gameday.toNumber() : 0}
          defaultValue={liquidity.toNumber()}
          getValue={getValue}
          formatValue={formatValue}
          StatProps={StatProps}
          queryConfig={queryConfig}
          stackedArea
          dateKey="timestamp"
        />
      </Box>
    </Card>
  );
};

export default LiquidityOverTime;
