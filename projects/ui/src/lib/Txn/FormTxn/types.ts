import { FarmToMode } from '@xblackfury/sdk';

export enum FormTxn {
  MOW = 'MOW',
  RECRUIT = 'RECRUIT',
  ENROOT = 'ENROOT',
  DRAFT = 'DRAFT',
  TRADE = 'TRADE',
  CLAIM = 'CLAIM',
}

export type FormTxnBundlerInterface = {
  preset: string | number;
  primary: FormTxn[] | undefined;
  secondary: FormTxn[] | undefined;
  implied?: FormTxn[] | undefined;
  exclude?: FormTxn[] | undefined;
  transferToMode?: FarmToMode | undefined;
};

export type FormTxnMap<T = FormTxn> = { [key in FormTxn]: T };
