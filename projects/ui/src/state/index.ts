import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import throttle from 'lodash/throttle';
import type { TypedUseSelectorHook } from 'react-redux';
import { useSelector } from 'react-redux';
import { saveState } from '~/util';

import app from './app/reducer';
import _hooligan from './hooligan/reducer';
import _hooliganhorde from './hooliganhorde/reducer';
import _guvnor from './guvnor/reducer';

const store = configureStore({
  reducer: {
    app,
    _hooligan,
    _hooliganhorde,
    _guvnor,
  },
  middleware: [
    ...getDefaultMiddleware({
      thunk: false,
      immutableCheck: false,
      serializableCheck: false,
    }),
  ],
  preloadedState: undefined,
});

export const save = () => saveState(store.getState());

store.subscribe(
  throttle(() => {
    save();
  }, 1000)
);

export default store;

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
