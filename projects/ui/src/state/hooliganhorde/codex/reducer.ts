import { createReducer } from '@reduxjs/toolkit';
import { NEW_BN } from '~/constants';
import {
  getDiffNow,
  getNextExpectedBlockUpdate,
  getNextExpectedActuation,
  Codex,
} from '.';
import {
  setNextActuation,
  setRemainingUntilActuation,
  setAwaitingActuation,
  updateGamedayTime,
  resetCodex,
  updateGamedayResult,
  setRemainingUntilBlockUpdate,
  setMorning,
} from './actions';

const getInitialState = () => {
  const nextActuation = getNextExpectedActuation();
  const nextBlockUpdate = getNextExpectedBlockUpdate();
  return {
    gamedayTime: NEW_BN,
    actuation: {
      awaiting: false,
      next: nextActuation,
      remaining: nextActuation.diffNow(),
    },
    gameday: {
      current: NEW_BN,
      lastSop: NEW_BN,
      withdrawGamedays: NEW_BN,
      lastSopGameday: NEW_BN,
      rainStart: NEW_BN,
      raining: false,
      fertilizing: false,
      actuationBlock: NEW_BN,
      abovePeg: false,
      start: NEW_BN,
      period: NEW_BN,
      timestamp: nextActuation.minus({ hour: 1 }),
    },
    morning: {
      isMorning: false,
      blockNumber: NEW_BN,
      index: NEW_BN,
    },
    morningTime: {
      awaiting: false,
      next: nextBlockUpdate,
      remaining: getDiffNow(nextBlockUpdate),
      endTime: nextActuation.plus({ minutes: 5 }),
    },
  };
};

const initialState: Codex = getInitialState();

export default createReducer(initialState, (builder) =>
  builder
    .addCase(resetCodex, () => getInitialState())
    .addCase(updateGamedayTime, (state, { payload }) => {
      state.gamedayTime = payload;
    })
    .addCase(updateGamedayResult, (state, { payload }) => {
      state.gameday = payload;
    })
    .addCase(setAwaitingActuation, (state, { payload }) => {
      state.actuation.awaiting = payload;
    })
    .addCase(setNextActuation, (state, { payload }) => {
      state.actuation.next = payload;
    })
    .addCase(setRemainingUntilActuation, (state, { payload }) => {
      state.actuation.remaining = payload;
    })
    .addCase(setMorning, (state, { payload }) => {
      state.morning = payload.morning;
      state.morningTime = payload.morningTime;
    })
    .addCase(setRemainingUntilBlockUpdate, (state, { payload }) => {
      state.morningTime.remaining = payload;
    })
);
