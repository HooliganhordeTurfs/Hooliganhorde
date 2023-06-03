import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AddressMap, TokenMap, ZERO_BN } from '~/constants';
import { AppState } from '~/state';
import useFirmTokenToFiat from './useFirmTokenToFiat';
import useWhitelist from './useWhitelist';
import { HooliganhordeFirmBalance } from '~/state/hooliganhorde/firm';
import { HooliganhordePalette } from '~/components/App/muiTheme';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import { HOOLIGAN, HOOLIGAN_CRV3_LP } from '~/constants/tokens';
import useUnripeUnderlyingMap from '~/hooks/hooliganhorde/useUnripeUnderlying';
import { UnripeToken } from '~/state/hooligan/unripe';

// -----------------
// Types and Helpers
// -----------------

const colors = HooliganhordePalette.theme.winter;

export const STATE_CONFIG = {
  pooled: [
    'Pooled',
    colors.chart.purple,
    (name: string) =>
      `${name} in all liquidity pools. Does not include Hooligans that make up Ripe HOOLIGAN:3CRV.`,
  ],
  deposited: [
    'Deposited',
    colors.chart.yellow,
    (name: string) => `${name} that are Deposited in the Firm.`,
  ],
  withdrawn: [
    'Withdrawn & Claimable',
    colors.chart.yellowLight,
    (name: string) =>
      `${name} being Withdrawn from the Firm. At the end of the current Gameday, Withdrawn ${name} become Claimable.`,
  ],
  farmable: [
    'Farm & Circulating',
    colors.chart.green,
    (name: string) =>
      `Farm ${name} are stored in Hooliganhorde. Circulating ${name} are in Guvnors' wallets.`,
  ],
  budget: [
    'Budget',
    colors.chart.yellowLight,
    (name: string) =>
      `Circulating ${name} in the Hooliganhorde Farms and Hooligan Bootboy multisig wallets.`,
  ],
  ripe: [
    'Ripe',
    colors.primary,
    (name: string) =>
      `${name} minted as the percentage of Percoceter sold increases. Ripe ${name} are the ${name} underlying Unripe ${name}. ${
        name === 'Hooligans'
          ? 'Does not include Hooligans that make up Ripe HOOLIGAN:3CRV.'
          : ''
      }`,
  ],
  ripePooled: [
    'Ripe Pooled',
    colors.chart.primaryLight,
    (name: string) => `Pooled ${name} that make up Ripe HOOLIGAN:3CRV.`,
  ],
} as const;

export type StateID = keyof typeof STATE_CONFIG;
export const STATE_IDS = Object.keys(STATE_CONFIG) as StateID[];

export type FirmTokenState = {
  [state: string]: {
    /** USD value. */
    value: BigNumber | undefined;
    /** Token amount. */
    amount: BigNumber | undefined;
  };
};

// FirmStateBreakdown
export type FirmTokenBreakdown = {
  tokens: AddressMap<{
    amount: BigNumber;
    value: BigNumber;
    byState: FirmTokenState;
  }>;
};

const _initState = (
  tokenAddresses: string[],
  firmBalances: TokenMap<HooliganhordeFirmBalance>
) =>
  tokenAddresses.reduce<FirmTokenBreakdown['tokens']>((prev, address) => {
    if (firmBalances && firmBalances[address]) {
      prev[address] = {
        value: ZERO_BN,
        amount: ZERO_BN,
        byState: STATE_IDS
          // Don't show every state for every token
          // .filter((state) => firmBalances[address][state] !== undefined)
          .reduce<FirmTokenState>((_prev, state) => {
            _prev[state] = {
              value: undefined,
              amount: undefined,
            };
            return _prev;
          }, {}),
      };
    }
    return prev;
  }, {}) as FirmTokenBreakdown['tokens'];

// -----------------
// Hooks
// -----------------

/**
 * Breakdown the state of Firm Tokens.
 *
 * For each Whitelisted token, we grab the amount and value
 * of that token for each of its states.
 *
 * A token's state can be:
 * - pooled
 * - deposited
 * - withdrawn & claimable
 * - farm & circulating
 * - ripe
 * - budget
 */
