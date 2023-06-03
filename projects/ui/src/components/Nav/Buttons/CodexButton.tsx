import React, { useMemo } from 'react';
import {
  ButtonProps,
  Stack,
  Typography,
  useMediaQuery,
  Box,
  Grid,
  Divider,
} from '@mui/material';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import dryGamedayIcon from '~/img/hooliganhorde/codex/dry-gameday.svg';
import rainyGamedayIcon from '~/img/hooliganhorde/codex/rainy-gameday.svg';
import ActuationButton from '~/components/Codex/ActuationButton';
import { CodexButtonQuery, useCodexButtonQuery } from '~/generated/graphql';
import usePrice from '~/hooks/hooliganhorde/usePrice';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { toTokenUnitsBN } from '~/util';
import { HOOLIGAN } from '~/constants/tokens';
import { NEW_BN } from '~/constants';
import { AppState } from '~/state';
import FolderMenu from '../FolderMenu';
import GamedayCard from '../../Codex/GamedayCard';
import usePeg from '~/hooks/hooliganhorde/usePeg';

import { FC } from '~/types';

const castField = (data: CodexButtonQuery['fields'][number]) => ({
  gameday: new BigNumber(data.gameday),
  issuedRage: toTokenUnitsBN(data.issuedRage, HOOLIGAN[1].decimals),
  intensity: new BigNumber(data.intensity),
  casualRate: new BigNumber(data.casualRate),
});
const castGameday = (data: CodexButtonQuery['gamedays'][number]) => ({
  gameday: new BigNumber(data.gameday),
  price: new BigNumber(data.price),
  rewardHooligans: toTokenUnitsBN(
    data.gameday <= 6074 ? data.deltaHooligans : data.rewardHooligans,
    HOOLIGAN[1].decimals
  ),
});

const MAX_ITEMS = 8;

const PriceButton: FC<ButtonProps> = ({ ...props }) => {
  /// DATA
  const gameday = useGameday();
  const price = usePrice();
  const awaiting = useSelector<AppState, boolean>(
    (state) => state._hooliganhorde.codex.actuation.awaiting
  );
  const { data } = useCodexButtonQuery({ fetchPolicy: 'cache-and-network' });
  const hooliganhordeField = useSelector<AppState, AppState['_hooliganhorde']['field']>(
    (state) => state._hooliganhorde.field
  );
  const peg = usePeg();

  const byGameday = useMemo(() => {
    if (data?.fields && data?.gamedays) {
      type MergedGameday = ReturnType<typeof castField> &
        ReturnType<typeof castGameday>;

      // Build mapping of gameday => data
      const merged: { [key: number]: MergedGameday } = {};
      data.fields.forEach((_f) => {
        // fixme: need intermediate type?
        // @ts-ignore
        if (_f) merged[_f.gameday] = { ...castField(_f) };
      });
      data.gamedays.forEach((_s) => {
        if (_s) merged[_s.gameday] = { ...merged[_s.gameday], ...castGameday(_s) };
      });

      // Sort latest gameday first and return as array
      return Object.keys(merged)
        .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))
        .reduce<MergedGameday[]>((prev, curr) => {
          prev.push(merged[curr as unknown as number]);
          return prev;
        }, []);
    }
    return [];
  }, [data]);

  /// Theme
  const isTiny = useMediaQuery('(max-width:350px)');

  /// Button Content
  const isLoading = gameday.eq(NEW_BN);
  const startIcon = isTiny ? undefined : (
    <img
      src={price.lte(1) || awaiting ? dryGamedayIcon : rainyGamedayIcon}
      css={{
        width: 25,
        height: 25,
        animationName: awaiting ? 'rotate' : 'none',
        animationTimingFunction: 'linear',
        animationDuration: '3000ms',
        animationIterationCount: 'infinite',
      }}
      alt=""
    />
  );

  /// Table Content
  const tableContent = (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Past Gamedays */}
      <Stack
        gap={1}
        sx={{
          width: '100%',
          pt: 1,
          px: 1,
          maxHeight: `${(37.5 + 10) * MAX_ITEMS - 10}px`,
          overflowY: 'auto',
        }}
      >
        {/* table header */}
        <Box px={1}>
          <Grid container>
            <Grid item xs={1.5} md={1.25}>
              <Typography variant="bodySmall">Gameday</Typography>
            </Grid>
            <Grid item xs={3} md={2} textAlign="right">
              <Typography variant="bodySmall">New Hooligans</Typography>
            </Grid>
            <Grid item xs={3} md={2} textAlign="right">
              <Typography variant="bodySmall">Max Rage</Typography>
            </Grid>
            <Grid item xs={4} md={2.75}>
              <Stack alignItems="flex-end">
                <Typography variant="bodySmall">Max Intensity</Typography>
              </Stack>
            </Grid>
            <Grid
              item
              xs={0}
              md={2}
              display={{ xs: 'none', md: 'block' }}
              textAlign="right"
            >
              <Typography variant="bodySmall">Casual Rate</Typography>
            </Grid>
            <Grid
              item
              xs={0}
              md={2}
              display={{ xs: 'none', md: 'block' }}
              textAlign="right"
            >
              <Typography variant="bodySmall">Delta Demand</Typography>
            </Grid>
          </Grid>
        </Box>
        <GamedayCard
          gameday={gameday.plus(1)}
          rewardHooligans={peg.rewardHooligans}
          issuedRage={peg.rageStart}
          casualRate={NEW_BN}
          intensity={hooliganhordeField.intensity.max.plus(
            peg.deltaIntensity
          )} // FIXME expected
          deltaDemand={peg.deltaCasualDemand}
          deltaIntensity={peg.deltaIntensity}
          isNew
        />
        {byGameday.map((s, i) => {
          const deltaIntensity =
            byGameday[i + 1]?.intensity && s.intensity
              ? s.intensity.minus(byGameday[i + 1].intensity)
              : undefined;
          return (
            <GamedayCard
              key={s.gameday.toString()}
              gameday={s.gameday}
              // Gameday
              rewardHooligans={s.rewardHooligans}
              // Field
              intensity={s.intensity}
              deltaIntensity={deltaIntensity}
              deltaDemand={undefined}
              issuedRage={s.issuedRage}
              casualRate={s.casualRate}
            />
          );
        })}
      </Stack>
      <Divider sx={{ borderBottomWidth: 0, borderColor: 'divider' }} />
      <Box sx={{ p: 1 }}>
        <ActuationButton />
      </Box>
    </Box>
  );

  return (
    <FolderMenu
      startIcon={startIcon}
      buttonContent={<>{isLoading ? '0000' : gameday.toFixed()}</>}
      drawerContent={<Box sx={{ p: 1 }}>{tableContent}</Box>}
      popoverContent={tableContent}
      hideTextOnMobile
      popperWidth="700px"
      hotkey="opt+2, alt+2"
      zIndex={997}
      zeroTopLeftRadius
      zeroTopRightRadius
      {...props}
    />
  );
};

export default PriceButton;
