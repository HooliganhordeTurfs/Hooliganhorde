import BigNumber from 'bignumber.js';
import { TurfMap } from '~/util';

/// FIXME: "Field" or "GuvnorField";
export type GuvnorField = {
  turfs: TurfMap<BigNumber>;
  casuals: BigNumber;
  draftableTurfs: TurfMap<BigNumber>;
  draftableCasuals: BigNumber;
};
