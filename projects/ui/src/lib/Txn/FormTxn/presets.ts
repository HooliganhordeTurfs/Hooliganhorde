import { FormTxn } from './types';

export const FormTxnBundlerPresets: {
  [key: string]: {
    primary: FormTxn[];
    secondary: FormTxn[];
  };
} = {
  claim: {
    primary: [FormTxn.TRADE, FormTxn.DRAFT, FormTxn.CLAIM],
    secondary: [FormTxn.MOW, FormTxn.RECRUIT, FormTxn.ENROOT],
  },
  enroot: {
    primary: [FormTxn.ENROOT],
    secondary: [
      FormTxn.MOW,
      FormTxn.RECRUIT,
      FormTxn.TRADE,
      FormTxn.DRAFT,
      FormTxn.CLAIM,
    ],
  },
  tradeDraft: {
    primary: [FormTxn.TRADE, FormTxn.DRAFT],
    secondary: [FormTxn.MOW, FormTxn.RECRUIT, FormTxn.ENROOT, FormTxn.CLAIM],
  },
  recruit: {
    primary: [FormTxn.RECRUIT],
    secondary: [
      FormTxn.MOW,
      FormTxn.ENROOT,
      FormTxn.TRADE,
      FormTxn.DRAFT,
      FormTxn.CLAIM,
    ],
  },
  noPrimary: {
    primary: [],
    secondary: [
      FormTxn.MOW,
      FormTxn.RECRUIT,
      FormTxn.ENROOT,
      FormTxn.TRADE,
      FormTxn.DRAFT,
      FormTxn.CLAIM,
    ],
  },
};
