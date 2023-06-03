import { useMemo } from 'react';
import { useCasualListingQuery } from '~/generated/graphql';
import { Source } from '~/util';
import { castCasualListing } from '~/state/guvnor/market';
import useGuvnorListingsLedger from '../guvnor/useGuvnorListingsLedger';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';

const useCasualListing = (index: string | undefined) => {
  const guvnorListings = useGuvnorListingsLedger();
  const query = useCasualListingQuery({
    variables: { index: index || '' },
    skip: !index,
  });
  const draftableIndex = useDraftableIndex();
  const [data, source] = useMemo(() => {
    if (index && query.data?.casualListings?.[0]) {
      return [
        castCasualListing(query.data.casualListings[0], draftableIndex),
        Source.SUBGRAPH,
      ];
    }
    if (index && guvnorListings[index]) {
      return [guvnorListings[index], Source.LOCAL];
    }
    return [undefined, undefined];
  }, [guvnorListings, draftableIndex, index, query.data?.casualListings]);

  return {
    ...query,
    /// If the query finished loading and has no data,
    /// check redux for a local order that was loaded
    /// via direct event processing.
    data,
    source,
  };
};

export default useCasualListing;
