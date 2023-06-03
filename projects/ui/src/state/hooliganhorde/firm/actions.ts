import { createAction } from '@reduxjs/toolkit';
import { HooliganhordeFirm } from '.';

export const resetHooliganhordeFirm = createAction('hooliganhorde/firm/reset');

export const updateHooliganhordeFirm = createAction<HooliganhordeFirm>(
  'hooliganhorde/firm/update'
);
