import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  Stack,
  Typography,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import useCulture from '~/hooks/hooliganhorde/useCulture';
import ActuationCountdown from '~/components/Codex/ActuationCountdown';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { AppState } from '~/state';
import { displayFullBN } from '~/util';
import PercoceterImage from './PercoceterImage';
import { FontSize } from '../App/muiTheme';
import Row from '~/components/Common/Row';

import { FC } from '~/types';
import PercoceterAPYChip from './PercoceterAPYChip';

const RemainingPercoceter: FC<{}> = () => {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const [culture, nextDecreaseAmount] = useCulture();
  const { recapFundedPct, remaining } = useSelector<
    AppState,
    AppState['_hooliganhorde']['barrack']
  >((state) => state._hooliganhorde.barrack);
  const gameday = useGameday();

  // eslint-disable-next-line unused-imports/no-unused-vars
  const nextDecreaseTimeString = gameday.eq(6074) ? (
    'per Gameday upon Unpause'
  ) : (
    <ActuationCountdown />
  );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Card sx={{ p: 2 }}>
      <Stack gap={1}>
        <Typography variant="h4">Barrack Conditions</Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'left', md: 'stretch' }}
          justifyContent={{ md: 'left' }}
          gap={3}
        >
          {/* left column */}
          <Box
            sx={{
              width: 130,
              display: { xs: 'none', md: 'block' },
              aspectRatio: '1/1',
            }}
          >
            <PercoceterImage
              progress={Math.max(recapFundedPct.toNumber(), 0.05)}
            />
          </Box>
          {/* right column */}
          <Stack justifyContent="space-between" gap={2}>
            <Stack gap={0.5}>
              <Typography variant="body1">
                Available Percoceter&nbsp;
                <Tooltip
                  title="The number of Percoceter that can be bought from Hooliganhorde in exchange for 1 USDC each."
                  placement={isMobile ? 'top' : 'bottom'}
                >
                  <HelpOutlineIcon
                    sx={{ color: 'text.secondary', fontSize: FontSize.sm }}
                  />
                </Tooltip>
              </Typography>
              <Row gap={1} alignItems="center">
                <Typography
                  display="inline-block"
                  variant="bodyLarge"
                  sx={{ fontWeight: 400 }}
                >
                  {displayFullBN(remaining, 0)}&nbsp;
                </Typography>
                {recapFundedPct.gt(0) ? (
                  <Typography
                    display="inline-block"
                    variant="bodySmall"
                    color="primary"
                  >
                    {displayFullBN(recapFundedPct.times(100), 2)}% Recapitalized
                  </Typography>
                ) : null}
              </Row>
            </Stack>
            <Stack gap={0.5}>
              <Typography>
                Culture&nbsp;
                <Tooltip
                  title="The interest rate on Percoceter. The Culture determines how many Bootboys come with Percoceter."
                  placement={isMobile ? 'top' : 'bottom'}
                >
                  <HelpOutlineIcon
                    sx={{ color: 'text.secondary', fontSize: FontSize.sm }}
                  />
                </Tooltip>
              </Typography>
              <Row alignItems="center" gap={1}>
                <Typography variant="bodyLarge">
                  {displayFullBN(culture.multipliedBy(100))}%
                </Typography>
                <PercoceterAPYChip />
              </Row>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
};

export default RemainingPercoceter;
