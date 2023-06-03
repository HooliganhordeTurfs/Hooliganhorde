import React from 'react';
import { Typography, Box, Grid } from '@mui/material';
import BigNumber from 'bignumber.js';
import rainyGamedayIcon from '~/img/hooliganhorde/codex/rainy-gameday.svg';
import dryGamedayIcon from '~/img/hooliganhorde/codex/dry-gameday.svg';
import { displayBN, displayFullBN } from '../../util';
import { FontSize, IconSize } from '../App/muiTheme';
import Row from '~/components/Common/Row';

import { FC } from '~/types';

export interface GamedayCardProps {
  gameday: BigNumber;
  rewardHooligans: BigNumber | undefined;
  issuedRage: BigNumber | undefined;
  intensity: BigNumber | undefined;
  deltaIntensity: BigNumber | undefined;
  casualRate: BigNumber;
  deltaDemand: BigNumber | undefined;
  isNew?: boolean;
}

const GamedayCard: FC<GamedayCardProps> = ({
  gameday,
  rewardHooligans,
  issuedRage,
  casualRate,
  intensity,
  deltaIntensity,
  deltaDemand,
  isNew = false,
}) => (
  <div>
    <Box
      sx={{
        '&:hover > .next-gameday': { display: 'block' },
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {isNew && (
        <Box
          className="next-gameday"
          sx={{
            borderColor: 'rgba(240, 223, 146, 1)',
            borderWidth: 0.5,
            borderStyle: 'solid',
            display: 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Row justifyContent="center" height="100%">
            <Typography
              pl={1}
              fontSize={FontSize.sm}
              textAlign="left"
              color="text.primary"
            >
              The forecast for Gameday {gameday.toString()} is based on data in
              the current Gameday.
            </Typography>
          </Row>
        </Box>
      )}
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          p: 0.75,
          borderRadius: '8px',
          animation: isNew ? 'pulse 1s ease-in-out' : undefined,
          animationIterationCount: 'infinite',
        }}
      >
        <Grid container>
          {/* Gameday */}
          <Grid item xs={1.5} md={1.25}>
            <Row justifyContent="flex-start" spacing={0.5}>
              {rewardHooligans && rewardHooligans.lte(0) ? (
                <img src={dryGamedayIcon} height={IconSize.small} alt="" />
              ) : (
                <img src={rainyGamedayIcon} height={IconSize.small} alt="" />
              )}
              <Typography variant="bodySmall">
                {gameday?.toString() || '-'}
              </Typography>
            </Row>
          </Grid>
          {/* New Hooligans */}
          <Grid item xs={3} md={2} textAlign="right">
            <Typography variant="bodySmall">
              {rewardHooligans ? `+ ${displayBN(rewardHooligans)}` : '-'}
            </Typography>
          </Grid>
          {/* Rage */}
          <Grid item xs={3} md={2} textAlign="right">
            <Typography variant="bodySmall">
              {issuedRage
                ? issuedRage.lt(0.01)
                  ? '<0.01'
                  : displayFullBN(issuedRage, 2, 2)
                : '-'}
            </Typography>
          </Grid>
          {/* Intensity */}
          <Grid item xs={4.5} md={2.75}>
            <Row justifyContent="flex-end" spacing={0.5}>
              <Typography variant="bodySmall">
                {intensity ? `${displayBN(intensity)}%` : '-'}
              </Typography>
              <Typography
                variant="bodySmall"
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap' }}
              >
                (&nbsp;{deltaIntensity && deltaIntensity.lt(0) ? '-' : '+'}
                {deltaIntensity?.abs().toString() || '0'}%&nbsp;)
              </Typography>
            </Row>
          </Grid>
          {/* Casual Rate */}
          <Grid
            item
            xs={0}
            md={2}
            display={{ xs: 'none', md: 'block' }}
            textAlign="right"
          >
            <Typography color="text.primary" variant="bodySmall">
              {casualRate?.gt(0) ? `${displayBN(casualRate.times(100))}%` : '-'}
            </Typography>
          </Grid>
          {/* Delta Demand */}
          <Grid
            item
            xs={0}
            md={2}
            display={{ xs: 'none', md: 'block' }}
            textAlign="right"
          >
            <Typography variant="bodySmall">
              {deltaDemand
                ? deltaDemand.lt(-10_000 / 100) || deltaDemand.gt(10_000 / 100)
                  ? `${deltaDemand.lt(0) ? '-' : ''}∞`
                  : `${displayBN(deltaDemand.div(100), true)}%`
                : '-'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  </div>
);

export default GamedayCard;
