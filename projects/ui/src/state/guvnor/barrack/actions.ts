import { createAction } from '@reduxjs/toolkit';
import { GuvnorBarrack } from '.';

export const updateGuvnorBarrack = createAction<GuvnorBarrack>(
  'guvnor/barrack/updateBarrack'
);

export const resetGuvnorBarrack = createAction('guvnor/barrack/reset');
