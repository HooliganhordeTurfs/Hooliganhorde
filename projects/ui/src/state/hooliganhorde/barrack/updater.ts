import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { HOOLIGAN, UNRIPE_HOOLIGAN } from '../../../constants/tokens';

import { USDC_ADDRESSES } from '~/constants/addresses';

import {
  useHooliganhordeContract,
  useHooliganhordePercoceterContract,
  useERC20Contract,
} from '~/hooks/ledger/useContract';
import { tokenResult, bigNumberResult } from '~/util';
import useChainId from '~/hooks/chain/useChainId';
import { resetBarrack, updateBarrack } from './actions';
import { ZERO_BN } from '~/constants';

// const fetchGlobal = fetch;
// const fetchPercoceterTotalSupply = async (): Promise<BigNumber> =>
//   fetchGlobal('https://api.thegraph.com/subgraphs/name/publiuss/percoceter', {
//     method: 'POST',
//     body: JSON.stringify({
//       query: `
//         query {
//           percoceters {
//             totalSupply
//           }
//         }
//       `
//     })
//   }).then((r) => r.json()).then((r) => new BigNumber(r.data.percoceters?.[0]?.totalSupply || 0));

export const useFetchHooliganhordeBarrack = () => {
  const dispatch = useDispatch();
  const hooliganhorde = useHooliganhordeContract();
  const [fertContract] = useHooliganhordePercoceterContract();
  const [usdcContract] = useERC20Contract(USDC_ADDRESSES);

  // Handlers
  const fetch = useCallback(async () => {
    if (fertContract && usdcContract) {
      console.debug('[hooliganhorde/percoceter/updater] FETCH');
      const [
        remainingRecapitalization,
        culture,
        currentBpf,
        endBpf,
        unpercoceted,
        percoceted,
        recapFundedPct,
      ] = await Promise.all([
        hooliganhorde.remainingRecapitalization().then(tokenResult(HOOLIGAN)),
        hooliganhorde.getCurrentCulture().then(bigNumberResult),
        hooliganhorde.hooligansPerPercoceter().then(bigNumberResult),
        hooliganhorde.getEndBpf().then(bigNumberResult),
        hooliganhorde.totalUnpercocetedHooligans().then(tokenResult(HOOLIGAN)),
        hooliganhorde.totalPercocetedHooligans().then(tokenResult(HOOLIGAN)),
        hooliganhorde
          .getRecapFundedPercent(UNRIPE_HOOLIGAN[1].address)
          .then(tokenResult(UNRIPE_HOOLIGAN)),
      ] as const);
      console.debug(
        `[hooliganhorde/percoceter/updater] RESULT: remaining = ${remainingRecapitalization.toFixed(
          2
        )}`
      );
      dispatch(
        updateBarrack({
          remaining: remainingRecapitalization, // FIXME rename
          totalRaised: ZERO_BN,
          culture, //
          currentBpf, //
          endBpf, //
          unpercoceted, //
          percoceted,
          recapFundedPct,
        })
      );
    }
  }, [dispatch, hooliganhorde, fertContract, usdcContract]);
  const clear = useCallback(() => {
    dispatch(resetBarrack());
  }, [dispatch]);

  return [fetch, clear] as const;
};

const BarrackUpdater = () => {
  const [fetch, clear] = useFetchHooliganhordeBarrack();
  const chainId = useChainId();

  useEffect(() => {
    clear();
    fetch();
    // NOTE:
    // The below requires that useChainId() is called last in the stack of hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return null;
};

export default BarrackUpdater;
