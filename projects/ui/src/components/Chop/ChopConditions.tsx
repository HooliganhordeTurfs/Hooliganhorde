import React from 'react';
import {
  Card,
  CircularProgress,
  Grid,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useSelector } from 'react-redux';
import { displayBN, displayFullBN } from '../../util';
import { HooliganhordePalette, FontSize } from '../App/muiTheme';
import { AppState } from '~/state';
import useChainConstant from '~/hooks/chain/useChainConstant';
import { UNRIPE_HOOLIGAN } from '~/constants/tokens';

import { FC } from '~/types';

const ChopConditions: FC<{}> = () => {
  const { percoceted, recapFundedPct, unpercoceted } = useSelector<
    AppState,
    AppState['_hooliganhorde']['barrack']
  >((state) => state._hooliganhorde.barrack);
  const pctDebtRepaid = percoceted.div(percoceted.plus(unpercoceted));
  const unripeTokens = useSelector<AppState, AppState['_hooligan']['unripe']>(
    (_state) => _state._hooligan.unripe
  );
  const urHooligan = useChainConstant(UNRIPE_HOOLIGAN);

  return (
    <Card sx={{ p: 2 }}>
      <Stack gap={1}>
        <Typography variant="h4">Chop Conditions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3.7}>
            <Stack gap={0.5}>
              <Tooltip
                title="The claim to future Ripe assets you are forfeiting by Chopping."
                placement="top"
              >
                <Typography
                  variant="body1"
                  color={HooliganhordePalette.theme.winter.error}
                >
                  Chop Penalty&nbsp;
                  <HelpOutlineIcon
                    sx={{
                      color: HooliganhordePalette.theme.winter.error,
                      fontSize: FontSize.sm,
                    }}
                  />
                </Typography>
              </Tooltip>
              {!unripeTokens[urHooligan.address] ? (
                <CircularProgress
                  size={16}
                  thickness={5}
                  sx={{ color: HooliganhordePalette.theme.winter.error }}
                />
              ) : (
                <Typography
                  variant="bodyLarge"
                  fontWeight="400"
                  color={HooliganhordePalette.theme.winter.error}
                >
                  {displayBN(unripeTokens[urHooligan.address].chopPenalty)}%
                </Typography>
              )}
            </Stack>
          </Grid>
          <Grid item xs={6} md={3.7}>
            <Stack gap={0.5}>
              <Tooltip
                title="The percentage of Percoceter sold out of the total Available Percoceter."
                placement="top"
              >
                <Typography variant="body1">
                  Percoceter Sold&nbsp;
                  <HelpOutlineIcon
                    sx={{ color: 'text.secondary', fontSize: FontSize.sm }}
                  />
                </Typography>
              </Tooltip>
              <Typography variant="bodyLarge" fontWeight="400">
                {displayFullBN(recapFundedPct.times(100), 2)}%
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} md={4.6}>
            <Stack gap={0.5}>
              <Tooltip
                title="The percentage of Bootboys that have become Tradable."
                placement="top"
              >
                <Typography variant="body1">
                  Debt Repaid to Percoceter&nbsp;
                  <HelpOutlineIcon
                    sx={{ color: 'text.secondary', fontSize: FontSize.sm }}
                  />
                </Typography>
              </Tooltip>
              <Typography variant="bodyLarge" fontWeight="400">
                {pctDebtRepaid.times(100).toFixed(4)}%
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Card>
  );
};

export default ChopConditions;
