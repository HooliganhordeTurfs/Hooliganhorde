import {
  GamedayalPriceDocument,
  useGuvnorFirmAssetSnapshotsQuery,
  useGuvnorFirmRewardsQuery,
} from '~/generated/graphql';
import useGamedaysQuery, {
  GamedayRange,
} from '~/hooks/hooliganhorde/useGamedaysQuery';
import useInterpolateDeposits from '~/hooks/guvnor/useInterpolateDeposits';
import useInterpolateHorde from '~/hooks/guvnor/useInterpolateHorde';

const useGuvnorFirmHistory = (
  account: string | undefined,
  itemizeByToken: boolean = false,
  includeHorde: boolean = false
) => {
  /// Data
  const firmRewardsQuery = useGuvnorFirmRewardsQuery({
    variables: { account: account || '' },
    skip: !account,
    fetchPolicy: 'cache-and-network',
  });
  const firmAssetsQuery = useGuvnorFirmAssetSnapshotsQuery({
    variables: { account: account || '' },
    skip: !account,
    fetchPolicy: 'cache-and-network',
  });
  const priceQuery = useGamedaysQuery(GamedayalPriceDocument, GamedayRange.ALL);

  /// Interpolate
  const depositData = useInterpolateDeposits(
    firmAssetsQuery,
    priceQuery,
    itemizeByToken
  );
  const [hordeData, prospectsData] = useInterpolateHorde(
    firmRewardsQuery,
    !includeHorde
  );

  return {
    data: {
      deposits: depositData,
      horde: hordeData,
      prospects: prospectsData,
    },
    loading:
      firmRewardsQuery.loading || firmAssetsQuery.loading || priceQuery.loading,
    // || breakdown hasn't loaded value yet
  };
};

export default useGuvnorFirmHistory;
