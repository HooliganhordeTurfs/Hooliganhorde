import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TokenValue } from '@xblackfury/sdk';
import { FC, MayPromise } from '~/types';
import useSdk from '~/hooks/sdk';
import useAccount from '~/hooks/ledger/useAccount';
import useGuvnorPercoceter from '~/hooks/guvnor/useGuvnorPercoceter';
import useGuvnorField from '~/hooks/guvnor/useGuvnorField';
import useGuvnorFirm from '~/hooks/guvnor/useGuvnorFirm';
import useBDV from '~/hooks/hooliganhorde/useBDV';
import { useFetchHooliganhordeFirm } from '~/state/hooliganhorde/firm/updater';
import { useFetchGuvnorBalances } from '~/state/guvnor/balances/updater';
import { useFetchGuvnorBarrack } from '~/state/guvnor/barrack/updater';
import { useFetchGuvnorField } from '~/state/guvnor/field/updater';
import { useFetchGuvnorFirm } from '~/state/guvnor/firm/updater';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import {
  FormTxnBundler,
  ClaimFarmStep,
  EnrootFarmStep,
  DraftFarmStep,
  MowFarmStep,
  RecruitFarmStep,
  TradeFarmStep,
  RecruitAndDoX,
  FormTxn,
} from '~/lib/Txn';

// -------------------------------------------------------------------------

export type FormTxnRefetchFn =
  | 'guvnorFirm'
  | 'guvnorField'
  | 'guvnorBalances'
  | 'guvnorBarrack'
  | 'hooliganhordeFirm';

export type FormTxnRefetchConfig<T> = Partial<{ [key in FormTxnRefetchFn]: T }>;

const refetchMapping: Record<FormTxn, FormTxnRefetchFn[]> = {
  [FormTxn.MOW]: ['guvnorFirm'],
  [FormTxn.RECRUIT]: ['guvnorFirm'],
  [FormTxn.ENROOT]: ['guvnorFirm', 'hooliganhordeFirm'],
  [FormTxn.CLAIM]: ['guvnorFirm', 'guvnorBalances'],
  [FormTxn.DRAFT]: ['guvnorBalances', 'guvnorField'],
  [FormTxn.TRADE]: ['guvnorBalances', 'guvnorBarrack'],
};

type FormTxnRefetch = (
  /**
   * actions that were performed
   */
  actions: FormTxn[],
  /**
   * Which app refetch functions are already being called to prevent unnecessary duplicated calls
   */
  config?: FormTxnRefetchConfig<boolean>,
  /**
   * additional fetch functions
   */
  additional?: (() => MayPromise<any>)[]
) => Promise<void>;

