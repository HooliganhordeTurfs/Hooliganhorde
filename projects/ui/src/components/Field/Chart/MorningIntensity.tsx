import React, { useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import debounce from 'lodash/debounce';

import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { BarRounded } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Axis, Orientation } from '@visx/axis';

import { Box, CircularProgress, Typography } from '@mui/material';
import { chartHelpers } from '~/components/Common/Charts/ChartPropProvider';
import { tickFormatPercentage } from '~/components/Analytics/formatters';

import './chart.css';
import Row from '~/components/Common/Row';
import { displayFullBN } from '~/util';
import Centered from '~/components/Common/ZeroState/Centered';
import ChartInfoOverlay from '~/components/Common/Charts/ChartInfoOverlay';
import { ZERO_BN } from '~/constants';
import { getIsMorningInterval } from '~/state/hooliganhorde/codex/morning';
import FieldBlockCountdown from '~/components/Field/FieldBlockCountdown';
import useIntensity, {
  MorningBlockIntensity,
} from '~/hooks/hooliganhorde/useIntensity';
import { useAppSelector } from '~/state';

const {
  common: {
    axisColor,
    axisHeight,
    strokeBuffer,
    yAxisWidth,
    xTickLabelProps,
    yTickLabelProps,
    chartPadding,
    margin,
  },
} = chartHelpers;

const NON_MORNING_BN = new BigNumber(26);

const getInterval = (d: MorningBlockIntensity) => d.interval.toNumber();

const getIntensity = (d: MorningBlockIntensity) => d.intensity.toNumber();

const getClassName = (barState: { isPast: boolean; isCurrent: boolean }) => {
  if (barState.isCurrent) return 'bar-current';
  if (barState.isPast) return 'bar-past';
  return 'bar-future';
};

const getIntervalStatus = (
  data: MorningBlockIntensity,
  currentInterval: BigNumber
) => ({
  isCurrent: currentInterval.eq(getInterval(data)),
  isPast: currentInterval.gt(getInterval(data)),
});

type Props = {
  height: number;
  width: number;
  seriesData: MorningBlockIntensity[];
  interval: BigNumber;
  onHover: (block: MorningBlockIntensity | undefined) => void;
};

const useIntensityChart = ({
  width,
  height,
  seriesData,
}: Omit<Props, 'onHover' | 'interval'>) => {
  const verticalMargin = margin.top + margin.bottom;
  const xMax = width;
  const yMax = height - verticalMargin;

  const lastScaledIntensity = seriesData[seriesData.length - 1].intensity;

  const intervalScale = useMemo(() => {
    const scale = scaleBand<number>({
      range: [0, xMax - yAxisWidth],
      round: true,
      domain: seriesData.map(getInterval),
      padding: 0.1,
    });
    return scale;
  }, [seriesData, xMax]);

  const intensityScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, margin.bottom],
        round: true,
        domain: [0, lastScaledIntensity.toNumber() * 1.05],
      }),
    [lastScaledIntensity, yMax]
  );

  const dataRegion = {
    yTop: margin.top, // chart edge to data region first pixel
    yBottom:
      height - // chart edge to data region first pixel
      axisHeight - // chart edge to data region first pixel
      margin.bottom - // chart edge to data region first pixel
      strokeBuffer,
  };

  const numTicks = {
    x: width > 600 ? 25 : 13,
  };

  return {
    intervalScale,
    intensityScale,
    dataRegion,
    numTicks,
    yMax,
  };
};

