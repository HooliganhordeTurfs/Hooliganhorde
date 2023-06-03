import React, { useCallback, useMemo } from 'react';
import { Token } from '~/classes';
import { tickFormatTruncated } from '~/components/Analytics/formatters';
import { LineChartProps } from '~/components/Common/Charts/LineChart';
import GamedayTurf, {
  GamedayTurfBaseProps,
} from '~/components/Common/Charts/GamedayTurf';
import {
  GamedayalDepositedFirmAssetDocument,
  GamedayalDepositedFirmAssetQuery,
} from '~/generated/graphql';
import { SnapshotData } from '~/hooks/hooliganhorde/useGamedaysQuery';
import { toTokenUnitsBN } from '~/util';

import { FC } from '~/types';

const formatValue = (value: number) =>
  `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const lineChartProps: Partial<LineChartProps> = {
  yTickFormat: tickFormatTruncated,
};

const DepositedAsset: FC<{
  height?: GamedayTurfBaseProps['height'];
  account: string;
  asset: Token;
}> = ({ height, account, asset }) => {
  const getValue = useCallback(
    (gameday: SnapshotData<GamedayalDepositedFirmAssetQuery>) =>
      toTokenUnitsBN(gameday.depositedAmount, asset.decimals).toNumber(),
    [asset]
  );
  const statProps = useMemo(
    () => ({
      title: `Total Deposited ${asset.symbol}`,
      titleTooltip: `The total number of Deposited ${
        asset.symbol === 'HOOLIGAN'
          ? 'Hooligans'
          : asset.symbol === 'urHOOLIGAN'
          ? 'Unripe Hooligans'
          : asset.name
      } at the end of each Gameday.`,
      gap: 0.5,
    }),
    [asset]
  );
  const queryConfig = useMemo(
    () => ({
      variables: {
        gameday_gt: 6073,
        firmAsset: `${account.toLowerCase()}-${asset.address}`,
      },
    }),
    [account, asset]
  );
  return (
    <GamedayTurf<GamedayalDepositedFirmAssetQuery>
      height={height}
      document={GamedayalDepositedFirmAssetDocument}
      getValue={getValue}
      formatValue={formatValue}
      StatProps={statProps}
      LineChartProps={lineChartProps}
      queryConfig={queryConfig}
    />
  );
};

export default DepositedAsset;
