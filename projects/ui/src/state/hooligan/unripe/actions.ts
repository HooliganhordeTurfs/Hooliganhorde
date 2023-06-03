import { createAction } from '@reduxjs/toolkit';
import { Unripe } from '.';

export const resetUnripe = createAction('hooligan/unripe/reset');

export const updateUnripe = createAction<Unripe>('hooligan/unripe/update');
