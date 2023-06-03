import { useMemo } from 'react';
import { useCasualOrderQuery } from '~/generated/graphql';
import { Source } from '~/util';
import { castCasualOrder } from '~/state/guvnor/market';
import useGuvnorOrdersLedger from '../guvnor/useGuvnorOrdersLedger';

const useCasualOrder = (id: string | undefined) => {
  const guvnorOrders = useGuvnorOrdersLedger();
  const query = useCasualOrderQuery({ variables: { id: id || '' }, skip: !id });
  const [data, source] = useMemo(() => {
    if (id && query.data?.casualOrder) {
      return [castCasualOrder(query.data.casualOrder), Source.SUBGRAPH];
    }
    if (id && guvnorOrders[id]) {
      return [guvnorOrders[id], Source.LOCAL];
    }
    return [undefined, undefined];
  }, [guvnorOrders, id, query.data?.casualOrder]);

  return {
    ...query,
    /// If the query finished loading and has no data,
    /// check redux for a local order that was loaded
    /// via direct event processing.
    data,
    source,
  };
};

export default useCasualOrder;
