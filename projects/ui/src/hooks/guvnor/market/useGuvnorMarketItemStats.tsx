import { useMemo } from 'react';
import { GuvnorMarketOrder } from '~/hooks/guvnor/market/useGuvnorMarket2';
import { displayBN, displayFullBN } from '~/util';

const openStates = ['ACTIVE', 'FILLED_PARTIAL'];

const isListing = (i: GuvnorMarketOrder) => i.type === 'listing' && i.source;
const isOrder = (i: GuvnorMarketOrder) => i.type === 'order' && i.source;

export default function useGuvnorMarketItemStats(
  item: GuvnorMarketOrder | undefined | null
) {
  const data = useMemo(() => {
    if (
      !item ||
      (item.type === 'listing' && !item.source) ||
      (item.type === 'order' && !item.source)
    ) {
      return undefined;
    }

    const items: { label: string; info: string }[] = [];

    items.push({
      label: 'ID',
      info: isOrder(item) ? item.id.substring(0, 8) : item.id,
    });

    items.push({
      label: 'ACTION',
      info: item.action.toUpperCase(),
    });
    items.push({
      label: 'TYPE',
      info: item.type.toUpperCase(),
    });
    items.push({
      label: 'PRICE TYPE',
      info: item.pricingType === 1 ? 'DYNAMIC' : 'FIXED',
    });
    items.push({
      label: 'PRICE',
      info: displayFullBN(item.pricePerCasual, 2, 2),
    });
    if (isListing(item)) {
      items.push({
        label: 'AMOUNT',
        info: `${displayBN(item.amountCasuals)} CASUALS`,
      });
    }
    items.push({
      label: 'PLACE IN LINE',
      info: `${isOrder(item) ? '0 - ' : ''}${displayBN(item.placeInLine)} CASUALS`,
    });
    if (isListing(item)) {
      items.push({
        label: 'EXPIRY',
        info: item.expiry?.gt(0) ? item.expiry.toString() : 'N/A',
      });
    }
    items.push({
      label: '% FILLED',
      info: item.fillPct.isNaN() ? '-%' : `${displayFullBN(item.fillPct, 2)}%`,
    });
    items.push({
      label: 'TOTAL',
      info: `${displayFullBN(item.amountHooligans, 2)} HOOLIGAN`,
    });
    items.push({
      label: 'STATUS',
      info: item.status,
    });

    return items;
  }, [item]);

  const isCancellable = useMemo(() => {
    if (!item) return false;
    if (isOrder(item)) {
      return openStates.includes(item.status);
    }
    if (isListing(item)) {
      return openStates.includes(item.status);
    }
    return false;
  }, [item]);

  return {
    data,
    isCancellable,
    openStates,
  };
}
