import { createAction } from '@reduxjs/toolkit';
import { HooliganhordeBarrack } from '.';

export const resetBarrack = createAction('hooliganhorde/barrack/reset');

export const updateBarrack = createAction<HooliganhordeBarrack>('hooliganhorde/barrack/update');