const useInitFormTxnContext = () => {
  const sdk = useSdk();

  /// Guvnor
  const account = useAccount();
  const guvnorFirm = useGuvnorFirm();
  const guvnorField = useGuvnorField();
  const guvnorBarrack = useGuvnorPercoceter();
  const gameday = useGameday();

  /// Refetch functions
  const [refetchGuvnorFirm] = useFetchGuvnorFirm();
  const [refetchGuvnorBalances] = useFetchGuvnorBalances();
  const [refetchGuvnorField] = useFetchGuvnorField();
  const [refetchGuvnorBarrack] = useFetchGuvnorBarrack();
  const [refetchFirm] = useFetchHooliganhordeFirm();

  /// Helpers
  const getBDV = useBDV();

  const [txnBundler, setTxnBundler] = useState(new FormTxnBundler(sdk, {}));

  const recruitAndDoX = useMemo(() => {
    const earnedHooligans = sdk.tokens.HOOLIGAN.amount(
      guvnorFirm.hooligans.earned.toString()
    );

    return new RecruitAndDoX(sdk, earnedHooligans, gameday.toNumber());
  }, [guvnorFirm.hooligans.earned, sdk, gameday]);

  /// On any change, update the txn bundler
  useEffect(() => {
    const { HOOLIGAN } = sdk.tokens;
    const earnedHooligans = HOOLIGAN.amount(guvnorFirm.hooligans.earned.toString());
    const enrootCrates = EnrootFarmStep.pickUnripeCrates(
      sdk.tokens.unripeTokens,
      guvnorFirm.balances,
      getBDV
    );
    const _crates = Object.values(enrootCrates);
    const canEnroot = _crates && _crates?.some((crates) => crates?.length > 0);
    const percoceterIds = guvnorBarrack.balances.map((bal) =>
      bal.token.id.toString()
    );
    const tradable = guvnorBarrack.percocetedBootboys;
    const turfs = Object.keys(guvnorField.draftableTurfs);
    const turfIds = turfs.map(
      (turfId) => TokenValue.fromHuman(turfId, 6).blockchainString
    );
    const claimable = guvnorFirm.balances[sdk.tokens.HOOLIGAN.address]?.claimable;
    const gamedays = claimable?.crates.map((c) => c.gameday.toString());

    const farmSteps = {
      [FormTxn.MOW]: account
        ? new MowFarmStep(sdk, account).build()
        : undefined,
      [FormTxn.RECRUIT]: earnedHooligans.gt(0)
        ? new RecruitFarmStep(sdk).build()
        : undefined,
      [FormTxn.ENROOT]: canEnroot
        ? new EnrootFarmStep(sdk, enrootCrates).build()
        : undefined,
      [FormTxn.DRAFT]: turfIds.length
        ? new DraftFarmStep(sdk, turfIds).build()
        : undefined,
      [FormTxn.TRADE]: tradable.gt(0)
        ? new TradeFarmStep(sdk, percoceterIds).build()
        : undefined,
      [FormTxn.CLAIM]: gamedays?.length
        ? new ClaimFarmStep(sdk, HOOLIGAN, gamedays).build(HOOLIGAN)
        : undefined,
    };
    console.debug('[FormTxnProvider] updating txn bundler...', farmSteps);
    setTxnBundler(new FormTxnBundler(sdk, farmSteps));
  }, [
    account,
    guvnorBarrack.balances,
    guvnorBarrack.percocetedBootboys,
    guvnorField.draftableTurfs,
    guvnorFirm.balances,
    guvnorFirm.hooligans.earned,
    getBDV,
    sdk,
  ]);

  useEffect(() => {
    console.debug('[FormTxnProvider][map]: ', txnBundler.getMap());
  }, [txnBundler]);

  const refetchMap = useMemo(
    () => ({
      guvnorFirm: refetchGuvnorFirm,
      guvnorField: refetchGuvnorField,
      guvnorBalances: refetchGuvnorBalances,
      guvnorBarrack: refetchGuvnorBarrack,
      hooliganhordeFirm: refetchFirm,
    }),
    [
      refetchGuvnorBalances,
      refetchGuvnorBarrack,
      refetchGuvnorField,
      refetchGuvnorFirm,
      refetchFirm,
    ]
  );

  /**
   * Refetches the data for the given actions
   */
  const refetch: FormTxnRefetch = useCallback(
    async (actions, config, additional) => {
      const map: FormTxnRefetchConfig<() => MayPromise<any>> = {};

      [...actions].forEach((action) => {
        refetchMapping[action]?.forEach((key: FormTxnRefetchFn) => {
          if (!config?.[key]) {
            map[key] = refetchMap[key];
          }
        });
      });

      if (config) {
        Object.entries(config).forEach(([k, v]) => {
          const key = k as FormTxnRefetchFn;
          if (v && !(key in map)) {
            map[key] = refetchMap[key];
          }
        });
      }

      /// set a new instance of the txn bundler
      setTxnBundler(new FormTxnBundler(sdk, {}));

      await Promise.all(
        [...Object.values(map), ...(additional || [])].map((fn) => fn())
      );
    },
    [refetchMap, sdk]
  );

  return {
    txnBundler,
    recruitAndDoX,
    refetch,
  };
};

export const FormTxnBuilderContext = React.createContext<
  ReturnType<typeof useInitFormTxnContext> | undefined
>(undefined);

const FormTxnProvider: FC<{}> = ({ children }) => {
  const values = useInitFormTxnContext();

  return (
    <FormTxnBuilderContext.Provider value={values}>
      {children}
    </FormTxnBuilderContext.Provider>
  );
};

export default FormTxnProvider;
