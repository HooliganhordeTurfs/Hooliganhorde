import React from 'react';

import { Box, Stack, Typography } from '@mui/material';

import { useSelector } from 'react-redux';
import { FontWeight } from '~/components/App/muiTheme';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { BLOCKS_PER_MORNING } from '~/state/hooliganhorde/codex/morning';
import { AppState } from '~/state';
import { Codex } from '~/state/hooliganhorde/codex';
import Row from '~/components/Common/Row';

const FieldConditionsHeader: React.FC<{
  toggled: boolean;
  toggleMorning: () => void;
}> = ({ toggled, toggleMorning }) => {
  const morning = useSelector<AppState, Codex['morning']>(
    (state) => state._hooliganhorde.codex.morning
  );
  const gameday = useGameday();
  const interval = morning.index.plus(1).toString();

  if (morning.isMorning) {
    return (
      <Stack gap={0.2}>
        <Typography variant="h4" fontWeight={FontWeight.bold}>
          🌤️ Morning: Block {interval} of {BLOCKS_PER_MORNING}, Gameday
          <Typography
            variant="inherit"
            component="span"
            sx={{ whiteSpace: 'nowrap' }}
          >
            &nbsp;
            {gameday.gt(0) && gameday.toString()}
          </Typography>
        </Typography>
        <Typography color="text.secondary">
          Intensity increases during the Morning each Gameday.
        </Typography>
      </Stack>
    );
  }

  return (
    <Row gap={0.2} width="100%" justifyContent="space-between">
      <Typography variant="h4" fontWeight={FontWeight.bold}>
        🌤️ Field Conditions, Gameday {gameday.gt(0) && gameday.toString()}
      </Typography>
      <Box onClick={toggleMorning}>
        <Typography
          sx={{
            cursor: 'pointer',
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          {toggled
            ? 'View Normal Field Conditions'
            : 'View Morning Field Conditions'}
        </Typography>
      </Box>
    </Row>
  );
};

export default FieldConditionsHeader;
