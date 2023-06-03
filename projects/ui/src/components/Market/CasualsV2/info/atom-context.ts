import { BigNumber } from 'bignumber.js';
import { atom, PrimitiveAtom, useAtom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import { useEffect, useMemo } from 'react';

import { TurfFragment } from '~/components/Common/Form';
import { CasualListing, CasualOrder } from '~/state/guvnor/market';
import Token from '~/classes/Token';
import { ZERO_BN } from '~/constants';
import { HOOLIGAN, ETH, WETH } from '~/constants/tokens';
import usePreferredToken, {
  PreferredToken,
} from '~/hooks/guvnor/usePreferredToken';
// ---------- TYPES ----------
type PartialOpenState = 0 | 1 | 2;

export type MayBN = BigNumber | null;

export enum CasualOrderAction {
  BUY = 0,
  SELL = 1,
}

export enum CasualOrderType {
  ORDER = 0,
  FILL = 1,
  LIST = 2,
}

export enum PricingFn {
  FIXED = 'FIXED',
  DYNAMIC = 'DYNAMIC',
}

export type CasualsStateAtom<T extends BigNumber> = PrimitiveAtom<T>;
export type ValueAtom<T extends BigNumber | null> = PrimitiveAtom<T>;

// TODO - debounce;

// ---------- STATE ATOMS ----------

// chart type atom (casuals / Depth || select listing voroni)
export const marketChartTypeAtom = atom<'depth' | 'listing'>('depth');

const _marketBottomTabsAtom = atom<PartialOpenState>(0);
const accordionSizes = {
  0: 44,
  1: 300,
  2: 750,
};
export const marketBottomTabsHeightAtom = atom(accordionSizes[0]);
// open state of the bottom tabs (market / your orders)
export const marketBottomTabsAtom = atom(
  (get) => get(_marketBottomTabsAtom),
  (_get, set, update: PartialOpenState) => {
    // set the height of the bottom tabs
    set(marketBottomTabsHeightAtom, accordionSizes[update]);
    // set the open state
    set(_marketBottomTabsAtom, update);
  }
);

// whether the CasualOrderAction is Buy or Sell
// export const casualsOrderActionAtom = atom<CasualOrderAction | null>(null);
export const casualsOrderActionAtom = atom<CasualOrderAction>(CasualOrderAction.BUY);

// whether the CasualOrderAction is a filling a casual order or creating a new order
export const casualsOrderTypeAtom = atom<CasualOrderType>(CasualOrderType.ORDER);

// the place in line of a specific order or maximum place in line of an order
export const placeInLineAtom = atomWithReset<MayBN>(null);

// whether a fixed or dynamic pricing function is being used for the active form
export const pricingFunctionAtom = atom<PricingFn>(PricingFn.FIXED);

// price in hooligans per casual
export const pricePerCasualAtom = atom<BigNumber | null>(ZERO_BN);

// the price of the active form
export const orderPriceAtom = atom<MayBN>(null);

// is form being submitted
export const formSubmittingAtom = atom<boolean>(false);

// ----- SELECTED TURF -----

// [SELL] = the amount of casuals to sell from selected turf
export const selectedTurfAmountAtom = atom<MayBN>(null);

export const selectedTurfStartAtom = atom<MayBN>(null);

export const selectedTurfEndAtom = atom<MayBN>(null);

export const selectedTurfIndexAtom = atom<string | null>(null);

// [SELL] - the turf to sell
export const selectedTurfAtom = atom(
  (get) => {
    const index = get(selectedTurfIndexAtom);
    const start = get(selectedTurfStartAtom);
    const end = get(selectedTurfEndAtom);
    const amount = get(selectedTurfAmountAtom);

    if (!index && !start && !end && !amount) return null;
    return {
      index,
      start,
      end,
      amount,
    } as TurfFragment;
  },
  (_get, set, update: TurfFragment) => {
    set(selectedTurfAmountAtom, update.amount);
    set(selectedTurfStartAtom, update.start);
    set(selectedTurfEndAtom, update.end);
    set(selectedTurfIndexAtom, update.index);
  }
);

// the active listing in the form (BUY / SELL)
const _selectedListingAtom = atom<CasualListing | null>(null);

// the active order
const _selectedOrderAtom = atom<CasualOrder | null>(null);

// the total amount to fulfill a buy or sell order
export const fulfillAmountAtom = atom<MayBN>(null);

// the token used to fulfill a buy order
export const fulfillTokenAtom = atom<Token | null>(null);

// settings module atom
export const settingsSlippageAtom = atom<number>(0.1);

// ---------- GETTER ATOMS ----------

// [GETTER] => get all fields for buy order
export const buyFieldsAtomAtom = atom((get) => {
  const action = get(casualsOrderActionAtom);
  const orderType = get(casualsOrderTypeAtom);
  const placeInLine = get(placeInLineAtom);
  const pricingFn = get(pricingFunctionAtom);
  const price = get(orderPriceAtom);
  const selectedOrder = get(_selectedOrderAtom);
  const selectedListing = get(_selectedListingAtom);
  const fulfillAmount = get(fulfillAmountAtom);
  const fulfillToken = get(fulfillTokenAtom);
  const slippage = get(settingsSlippageAtom);

  return {
    action,
    orderType,
    placeInLine,
    pricingFn,
    price,
    selectedListing,
    selectedOrder,
    fulfillAmount,
    fulfillToken,
    slippage,
  };
});

// ---------- DERIVED ATOMS ----------

/**
 * [GET] => the action (BUY / SELL)
 * [SET] => resets the form values w/ exception of some fields
 */
export const casualsOrderActionTypeAtom = atom(
  (get) => get(casualsOrderActionAtom),
  (get, set) => {
    set(
      casualsOrderActionAtom,
      get(casualsOrderActionAtom) === CasualOrderAction.BUY
        ? CasualOrderAction.SELL
        : CasualOrderAction.BUY
    );
    set(casualsOrderTypeAtom, CasualOrderType.ORDER);
    set(placeInLineAtom, ZERO_BN);
    set(pricingFunctionAtom, PricingFn.FIXED);
    set(orderPriceAtom, ZERO_BN);
    set(_selectedListingAtom, null);
    set(_selectedOrderAtom, null);
    set(fulfillAmountAtom, ZERO_BN);
  }
);

/**
 * [GET] => get selected CasualOrder
 * [SET] => CasualOrder & max place-in-line of given CasualOrder
 */
export const selectedOrderAtom = atom(
  (get) => get(_selectedOrderAtom),
  (_get, set, order: CasualOrder | null) => {
    set(_selectedOrderAtom, order);
    set(placeInLineAtom, order?.maxPlaceInLine || ZERO_BN);
  }
);

/**
 * [GET] => get selected CasualListing
 * [SET] => CasualListing & place-in-line of given CasualListing
 */
export const selectedListingAtom = atom(
  (get) => get(_selectedListingAtom),
  (_get, set, listing: CasualListing | null) => {
    set(_selectedListingAtom, listing);
    set(placeInLineAtom, listing?.placeInLine || ZERO_BN);
  }
);

// ---------- DERIVED UTILS ----------

export const listingCasualsAmountAtom = atom((get) => {
  const selectedListing = get(_selectedListingAtom);
  return selectedListing?.amount || ZERO_BN;
});

// ---------- UTILS ----------

const PREFERRED_TOKENS: PreferredToken[] = [
  {
    token: HOOLIGAN,
    minimum: new BigNumber(1), // $1
  },
  {
    token: ETH,
    minimum: new BigNumber(0.001), // ~$2-4
  },
  {
    token: WETH,
    minimum: new BigNumber(0.001), // ~$2-4
  },
];

/**
 * implemented as a separate hook to account for current chain
 * @returns the preferred token for the current market
 */
export const useFulfillTokenAtom = () => {
  const [fulfillToken, setFulfillToken] = useAtom(fulfillTokenAtom);
  const baseToken = usePreferredToken(PREFERRED_TOKENS, 'use-best');

  useEffect(() => {
    if (baseToken && !fulfillToken) {
      setFulfillToken(baseToken as Token);
    }
  }, [fulfillToken, baseToken, setFulfillToken]);

  return useMemo(
    () => [fulfillToken, setFulfillToken] as const,
    [fulfillToken, setFulfillToken]
  );
};
