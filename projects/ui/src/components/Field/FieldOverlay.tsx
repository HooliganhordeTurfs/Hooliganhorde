import React, { useMemo, useCallback } from 'react';
import { TestUtils } from '@xblackfury/sdk';
import { Box, Stack, Typography, Button } from '@mui/material';
import { useDispatch } from 'react-redux';
import { DateTime, Settings as LuxonSettings } from 'luxon';
import useSdk from '~/hooks/sdk';
import { getMorningResult, getDiffNow } from '~/state/hooliganhorde/codex';
import { setMorning } from '~/state/hooliganhorde/codex/actions';
import { useCodex } from '~/state/hooliganhorde/codex/updater';

import { HooliganhordePalette } from '~/components/App/muiTheme';
import { IS_DEV } from '~/util';

import Row from '~/components/Common/Row';
import useFetchLatestBlock from '~/hooks/chain/useFetchLatestBlock';
import useIntensity from '~/hooks/hooliganhorde/useIntensity';
import { useAppSelector } from '~/state';

const minimize = false;
/**
 * TEMPORARY --> DEV ONLY
 * Used to help faciliate the starting of a new gameday
 */
const FieldOverlay: React.FC<{}> = () => {
  const sdk = useSdk();

  const chainUtil = useMemo(() => new TestUtils.BlockchainUtils(sdk), [sdk]);
  const morning = useAppSelector((s) => s._hooliganhorde.codex.morning);
  const gamedayTime = useAppSelector((s) => s._hooliganhorde.codex.gamedayTime);
  const actuation = useAppSelector((s) => s._hooliganhorde.codex.gameday);
  const temp = useAppSelector((s) => s._hooliganhorde.field.intensity);

  const [fetchCodex] = useCodex();
  const [fetchBlock] = useFetchLatestBlock();

  const [{ current }] = useIntensity();

  const calculatedTempData = current.toString();

  const dispatch = useDispatch();

  const setLuxonGlobal = useCallback((from: DateTime) => {
    const diff = getDiffNow(from);
    const millis = diff.as('seconds') * 1000;

    LuxonSettings.now = () => Date.now() + millis;
  }, []);

  const handleClick = useCallback(async () => {
    console.debug('forwarding gameday...');
    await chainUtil.actuationForward();
    console.debug('fetching codex...');
    const [s] = await fetchCodex();
    const b = await fetchBlock();
    if (!s) return;
    console.debug('codex fetched...');
    setLuxonGlobal(s.timestamp);

    const morningResult = getMorningResult({
      timestamp: s.timestamp,
      blockNumber: b.blockNumber,
    });
    dispatch(setMorning(morningResult));
    // fetchMorningField();
  }, [chainUtil, dispatch, fetchBlock, fetchCodex, setLuxonGlobal]);

  if (minimize) return null;
  if (!IS_DEV) return null;

  return (
    <Box
      position="absolute"
      bottom="20px"
      right="20px"
      zIndex={99}
      sx={{ background: HooliganhordePalette.mediumGreen }}
    >
      <Box>
        <Box sx={{ width: '800px' }}>
          <Stack gap={0.5} p={2}>
            <Typography>
              Current Block: {morning.blockNumber.toString()}
            </Typography>
            <Typography>ActuationTime: {gamedayTime.toString()}</Typography>
            <Typography>
              Actuation Block: {actuation.actuationBlock.toString()}
            </Typography>
            <Typography>
              Interval: {morning.index.plus(1).toString()}
            </Typography>
            <Typography>temp from storage: {temp.scaled.toString()}</Typography>
            <Typography>
              calculated temp: {calculatedTempData?.toString()}
            </Typography>
            <Typography>max temp: {temp.max.toString()}</Typography>
            <Row gap={1} width="100%" justifyContent="space-between">
              <Button fullWidth size="small" onClick={handleClick}>
                call actuation
              </Button>
            </Row>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default FieldOverlay;
