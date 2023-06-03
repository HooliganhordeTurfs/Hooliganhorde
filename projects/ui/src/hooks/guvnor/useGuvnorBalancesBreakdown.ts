import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import { AddressMap, ZERO_BN } from '~/constants';
import { AppState } from '~/state';
import useFirmTokenToFiat from '../hooliganhorde/useFirmTokenToFiat';
import useWhitelist from '../hooliganhorde/useWhitelist';
import { HooliganhordePalette } from '~/components/App/muiTheme';

// -----------------
// Types and Helpers
// -----------------

export const STATE_CONFIG = {
  deposited: [
    'Deposited',
    HooliganhordePalette.logoGreen,
    'Assets that are Deposited in the Firm.',
  ],
  withdrawn: [
    'Withdrawn',
    '#DFB385',
    'Assets being Withdrawn from the Firm. At the end of the current Gameday, Withdrawn assets become Claimable.',
  ],
  claimable: [
    'Claimable',
    '#ECBCB3',
    'Assets that can be Claimed after a Withdrawal.',
  ],
  farm: [
    'Farm',
    '#F2E797',
    'Assets stored in Hooliganhorde. Farm assets can be used in transactions on the Farm.',
  ],
  circulating: [
    'Circulating',
    HooliganhordePalette.lightBlue,
    'Hooliganhorde assets in your wallet.',
  ],
} as const;

export type StateID = keyof typeof STATE_CONFIG;
export const STATE_IDS = Object.keys(STATE_CONFIG) as StateID[];

export type FirmStateBreakdown = {
  /**
   * The aggregate USD value of tokens in this State.
   * Ex. I have $100 Deposited.
   */
  value: BigNumber;
  /**
   * A mapping of address => { amount, value } for Tokens in this State.
   * Ex. I have a Hooligan deposit: 0xHOOLIGAN => { amount: 100, value: 101 } if 1 HOOLIGAN = $1.01
   */
  byToken: AddressMap<{ amount: BigNumber; value: BigNumber }>;
};

const _initState = (tokenAddresses: string[]) =>
  ({
    value: new BigNumber(0),
    byToken: tokenAddresses.reduce<FirmStateBreakdown['byToken']>(
      (prev, curr) => {
        prev[curr] = {
          amount: new BigNumber(0),
          value: new BigNumber(0),
        };
        return prev;
      },
      {}
    ),
  } as FirmStateBreakdown);

// -----------------
// Hooks
// -----------------

/**
 * Breakdown the state of Firm Tokens.
 *
 * A "Token State" is the state of a whitelisted Firm Token
 * within Hooliganhorde.
 *
 *    (1)--[deposited => withdrawn => claimable]-->(2)
 *    (2)--[circulating <-> farm]-->(1)
 *
 * First we break things down by state, then by type of token.
 */
export default function useGuvnorBalancesBreakdown() {
  /// Constants
  const whitelist = useWhitelist();
  const whitelistAddrs = useMemo(() => Object.keys(whitelist), [whitelist]);

  /// Balances
  const firmBalances = useSelector<
    AppState,
    AppState['_guvnor']['firm']['balances']
  >((state) => state._guvnor.firm.balances);
  const tokenBalances = useSelector<AppState, AppState['_guvnor']['balances']>(
    (state) => state._guvnor.balances
  );

  /// Helpers
  const getUSD = useFirmTokenToFiat();

  return useMemo(() => {
    const prev = {
      totalValue: ZERO_BN,
      states: {
        deposited: _initState(whitelistAddrs),
        withdrawn: _initState(whitelistAddrs),
        claimable: _initState(whitelistAddrs),
        farm: _initState(whitelistAddrs), // FIXME: not a Firm state
        circulating: _initState(whitelistAddrs), // FIXME: not a Firm state
      },
    };

    /// Firm whitelist
    whitelistAddrs.forEach((address) => {
      const token = whitelist[address];
      const firmBalance = firmBalances[address];
      const tokenBalance = tokenBalances[address] || ZERO_BN;

      // Ensure we've loaded a Firm Balance for this token.
      if (firmBalance) {
        const amountByState = {
          deposited: firmBalance.deposited?.amount,
          withdrawn: firmBalance.withdrawn?.amount,
          claimable: firmBalance.claimable?.amount,
          farm: tokenBalance.internal,
          circulating: tokenBalance.external,
        };
        const usdValueByState = {
          deposited: getUSD(token, firmBalance.deposited?.amount),
          withdrawn: getUSD(token, firmBalance.withdrawn?.amount),
          claimable: getUSD(token, firmBalance.claimable?.amount),
          farm: getUSD(token, tokenBalance.internal),
          circulating: getUSD(token, tokenBalance.external),
        };

        // Aggregate value of all states.
        prev.totalValue = prev.totalValue.plus(
          STATE_IDS.reduce((p, c) => p.plus(usdValueByState[c]), ZERO_BN)
        );

        // Aggregate amounts of each State
        STATE_IDS.forEach((s) => {
          prev.states[s].value = prev.states[s].value.plus(usdValueByState[s]);
          prev.states[s].byToken[address].amount = prev.states[s].byToken[
            address
          ].amount.plus(amountByState[s]);
          prev.states[s].byToken[address].value = prev.states[s].byToken[
            address
          ].value.plus(usdValueByState[s]);
        });
      }
    });

    return prev;
  }, [whitelist, whitelistAddrs, firmBalances, tokenBalances, getUSD]);
}