const Chart: React.FC<Props> = ({
  seriesData,
  width,
  height,
  interval: currentInterval,
  onHover,
}) => {
  const { intervalScale, intensityScale, yMax, dataRegion, numTicks } =
    useIntensityChart({
      width,
      height,
      seriesData,
    });

  const XAxis = useMemo(() => {
    const XAxisComponent: React.FC = () => (
      <Axis
        key="x-axis"
        hideAxisLine
        top={yMax - margin.bottom / 2}
        orientation={Orientation.bottom}
        scale={intervalScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLabelProps={xTickLabelProps}
        hideTicks
        numTicks={numTicks.x}
      />
    );

    return XAxisComponent;
    // We are disabling this lint error because we only want this effect to re-run
    // for the following values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, intervalScale, numTicks.x]);

  const YAxis = useMemo(() => {
    const YAxisComponent: React.FC = () => (
      <Axis
        key="y-axis"
        left={width - chartPadding.right}
        orientation={Orientation.right}
        scale={intensityScale}
        stroke={axisColor}
        tickFormat={tickFormatPercentage}
        tickStroke={axisColor}
        tickLabelProps={yTickLabelProps}
        numTicks={4}
        strokeWidth={0}
      />
    );

    return YAxisComponent;
    // We are disabling this lint error because we only want this effect to re-run
    // for the following values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, intensityScale]);

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <Group
          width={width - yAxisWidth}
          height={dataRegion.yBottom - dataRegion.yTop}
        >
          {seriesData.map((d, i) => {
            const interval = getInterval(d);
            const barWidth = intervalScale.bandwidth();
            const _barHeight = yMax - intensityScale(getIntensity(d)) ?? 0;

            /// Minimum value of 5px to prevent the bar from being too small
            const barHeight = i === 0 ? Math.max(10, _barHeight) : _barHeight;

            const barX = intervalScale(interval) ?? 0;
            const barY = yMax - barHeight;

            const barState = getIntervalStatus(d, currentInterval);
            const className = getClassName(barState);

            return (
              <BarRounded
                key={`bar-${interval}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                className={className}
                radius={0}
                top
                onMouseEnter={() => onHover(d)}
                onTouchStart={() => onHover(d)}
                onMouseLeave={() => onHover(undefined)}
                onTouchEnd={() => onHover(undefined)}
              />
            );
          })}
        </Group>
        <XAxis />
        <YAxis />
      </svg>
    </div>
  );
};

const ChartWrapper: React.FC<{
  seriesData: MorningBlockIntensity[] | undefined;
  interval: BigNumber;
  onHover: (block: MorningBlockIntensity | undefined) => void;
}> = ({ seriesData, interval, onHover }) => {
  if (!seriesData) return null;

  return (
    <ParentSize debounceTime={50}>
      {({ width: visWidth, height: visHeight }) => (
        <Chart
          width={visWidth}
          height={visHeight}
          interval={interval}
          seriesData={seriesData}
          onHover={onHover}
        />
      )}
    </ParentSize>
  );
};

const MorningIntensity: React.FC<{
  show: boolean;
  height?: string;
}> = ({ show = false, height = '200px' }) => {
  const codexGameday = useAppSelector((s) => s._hooliganhorde.codex.gameday);
  const morning = useAppSelector((s) => s._hooliganhorde.codex.morning);

  const [{ current, max }, { generate }] = useIntensity();
  const intensityMap = useMemo(() => generate(), [generate]);

  /// Local State
  const [hovered, setHovered] = useState<MorningBlockIntensity | undefined>(
    undefined
  );

  /// Derived
  const blockNumber = morning.blockNumber;
  const gameday = codexGameday.current;
  const interval = morning.isMorning ? morning.index.plus(1) : NON_MORNING_BN;
  const intensityDisplay = (hovered?.intensity || current).toNumber();
  const displaySeconds = morning.isMorning
    ? hovered
      ? hovered.interval.times(12).toNumber()
      : morning.index.times(12).toNumber()
    : 0;
  const displayTimestamp = new Date(
    codexGameday.timestamp.plus({ seconds: displaySeconds }).toSeconds() * 1000
  ).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const [intensitys, loading] = useMemo(() => {
    const _intensitys = Object.values(intensityMap);
    const _loading = !_intensitys || _intensitys.length === 0;

    return [_intensitys, _loading] as const;
  }, [intensityMap]);

  const intensityIncrease = useMemo(() => {
    const nextInterval = interval.plus(1);
    if (getIsMorningInterval(nextInterval)) {
      const nextTemp =
        intensityMap[blockNumber.plus(1).toString()]?.intensity;
      return nextTemp?.minus(intensityDisplay || ZERO_BN) || ZERO_BN;
    }
    if (nextInterval.eq(26)) {
      return max?.minus(intensityDisplay || ZERO_BN) || ZERO_BN;
    }

    return ZERO_BN;
  }, [blockNumber, interval, max, intensityDisplay, intensityMap]);

  // We debounce b/c part of the Stat is rendered conditionally
  // based on the hover state and causes flickering
  const _setHovered = useMemo(
    () => debounce(setHovered, 40, { trailing: true }),
    []
  );

  return (
    <>
      <ChartInfoOverlay
        gap={0.5}
        title="Intensity"
        titleTooltip={
          <Box>
            The interest rate for Sowing Hooligans. Hooliganhorde logarithmically
            increases the Intensity for the first 25 blocks of each Gameday up
            to the Max Intensity.
          </Box>
        }
        amount={
          <Row alignItems="center" gap={0.5}>
            <Typography variant="h2">
              {`${(intensityDisplay || ZERO_BN).toFixed(0)}%`}
            </Typography>
            {!hovered && !show && (
              <Typography color="text.secondary">
                (
                <Typography color="primary" component="span">
                  +{displayFullBN(intensityIncrease, 0)}%
                </Typography>{' '}
                in <FieldBlockCountdown />)
              </Typography>
            )}
          </Row>
        }
        subtitle={
          <Typography variant="bodySmall">
            Gameday {gameday.toString()}
          </Typography>
        }
        secondSubtitle={displayTimestamp}
        isLoading={!intensityDisplay}
      />
      <Box width="100%" sx={{ height, position: 'relative' }}>
        {loading ? (
          <Centered minHeight={height}>
            <CircularProgress variant="indeterminate" />
          </Centered>
        ) : (
          <ChartWrapper
            seriesData={intensitys}
            interval={interval}
            onHover={(_block) => _setHovered(_block)}
          />
        )}
      </Box>
    </>
  );
};

export default MorningIntensity;
