import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';

import LineChart from '~/components/Common/Charts/LineChart';
import TimeTabs, { TimeTabState } from '~/components/Common/Charts/TimeTabs';
import WalletButton from '~/components/Common/Connection/WalletButton';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';
import BlurComponent from '~/components/Common/ZeroState/BlurComponent';
import MockTurf from '~/components/Firm/MockTurf';
import { PROSPECTS, HORDE } from '~/constants/tokens';
import {
  GamedayAggregation,
  GamedayRange,
  GAMEDAY_RANGE_TO_COUNT,
} from '~/hooks/hooliganhorde/useGamedaysQuery';

import { FC } from '~/types';
import { BaseDataPoint } from '~/components/Common/Charts/ChartPropProvider';

export type OverviewTurfProps = {
  account: string | undefined;
  gameday: BigNumber;
  current: BigNumber[];
  date: Date | string;
  series: BaseDataPoint[][];
  stats: (
    gameday: BigNumber,
    value: BigNumber[],
    date: string
  ) => React.ReactElement;
  empty: boolean;
  loading: boolean;
  label: string;
};

const OverviewTurf: FC<OverviewTurfProps> = ({
  account,
  gameday,
  current,
  date,
  series,
  stats,
  loading,
  empty,
  label,
}) => {
  const [displayGameday, setDisplayGameday] = useState<BigNumber>(gameday);
  const [displayValue, setDisplayValue] = useState<BigNumber[]>(current);
  const [displayDate, setDisplayDate] = useState<string>(
    date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  );

  useEffect(() => setDisplayValue(current), [current]);
  useEffect(() => setDisplayGameday(gameday), [gameday]);
  useEffect(
    () =>
      setDisplayDate(
        date.toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      ),
    [date]
  );

  const handleCursor = useCallback(
    (dps?: BaseDataPoint[]) => {
      setDisplayGameday(dps ? new BigNumber(dps[0].gameday) : gameday);
      setDisplayValue(dps ? dps.map((dp) => new BigNumber(dp.value)) : current);
      setDisplayDate(
        dps
          ? new Date(dps[0].date).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short',
            })
          : date.toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short',
            })
      );
    },

    [current, gameday, date]
  );

  const [tabState, setTimeTab] = useState<TimeTabState>([
    GamedayAggregation.HOUR,
    GamedayRange.WEEK,
  ]);
  const handleChangeTimeTab = useCallback((tabs: TimeTabState) => {
    setTimeTab(tabs);
  }, []);

  const filteredSeries = useMemo(() => {
    if (tabState[1] !== GamedayRange.ALL) {
      return series.map((s) =>
        s.slice(-(GAMEDAY_RANGE_TO_COUNT[tabState[1]] as number))
      );
    }
    return series;
  }, [series, tabState]);

  const ready = account && !loading && !empty;

  return (
    <>
      <Row alignItems="flex-start" justifyContent="space-between" pr={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          gap={{ xs: 1, md: 0 }}
          sx={{ px: 2, pb: { xs: 2, md: 0 } }}
          alignItems="flex-start"
        >
          {stats(displayGameday, displayValue, displayDate)}
        </Stack>
        <Stack alignItems="right">
          <TimeTabs
            state={tabState}
            setState={handleChangeTimeTab}
            aggregation={false}
          />
        </Stack>
      </Row>
      <Box sx={{ width: '100%', height: '220px', position: 'relative' }}>
        {ready ? (
          <LineChart series={filteredSeries} onCursor={handleCursor} />
        ) : (
          <>
            <MockTurf />
            <BlurComponent>
              <Stack
                justifyContent="center"
                alignItems="center"
                height="100%"
                gap={1}
              >
                {!account ? (
                  <>
                    <Typography variant="body1" color="text.tertiary">
                      Your {label} will appear here.
                    </Typography>
                    <WalletButton
                      showFullText
                      color="primary"
                      sx={{ height: 45 }}
                    />
                  </>
                ) : loading ? (
                  <CircularProgress
                    variant="indeterminate"
                    thickness={4}
                    color="primary"
                  />
                ) : empty ? (
                  <Typography variant="body1" color="text.tertiary">
                    Receive <TokenIcon token={HORDE} />
                    Horde and <TokenIcon token={PROSPECTS} />
                    Prospects for Depositing whitelisted assets in the Firm.
                    Hordeholders earn a portion of new Hooligan mints. Prospects grow
                    into Horde every Gameday.
                  </Typography>
                ) : null}
              </Stack>
            </BlurComponent>
          </>
        )}
      </Box>
    </>
  );
};

export default OverviewTurf;
