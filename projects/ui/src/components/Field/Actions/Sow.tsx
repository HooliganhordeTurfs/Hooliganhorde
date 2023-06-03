import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ERC20Token,
  FarmFromMode,
  FarmToMode,
  NativeToken,
  Token,
  TokenValue,
} from '@xblackfury/sdk';
import { Box, Divider, Link, Stack, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { Formik, FormikHelpers, FormikProps } from 'formik';
import { useSelector } from 'react-redux';
import { IconSize } from '~/components/App/muiTheme';
import WarningAlert from '~/components/Common/Alert/WarningAlert';
import {
  BalanceFromFragment,
  FormStateNew,
  FormTokenStateNew,
  FormTxnsFormState,
  SettingInput,
  SlippageSettingsFragment,
  SmartSubmitButton,
  TxnPreview,
  TxnSeparator,
  TxnSettings,
} from '~/components/Common/Form';
import {
  BalanceFrom,
  balanceFromToMode,
} from '~/components/Common/Form/BalanceFromRow';
import ClaimHooliganDrawerToggle from '~/components/Common/Form/FormTxn/ClaimHooliganDrawerToggle';
import AdditionalTxnsAccordion from '~/components/Common/Form/FormTxn/AdditionalTxnsAccordion';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import TokenQuoteProviderWithParams from '~/components/Common/Form/TokenQuoteProviderWithParams';
import { TokenSelectMode } from '~/components/Common/Form/TokenSelectDialog';
import TokenSelectDialogNew from '~/components/Common/Form/TokenSelectDialogNew';
import TokenIcon from '~/components/Common/TokenIcon';
import TxnAccordion from '~/components/Common/TxnAccordion';
import TransactionToast from '~/components/Common/TxnToast';
import { ZERO_BN } from '~/constants';
import usePrice from '~/hooks/hooliganhorde/usePrice';
import useTokenMap from '~/hooks/chain/useTokenMap';
import useToggle from '~/hooks/display/useToggle';
import useGuvnorFormTxnsActions from '~/hooks/guvnor/form-txn/useGuvnorFormTxnActions';
import useGuvnorBalances from '~/hooks/guvnor/useGuvnorBalances';
import usePreferredToken from '~/hooks/guvnor/usePreferredToken';
import useAccount from '~/hooks/ledger/useAccount';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import { QuoteHandlerWithParams } from '~/hooks/ledger/useQuoteWithParams';
import useSdk, { getNewToOldToken } from '~/hooks/sdk';
import { AppState } from '~/state';
import { useFetchPools } from '~/state/hooligan/pools/updater';
import { useFetchHooliganhordeField } from '~/state/hooliganhorde/field/updater';
import { FC } from '~/types';
import {
  MinBN,
  displayBN,
  displayFullBN,
  normaliseTV,
  tokenValueToBN,
} from '~/util';
import { ActionType } from '~/util/Actions';
import FormWithDrawer from '~/components/Common/Form/FormWithDrawer';
import ClaimHooliganDrawerContent from '~/components/Common/Form/FormTxn/ClaimHooliganDrawerContent';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';
import { ClaimAndDoX, SowFarmStep } from '~/lib/Txn';
import useIntensity from '~/hooks/hooliganhorde/useIntensity';

type SowFormValues = FormStateNew & {
  settings: SlippageSettingsFragment & {
    minIntensity: BigNumber | undefined;
  };
} & FormTxnsFormState &
  BalanceFromFragment & {
    claimableHooligans: FormTokenStateNew;
  };

type SowFormQuoteParams = {
  fromMode: FarmFromMode;
};

const defaultFarmActionsFormState = {
  preset: 'claim',
  primary: undefined,
  secondary: undefined,
};

const SowForm: FC<
  FormikProps<SowFormValues> & {
    handleQuote: QuoteHandlerWithParams<SowFormQuoteParams>;
    balances: ReturnType<typeof useGuvnorBalances>;
    intensity: BigNumber;
    rage: BigNumber;
    tokenList: (ERC20Token | NativeToken)[];
    hooliganhordeField: AppState['_hooliganhorde']['field'];
    // formRef: React.MutableRefObject<HTMLDivElement | null>;
  }
> = ({
  // Formik
  values,
  isSubmitting,
  setFieldValue,
  //
  hooliganhordeField,
  balances,
  intensity,
  rage,
  tokenList,
  handleQuote,
}) => {
  const sdk = useSdk();
  const account = useAccount();
  const [isTokenSelectVisible, showTokenSelect, hideTokenSelect] = useToggle();
  const formRef = useRef<HTMLDivElement | null>(null);

  /// Chain
  const Hooligan = sdk.tokens.HOOLIGAN;
  const erc20TokenMap = useTokenMap<ERC20Token | NativeToken>(tokenList);

  ///
  const hooliganPrice = usePrice();

  /// Derived
  const tokenIn = values.tokens[0].token; // converting from token
  const amountIn = values.tokens[0].amount; // amount of from token
  const amountOut = values.tokens[0].amountOut; // amount of to token
  const maxAmountIn = values.tokens[0].maxAmountIn;
  const tokenInBalance =
    balances[tokenIn.symbol === 'ETH' ? 'eth' : tokenIn.address];
  const claimedHooligansUsed = values.claimableHooligans.amount;

  /// Calculations
  const hasRage = rage.gt(0);
  const hooligans = Hooligan.equals(tokenIn)
    ? amountIn || ZERO_BN
    : amountOut || ZERO_BN;
  const totalHooligansAmount = hooligans.plus(claimedHooligansUsed || ZERO_BN);
  const isSubmittable = hasRage && totalHooligansAmount?.gt(0);
  const numCasuals = totalHooligansAmount.multipliedBy(intensity.div(100).plus(1));
  const casualLineLength = hooliganhordeField.casualIndex.minus(
    hooliganhordeField.draftableIndex
  );
  const maxAmountUsed = maxAmountIn ? totalHooligansAmount.div(maxAmountIn) : null;

  const txnActions = useGuvnorFormTxnsActions({
    showGraphicOnClaim: Hooligan.equals(tokenIn),
    claimHooligansState: values.claimableHooligans,
  });

  const handleSetBalanceFrom = useCallback(
    (_balanceFrom: BalanceFrom) => {
      setFieldValue('balanceFrom', _balanceFrom);
    },
    [setFieldValue]
  );

  /// Token select
  const handleSelectTokens = useCallback(
    (_tokens: Set<Token>) => {
      // If the user has typed some existing values in,
      // save them. Add new tokens to the end of the list.
      // FIXME: match sorting of erc20TokenList
      const copy = new Set(_tokens);
      const newValue = values.tokens.filter((x) => {
        copy.delete(x.token);
        return _tokens.has(x.token);
      });
      setFieldValue('tokens', [
        ...Array.from(copy).map((_token) => ({
          token: _token,
          amount: undefined,
        })),
        ...newValue,
      ]);
      setFieldValue('farmActions', defaultFarmActionsFormState);
      setFieldValue('claimableHooligans', {
        token: Hooligan,
        amount: null,
      });
    },
    [values.tokens, setFieldValue, Hooligan]
  );

  /// FIXME: standardized `maxAmountIn` approach?
  /// When `tokenIn` or `tokenOut` changes, refresh the
  /// max amount that the user can input of `tokenIn`.
  useEffect(() => {
    (async () => {
      console.debug('[Sow][finding max for token]...');
      if (!account) {
        console.debug(
          '[Sow][get maxAmountIn]: Execution reverted. Signer required'
        );
        return;
      }
      if (!rage.gt(0)) return;
      const isSupportedToken = Boolean(
        tokenList.find((tk) => tokenIn.address === tk.address)
      );
      if (!isSupportedToken) {
        setFieldValue('tokens.0.maxAmountIn', ZERO_BN);
        throw new Error(`Unsupported tokenIn: ${tokenIn.symbol}`);
      }

      const max = await SowFarmStep.getMaxForToken(
        sdk,
        tokenIn,
        account,
        FarmFromMode.EXTERNAL,
        sdk.tokens.HOOLIGAN.amount(rage.toString() || '0')
      );

      setFieldValue('tokens.0.maxAmountIn', tokenValueToBN(max));
    })();
  }, [account, sdk, setFieldValue, rage, tokenIn, tokenList]);

  const quoteHandlerParams = useMemo(
    () => ({
      fromMode: balanceFromToMode(values.balanceFrom),
    }),
    [values.balanceFrom]
  );

  const useClaimedQuoteParams = useMemo(
    () => ({
      fromMode: FarmFromMode.INTERNAL_TOLERANT,
    }),
    []
  );

  return (
    <FormWithDrawer autoComplete="off" siblingRef={formRef}>
      <TokenSelectDialogNew
        open={isTokenSelectVisible}
        handleClose={hideTokenSelect}
        handleSubmit={handleSelectTokens}
        selected={values.tokens}
        balances={balances}
        tokenList={Object.values(erc20TokenMap)}
        mode={TokenSelectMode.SINGLE}
        balanceFrom={values.balanceFrom}
        setBalanceFrom={handleSetBalanceFrom}
      />
      <Stack gap={1} ref={formRef}>
        {/* Input Field */}
        <TokenQuoteProviderWithParams<SowFormQuoteParams>
          key="tokens.0"
          name="tokens.0"
          tokenOut={Hooligan}
          disabled={!hasRage || !maxAmountIn}
          max={MinBN(
            maxAmountIn || ZERO_BN,
            tokenInBalance?.[values.balanceFrom] || ZERO_BN
          )}
          balance={tokenInBalance || undefined}
          state={values.tokens[0]}
          showTokenSelect={showTokenSelect}
          handleQuote={handleQuote}
          params={quoteHandlerParams}
          balanceFrom={values.balanceFrom}
          disableTokenSelect={!hasRage || !maxAmountIn}
        />
        {hasRage && <ClaimHooliganDrawerToggle />}
        {!hasRage ? (
          <Box>
            <WarningAlert sx={{ color: 'black' }}>
              There is currently no Rage.{' '}
              <Link
                href="https://docs.hooligan.black/almanac/farm/field#rage"
                target="_blank"
                rel="noreferrer"
              >
                Learn more
              </Link>
            </WarningAlert>
          </Box>
        ) : null}
        {isSubmittable ? (
          <>
            <TxnSeparator />
            <TokenOutput>
              <TokenOutput.Row
                token={sdk.tokens.CASUALS}
                amount={numCasuals}
                amountSuffix={` @ ${displayBN(casualLineLength)}`}
              />
            </TokenOutput>
            {maxAmountUsed && maxAmountUsed.gt(0.9) ? (
              <WarningAlert>
                If there is less Rage at the time of execution, this transaction
                will Sow Hooligans into the remaining Rage and send any unused Hooligans
                to your Farm Balance.
                {/* You are Sowing {displayFullBN(maxAmountUsed.times(100), 4, 0)}% of remaining Rage.  */}
              </WarningAlert>
            ) : null}
            <AdditionalTxnsAccordion />
            <Box>
              <TxnAccordion defaultExpanded={false}>
                <TxnPreview
                  actions={[
                    {
                      type: ActionType.BUY_HOOLIGANS,
                      hooliganAmount: totalHooligansAmount,
                      hooliganPrice: hooliganPrice,
                      token: getNewToOldToken(tokenIn),
                      tokenAmount: amountIn || ZERO_BN,
                    },
                    {
                      type: ActionType.BURN_HOOLIGANS,
                      amount: totalHooligansAmount,
                    },
                    {
                      type: ActionType.RECEIVE_CASUALS,
                      casualAmount: numCasuals,
                      placeInLine: casualLineLength,
                    },
                  ]}
                  {...txnActions}
                />
                <Divider sx={{ my: 2, opacity: 0.4 }} />
                <Box pb={1}>
                  <Typography variant="body2" alignItems="center">
                    Casuals become <strong>Draftable</strong> on a first in,
                    first out{' '}
                    <Link
                      href="https://docs.hooligan.black/almanac/protocol/glossary#fifo"
                      target="_blank"
                      rel="noreferrer"
                      underline="hover"
                    >
                      (FIFO)
                    </Link>{' '}
                    basis. Upon <strong>Draft</strong>, each Casual is redeemed
                    for{' '}
                    <span>
                      <TokenIcon
                        token={Hooligan}
                        css={{ height: IconSize.xs, marginTop: 2.6 }}
                      />
                    </span>
                    1.
                  </Typography>
                </Box>
              </TxnAccordion>
            </Box>
          </>
        ) : null}
        <SmartSubmitButton
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={!isSubmittable || isSubmitting}
          contract={sdk.contracts.hooliganhorde}
          tokens={values.tokens}
          mode="auto"
        >
          Sow
        </SmartSubmitButton>
      </Stack>
      <FormWithDrawer.Drawer title="Use Claimable Hooligans">
        <ClaimHooliganDrawerContent
          maxHooligans={rage}
          hooligansUsed={hooligans}
          quoteProviderProps={{
            tokenOut: Hooligan,
            name: 'claimableHooligans',
            state: values.claimableHooligans,
            params: useClaimedQuoteParams,
            handleQuote,
          }}
        />
      </FormWithDrawer.Drawer>
    </FormWithDrawer>
  );
};

// ---------------------------------------------------

const SowFormContainer: FC<{}> = () => {
  const sdk = useSdk();
  const account = useAccount();

  /// Hooliganhorde
  const hooliganhordeField = useSelector<AppState, AppState['_hooliganhorde']['field']>(
    (state) => state._hooliganhorde.field
  );
  const [{ current: intensity }] = useIntensity();
  // const intensity = hooliganhordeField.intensity.scaled;
  const rage = hooliganhordeField.rage;

  /// Guvnor
  const balances = useGuvnorBalances();

  const [refetchHooliganhordeField] = useFetchHooliganhordeField();
  const [refetchPools] = useFetchPools();

  /// Form
  const middleware = useFormMiddleware();
  const { txnBundler, refetch } = useFormTxnContext();

  const { preferredTokens, tokenList } = useMemo(() => {
    const tokens = SowFarmStep.getPreferredTokens(sdk.tokens);
    return {
      preferredTokens: tokens.preferred,
      tokenList: tokens.tokenList,
    };
  }, [sdk]);

  const baseToken = usePreferredToken(preferredTokens, 'use-best');
  const initialValues: SowFormValues = useMemo(
    () => ({
      settings: {
        slippage: 0.1, // 0.1%,
        minIntensity: undefined,
      },
      tokens: [
        {
          token: baseToken as ERC20Token | NativeToken,
          amount: undefined,
        },
        {
          // claimable HOOLIGANs
          token: sdk.tokens.HOOLIGAN,
          amount: undefined,
        },
      ],
      farmActions: {
        ...defaultFarmActionsFormState,
      },
      claimableHooligans: {
        token: sdk.tokens.HOOLIGAN,
        amount: undefined,
      },
      balanceFrom: BalanceFrom.TOTAL,
    }),
    [baseToken, sdk.tokens.HOOLIGAN]
  );

  /// Handlers
  // This handler does not run when _tokenIn = _tokenOut
  // _tokenOut === Hooligan
  const handleQuote = useCallback<QuoteHandlerWithParams<SowFormQuoteParams>>(
    async (_tokenIn, _amountIn, _tokenOut, { fromMode: _fromMode }) => {
      if (!account) {
        throw new Error('Signer Required');
      }

      const result = await SowFarmStep.getAmountOut(
        sdk,
        _tokenIn,
        normaliseTV(_tokenIn, _amountIn),
        _fromMode,
        account
      );

      return {
        amountOut: tokenValueToBN(result),
      };
    },
    [account, sdk]
  );

  const onSubmit = useCallback(
    async (
      values: SowFormValues,
      formActions: FormikHelpers<SowFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        const { HOOLIGAN: hooligan, CASUALS } = sdk.tokens;

        const formData = values.tokens[0];
        const claimData = values.claimableHooligans;
        const tokenIn = formData.token;
        const amountIn = normaliseTV(tokenIn, formData.amount);
        const amountHooligans = normaliseTV(
          hooligan,
          hooligan.equals(tokenIn) ? formData.amount : formData.amountOut
        );
        const claimedHooligansUsed = normaliseTV(hooligan, claimData.amount);
        const totalHooligans = amountHooligans.add(claimedHooligansUsed);

        if (totalHooligans.lte(0)) {
          throw new Error('No amount set');
        }
        if (!account) {
          throw new Error('Signer required');
        }

        if (!values.settings.slippage) {
          throw new Error('Slippage required');
        }

        const scaledTemp = TokenValue.fromHuman(intensity.toString(), 6);

        const _minTemp = TokenValue.fromHuman(
          (values.settings.minIntensity || ZERO_BN).toString(),
          6
        );
        const minIntensity = _minTemp.gt(scaledTemp) ? _minTemp : scaledTemp;
        const minRage = amountHooligans.mul(1 - values.settings.slippage / 100);

        const amountCasuals = totalHooligans.mul(minIntensity.div(100).add(1));

        txToast = new TransactionToast({
          loading: `Sowing ${displayFullBN(
            totalHooligans,
            hooligan.decimals
          )} Hooligans for ${displayFullBN(amountCasuals, CASUALS.decimals)} Casuals...`,
          success: 'Sow successful.',
        });

        const sowTxn = new SowFarmStep(sdk, account);
        const claimAndDoX = new ClaimAndDoX(
          sdk,
          normaliseTV(hooligan, claimData.maxAmountIn),
          normaliseTV(hooligan, claimData.amount),
          values.farmActions.transferToMode || FarmToMode.INTERNAL
        );

        sowTxn.build(
          tokenIn,
          amountIn,
          minIntensity,
          minRage,
          balanceFromToMode(values.balanceFrom),
          claimAndDoX
        );

        const performed = txnBundler.setFarmSteps(values.farmActions);

        const { execute } = await txnBundler.bundle(
          sowTxn,
          amountIn,
          values.settings.slippage
        );

        const txn = await execute();
        txToast.confirming(txn);

        const reciept = await txn.wait();
        await refetch(
          performed,
          {
            guvnorField: true,
            guvnorBalances: true,
          },
          [refetchHooliganhordeField, refetchPools]
        );

        txToast.success(reciept);
        formActions.resetForm();
      } catch (err) {
        console.error(err);
        if (txToast) {
          txToast.error(err);
        } else {
          const errorToast = new TransactionToast({});
          errorToast.error(err);
        }
      } finally {
        formActions.setSubmitting(false);
      }
    },
    [
      middleware,
      sdk,
      account,
      intensity,
      txnBundler,
      refetch,
      refetchHooliganhordeField,
      refetchPools,
    ]
  );

  return (
    <Formik<SowFormValues> initialValues={initialValues} onSubmit={onSubmit}>
      {(formikProps: FormikProps<SowFormValues>) => (
        <>
          <TxnSettings placement="form-top-right">
            <>
              <SettingInput
                name="settings.slippage"
                label="Slippage Tolerance"
                endAdornment="%"
              />
              <SettingInput
                name="settings.minIntensity"
                label="Min Intensity"
              />
            </>
          </TxnSettings>
          <SowForm
            hooliganhordeField={hooliganhordeField}
            handleQuote={handleQuote}
            balances={balances}
            intensity={intensity}
            rage={rage}
            tokenList={tokenList}
            {...formikProps}
          />
        </>
      )}
    </Formik>
  );
};

const Sow: React.FC<{}> = () => (
  <FormTxnProvider>
    <SowFormContainer />
  </FormTxnProvider>
);

export default Sow;