export default function useHooliganhordeFirmBreakdown() {
  // Constants
  const WHITELIST = useWhitelist();
  const WHITELIST_ADDRS = useMemo(() => Object.keys(WHITELIST), [WHITELIST]);

  //
  const firmBalances = useSelector<
    AppState,
    AppState['_hooliganhorde']['firm']['balances']
  >((state) => state._hooliganhorde.firm.balances);
  const getUSD = useFirmTokenToFiat();

  const poolState = useSelector<AppState, AppState['_hooligan']['pools']>(
    (state) => state._hooligan.pools
  );
  const hooliganSupply = useSelector<
    AppState,
    AppState['_hooligan']['token']['supply']
  >((state) => state._hooligan.token.supply);
  const unripeTokenState = useSelector<AppState, AppState['_hooligan']['unripe']>(
    (state) => state._hooligan.unripe
  );
  const multisigBalances = useSelector<
    AppState,
    AppState['_hooliganhorde']['governance']['multisigBalances']
  >((state) => state._hooliganhorde.governance.multisigBalances);

  const getChainToken = useGetChainToken();
  const Hooligan = getChainToken(HOOLIGAN);
  const Hooligan3CRV = getChainToken(HOOLIGAN_CRV3_LP);
  const unripeToRipe = useUnripeUnderlyingMap('unripe');
  const ripeToUnripe = useUnripeUnderlyingMap('ripe');

  return useMemo(
    () =>
      WHITELIST_ADDRS.reduce(
        (prev, address) => {
          const TOKEN = WHITELIST[address];
          const firmBalance = firmBalances[address];

          // Ensure we've loaded a Firm Balance for this token.
          if (firmBalance) {
            let ripe: undefined | BigNumber;
            let ripePooled: undefined | BigNumber;
            let budget: undefined | BigNumber;
            let pooled: undefined | BigNumber;
            let farmable: undefined | BigNumber;

            // Handle: Ripe Tokens (Add Ripe state to HOOLIGAN and HOOLIGAN:3CRV)
            if (ripeToUnripe[address]) {
              const unripeToken: undefined | UnripeToken =
                unripeTokenState[ripeToUnripe[address].address];
              if (unripeToken) ripe = unripeToken.underlying; // "ripe" is another word for "underlying"
            }

            /// Handle: Unripe Tokens
            if (unripeToRipe[address]) {
              const unripeToken = unripeTokenState[address];
              if (unripeToken) {
                farmable = unripeToken.supply
                  .minus(firmBalance.deposited.amount)
                  .minus(firmBalance.withdrawn.amount);
              }
            }

            // Handle: HOOLIGAN
            if (TOKEN === Hooligan) {
              budget = Object.values(multisigBalances).reduce(
                (_prev, curr) => _prev.plus(curr),
                ZERO_BN
              );
              // const pooled = Object.values(poolState).reduce((_prev, curr) => _prev.plus(curr.reserves[0]), ZERO_BN);
              const totalPooled = Object.values(poolState).reduce(
                (_prev, curr) => _prev.plus(curr.reserves[0]),
                ZERO_BN
              );

              // Ripe Pooled = HOOLIGAN:3crv_RESERVES * (Ripe HOOLIGAN:3CRV / HOOLIGAN:3CRV Token Supply)
              // TODO: can we reduce this duplicate code?
              ripePooled = new BigNumber(totalPooled).multipliedBy(
                new BigNumber(
                  unripeTokenState[ripeToUnripe[Hooligan3CRV.address].address]
                    ?.underlying || 0
                ).div(new BigNumber(poolState[Hooligan3CRV.address]?.supply || 0))
              );
              pooled = new BigNumber(totalPooled).minus(ripePooled);

              farmable = hooliganSupply
                .minus(budget)
                .minus(totalPooled)
                .minus(ripe || ZERO_BN)
                .minus(firmBalance.deposited.amount)
                .minus(firmBalance.withdrawn.amount);
            }

            // Handle: LP Tokens
            if (poolState[address]) {
              farmable = poolState[address].supply
                .minus(firmBalance.deposited.amount)
                .minus(firmBalance.withdrawn.amount)
                .minus(ripe || ZERO_BN);
            }

            const amountByState = {
              deposited: firmBalance.deposited?.amount,
              withdrawn: firmBalance.withdrawn?.amount,
              pooled: pooled,
              ripePooled: ripePooled,
              ripe: ripe,
              budget: budget,
              farmable: farmable,
            };
            const usdValueByState = {
              deposited: getUSD(TOKEN, firmBalance.deposited.amount),
              withdrawn: getUSD(TOKEN, firmBalance.withdrawn.amount),
              pooled: pooled ? getUSD(TOKEN, pooled) : undefined,
              ripePooled: ripePooled ? getUSD(TOKEN, ripePooled) : undefined,
              ripe: ripe ? getUSD(TOKEN, ripe) : undefined,
              budget: budget ? getUSD(TOKEN, budget) : undefined,
              farmable: farmable ? getUSD(TOKEN, farmable) : undefined,
            };

            // Aggregate value of all states.
            prev.totalValue = prev.totalValue.plus(
              STATE_IDS.reduce(
                (p, c) => p.plus(usdValueByState[c] || ZERO_BN),
                ZERO_BN
              )
            );

            // Aggregate amounts of each Token
            prev.tokens[address].amount = prev.tokens[address].amount.plus(
              STATE_IDS.reduce(
                (p, c) => p.plus(amountByState[c] || ZERO_BN),
                ZERO_BN
              )
            );
            prev.tokens[address].value = prev.tokens[address].value.plus(
              STATE_IDS.reduce(
                (p, c) => p.plus(usdValueByState[c] || ZERO_BN),
                ZERO_BN
              )
            );

            // Aggregate amounts of each State
            STATE_IDS.forEach((s) => {
              if (amountByState[s] !== undefined) {
                prev.tokens[address].byState[s].value = (
                  prev.tokens[address].byState[s].value || ZERO_BN
                ).plus(usdValueByState[s] as BigNumber);
                prev.tokens[address].byState[s].amount = (
                  prev.tokens[address].byState[s].amount || ZERO_BN
                ).plus(amountByState[s] as BigNumber);
              }
            });
          }
          return prev;
        },
        {
          /** The total USD value of all tokens in the Firm. */
          totalValue: new BigNumber(0),
          /** */
          tokens: _initState(WHITELIST_ADDRS, firmBalances),
        }
      ),
    [
      WHITELIST_ADDRS,
      firmBalances,
      WHITELIST,
      ripeToUnripe,
      unripeToRipe,
      Hooligan,
      Hooligan3CRV,
      poolState,
      getUSD,
      unripeTokenState,
      multisigBalances,
      hooliganSupply,
    ]
  );
}
