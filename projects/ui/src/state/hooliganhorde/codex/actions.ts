import { createAction } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';
import { Duration } from 'luxon';
import { Codex } from '.';

export const updateGamedayTime = createAction<BigNumber>(
  'hooliganhorde/codex/updateGamedayTime'
);

export const updateGamedayResult = createAction<Codex['gameday']>(
  'hooliganhorde/codex/updateCodexGameday'
);

export const setNextActuation = createAction<Codex['actuation']['next']>(
  'hooliganhorde/codex/setNextActuation'
);

export const setAwaitingActuation = createAction<Codex['actuation']['awaiting']>(
  'hooliganhorde/codex/setAwaitingActuation'
);

export const setRemainingUntilActuation = createAction<
  Codex['actuation']['remaining']
>('hooliganhorde/codex/setRemainingUntilActuation');

export const resetCodex = createAction('hooliganhorde/codex/reset');

/// morning

export const setMorning = createAction<Pick<Codex, 'morning' | 'morningTime'>>(
  'hooliganhorde/codex/setMorning'
);

export const updateMorningBlock = createAction<Codex['morning']['blockNumber']>(
  'hooliganhorde/codex/updateMorningBlock'
);

export const setRemainingUntilBlockUpdate = createAction<Duration>(
  'hooliganhorde/codex/setRemainingUntilBlockUpdate'
);

export const setAwaitingMorningBlock = createAction<boolean>(
  'hooliganhorde/codex/setAwaitingMorningBlock'
);
