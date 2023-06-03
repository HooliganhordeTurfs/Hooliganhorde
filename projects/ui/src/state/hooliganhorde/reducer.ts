import { combineReducers } from '@reduxjs/toolkit';

import barrack from './barrack/reducer';
import field from './field/reducer';
import governance from './governance/reducer';
import firm from './firm/reducer';
import codex from './codex/reducer';
import tokenPrices from './tokenPrices/reducer';
import nft from './nft/reducer';

export default combineReducers({
  barrack,
  field,
  governance,
  firm,
  codex,
  tokenPrices,
  nft,
});
