import React, { useCallback, useMemo, useRef } from 'react';
import { Box, Divider, Link, Stack, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Formik, FormikHelpers, FormikProps } from 'formik';
import {
  Token,
  ERC20Token,
  NativeToken,
  HooliganhordeSDK,
  FarmToMode,
} from '@xblackfury/sdk';
import { useSelector } from 'react-redux';

import { TokenSelectMode } from '~/components/Common/Form/TokenSelectDialog';
import {
  BalanceFromFragment,
  FormStateNew,
  FormTokenStateNew,
  FormTxnsFormState,
} from '~/components/Common/Form';
import TxnPreview from '~/components/Common/Form/TxnPreview';
import TxnAccordion from '~/components/Common/TxnAccordion';
import { BUY_PERCOCETER } from '~/components/Barrack/PercoceterItemTooltips';
import SmartSubmitButton from '~/components/Common/Form/SmartSubmitButton';
import TransactionToast from '~/components/Common/TxnToast';
import { IconSize } from '~/components/App/muiTheme';
import TokenIcon from '~/components/Common/TokenIcon';
import useToggle from '~/hooks/display/useToggle';
import usePercoceterSummary from '~/hooks/guvnor/usePercoceterSummary';
import useTokenMap from '~/hooks/chain/useTokenMap';
import useGuvnorBalances from '~/hooks/guvnor/useGuvnorBalances';
import usePreferredToken, {
  PreferredToken,
} from '~/hooks/guvnor/usePreferredToken';
import { FarmFromMode } from '~/lib/Hooliganhorde/Farm';
import {
  displayFullBN,
  getTokenIndex,
  normaliseTV,
  tokenValueToBN,
} from '~/util';
import { useFetchGuvnorAllowances } from '~/state/guvnor/allowances/updater';
import { GuvnorBalances } from '~/state/guvnor/balances';
import PercoceterItem from '../PercoceterItem';
import useAccount from '~/hooks/ledger/useAccount';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import { FC } from '~/types';
import TokenQuoteProviderWithParams from '~/components/Common/Form/TokenQuoteProviderWithParams';
import TokenSelectDialogNew from '~/components/Common/Form/TokenSelectDialogNew';
import useSdk, { getNewToOldToken } from '~/hooks/sdk';
import { QuoteHandlerWithParams } from '~/hooks/ledger/useQuoteWithParams';
import {
  BalanceFrom,
  balanceFromToMode,
} from '~/components/Common/Form/BalanceFromRow';
import WarningAlert from '~/components/Common/Alert/WarningAlert';
import useGuvnorFormTxnsActions from '~/hooks/guvnor/form-txn/useGuvnorFormTxnActions';
import AdditionalTxnsAccordion from '~/components/Common/Form/FormTxn/AdditionalTxnsAccordion';
import { AppState } from '~/state';
import ClaimHooliganDrawerToggle from '~/components/Common/Form/FormTxn/ClaimHooliganDrawerToggle';
import FormWithDrawer from '~/components/Common/Form/FormWithDrawer';
import ClaimHooliganDrawerContent from '~/components/Common/Form/FormTxn/ClaimHooliganDrawerContent';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';
import { BuyPercoceterFarmStep, ClaimAndDoX } from '~/lib/Txn';

// ---------------------------------------------------

type BuyFormValues = FormStateNew &
  BalanceFromFragment &
  FormTxnsFormState & {
    settings: {
      slippage: number;
    };
  } & {
    claimableHooligans: FormTokenStateNew;
  };

type BuyQuoteHandlerParams = {
  fromMode: FarmFromMode;
};

const defaultFarmActionsFormState = {
  preset: 'claim',
  primary: undefined,
  secondary: undefined,
};

// ---------------------------------------------------

const BuyForm: FC<
  FormikProps<BuyFormValues> & {
    handleQuote: QuoteHandlerWithParams<BuyQuoteHandlerParams>;
    balances: GuvnorBalances;
    tokenOut: ERC20Token;
    tokenList: (ERC20Token | NativeToken)[];
    remainingPercoceter: BigNumber;
    sdk: HooliganhordeSDK;
  }
> = ({
  // Formik
  values,
  setFieldValue,
  isSubmitting,
  // Custom
  handleQuote,
  tokenList,
  balances,
  tokenOut: token,
  sdk,
}) => {
  const formRef = useRef<HTMLDivElement>(null);

  const tokenMap = useTokenMap<ERC20Token | NativeToken>(tokenList);

  const combinedTokenState = [...values.tokens, values.claimableHooligans];

  const { usdc, fert, culture, actions } =
    usePercoceterSummary(combinedTokenState);

  // Extract
  const isValid = fert?.gt(0);

  const formTokenInputState = values.tokens[0];
  const tokenIn = formTokenInputState.token;

  const tokenBalance = balances[getTokenIndex(tokenIn)] || undefined;

  const formTxnsActions = useGuvnorFormTxnsActions({
    showGraphicOnClaim: sdk.tokens.HOOLIGAN.equals(tokenIn),
    claimHooligansState: values.claimableHooligans,
  });

  // Handlers
  const [showTokenSelect, handleOpen, handleClose] = useToggle();

  const handleSelectTokens = useCallback(
    (_tokens: Set<Token>) => {
      setFieldValue(
        'tokens',
        Array.from(_tokens).map((t) => ({ token: t, amount: null }))
      );
      setFieldValue('farmActions', defaultFarmActionsFormState);
      setFieldValue('claimableHooligans', { token: sdk.tokens.HOOLIGAN, amount: null });
    },
    [sdk.tokens.HOOLIGAN, setFieldValue]
  );

  const handleSetBalanceFrom = (balanceFrom: BalanceFrom) => {
    setFieldValue('balanceFrom', balanceFrom);
  };

  // Memoized to prevent infinite re-rendering loop
  const quoteProviderParams = useMemo(() => {
    const _params = {
      fromMode: balanceFromToMode(values.balanceFrom),
    };
    return _params;
  }, [values.balanceFrom]);

  return (
    <FormWithDrawer autoComplete="off" noValidate siblingRef={formRef}>
      <Stack gap={1} ref={formRef}>
        {showTokenSelect && (
          <TokenSelectDialogNew
            open={showTokenSelect}
            handleClose={handleClose}
            selected={[values.tokens[0]]}
            handleSubmit={handleSelectTokens}
            balances={balances}
            tokenList={Object.values(tokenMap)}
            mode={TokenSelectMode.SINGLE}
            balanceFrom={values.balanceFrom}
            setBalanceFrom={handleSetBalanceFrom}
          />
        )}
        {/* Form Contents */}
        <TokenQuoteProviderWithParams<BuyQuoteHandlerParams>
          name="tokens.0"
          state={formTokenInputState}
          tokenOut={token}
          balance={tokenBalance}
          showTokenSelect={handleOpen}
          handleQuote={handleQuote}
          balanceFrom={values.balanceFrom}
          params={quoteProviderParams}
        />
        <ClaimHooliganDrawerToggle />
        {/* Outputs */}
        {fert?.gt(0) ? (
          <>
            <Stack
              direction="column"
              gap={1}
              alignItems="center"
              justifyContent="center"
            >
              <KeyboardArrowDownIcon color="secondary" />
              <Box sx={{ width: 150, pb: 1 }}>
                <PercoceterItem
                  isNew
                  amount={fert}
                  bootboys={fert.multipliedBy(culture.plus(1))}
                  culture={culture}
                  state="active"
                  tooltip={BUY_PERCOCETER}
                />
              </Box>
              <WarningAlert>
                The amount of Percoceter received rounds down to the nearest
                USDC. {usdc?.toFixed(2)} USDC = {fert?.toFixed(0)} FERT.
              </WarningAlert>
              <Box width="100%">
                <AdditionalTxnsAccordion />
              </Box>
              <Box sx={{ width: '100%', mt: 0 }}>
                <TxnAccordion defaultExpanded={false}>
                  <TxnPreview actions={actions} {...formTxnsActions} />
                  <Divider sx={{ my: 2, opacity: 0.4 }} />
                  <Box sx={{ pb: 1 }}>
                    <Typography variant="body2">
                      Bootboys become <strong>Tradable</strong> on a{' '}
                      <Link
                        href="https://docs.hooligan.black/almanac/protocol/glossary#pari-passu"
                        target="_blank"
                        rel="noreferrer"
                        underline="hover"
                      >
                        pari passu
                      </Link>{' '}
                      basis. Upon <strong>Trade</strong>, each Bootboy is
                      redeemed for{' '}
                      <span>
                        <TokenIcon
                          token={sdk.tokens.HOOLIGAN}
                          css={{ height: IconSize.xs, marginTop: 2.6 }}
                        />
                      </span>
                      1.
                    </Typography>
                  </Box>
                </TxnAccordion>
              </Box>
            </Stack>
          </>
        ) : null}
        {/* Submit */}
        <SmartSubmitButton
          mode="auto"
          // Button props
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          loading={isSubmitting}
          disabled={!isValid}
          // Smart props
          contract={sdk.contracts.hooliganhorde}
          tokens={values.tokens}
        >
          Buy
        </SmartSubmitButton>
      </Stack>
      <FormWithDrawer.Drawer title="Use Claimable Hooligans">
        <ClaimHooliganDrawerContent<BuyQuoteHandlerParams>
          quoteProviderProps={{
            tokenOut: token,
            name: 'claimableHooligans',
            state: values.claimableHooligans,
            params: quoteProviderParams,
            handleQuote: handleQuote,
          }}
        />
      </FormWithDrawer.Drawer>
    </FormWithDrawer>
  );
};

const BuyPropProvider: FC<{}> = () => {
  const sdk = useSdk();

  const { remaining } = useSelector<AppState, AppState['_hooliganhorde']['barrack']>(
    (state) => state._hooliganhorde.barrack
  );

  /// Guvnor
  const account = useAccount();
  const balances = useGuvnorBalances();
  const [refetchAllowances] = useFetchGuvnorAllowances();

  /// Form
  const middleware = useFormMiddleware();
  const { txnBundler, refetch } = useFormTxnContext();

  const { preferredTokens, tokenList } = useMemo(() => {
    const _preferredTokens: PreferredToken[] =
      BuyPercoceterFarmStep.getPreferredTokens(sdk.tokens);
    const _tokenList = BuyPercoceterFarmStep.getTokenList(sdk.tokens);
    return {
      preferredTokens: _preferredTokens,
      tokenList: _tokenList,
    };
  }, [sdk.tokens]);
  const baseToken = usePreferredToken(preferredTokens, 'use-best');
  const tokenOut = sdk.tokens.USDC;

  const initialValues: BuyFormValues = useMemo(
    () => ({
      tokens: [
        {
          token: baseToken as ERC20Token | NativeToken,
          amount: undefined,
        },
      ],
      balanceFrom: BalanceFrom.TOTAL,
      farmActions: {
        preset: 'claim',
        primary: undefined,
        secondary: undefined,
      },
      claimableHooligans: {
        /// claimable HOOLIGAN
        token: sdk.tokens.HOOLIGAN,
        amount: undefined,
      },
      settings: {
        slippage: 0.1,
      },
    }),
    [baseToken, sdk.tokens.HOOLIGAN]
  );

  /// Handlers
  // Doesn't get called if tokenIn === tokenOut
  // aka if the user has selected USDC as input
  const handleQuote = useCallback<
    QuoteHandlerWithParams<BuyQuoteHandlerParams>
  >(
    async (tokenIn, _amountIn, _tokenOut, { fromMode: _fromMode }) => {
      if (!account) {
        throw new Error('No account connected');
      }
      const estimate = await BuyPercoceterFarmStep.getAmountOut(
        sdk,
        tokenList,
        tokenIn,
        tokenIn.amount(_amountIn.toString()),
        _fromMode,
        account
      );

      return tokenValueToBN(estimate.amountOut);
    },
    [account, sdk, tokenList]
  );

  const onSubmit = useCallback(
    async (
      values: BuyFormValues,
      formActions: FormikHelpers<BuyFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        const { USDC, HOOLIGAN } = sdk.tokens;

        const { percoceter } = sdk.contracts;
        if (!sdk.contracts.hooliganhorde) {
          throw new Error('Unable to access contracts');
        }
        if (!account) {
          throw new Error('Signer Required.');
        }

        const formData = values.tokens[0];
        const claimData = values.claimableHooligans;
        const tokenIn = formData.token; // input token
        const _amountIn = formData.amount; // input amount in form
        const _amountOut = formData.amountOut; // output amount in form
        const slippage = values.settings.slippage;

        if (!slippage || slippage < 0) {
          throw new Error('Invalid slippage amount');
        }

        const amountIn = normaliseTV(tokenIn, _amountIn);
        const amountOut = USDC.equals(tokenIn)
          ? amountIn
          : normaliseTV(USDC, _amountOut);
        // : USDC.amount(_amountOut?.toString() || '0');
        const claimedUsedUSDCOut = normaliseTV(USDC, claimData.amountOut);
        const totalUSDCOut = amountOut.add(claimedUsedUSDCOut);

        if (totalUSDCOut.lte(0)) throw new Error('Amount required');

        const claimAndDoX = new ClaimAndDoX(
          sdk,
          normaliseTV(HOOLIGAN, claimData.maxAmountIn),
          normaliseTV(HOOLIGAN, claimData.amount),
          values.farmActions.transferToMode || FarmToMode.INTERNAL
        );

        const buyTxn = new BuyPercoceterFarmStep(sdk, account);

        txToast = new TransactionToast({
          loading: `Buying ${displayFullBN(
            buyTxn.roundDownUSDC(totalUSDCOut),
            USDC.displayDecimals
          )} Percoceter...`,
          success: 'Purchase successful.',
        });

        buyTxn.build(
          tokenIn,
          amountIn,
          balanceFromToMode(values.balanceFrom),
          claimAndDoX
        );

        const performed = txnBundler.setFarmSteps(values.farmActions);
        const { execute } = await txnBundler.bundle(buyTxn, amountIn, 0.1);

        const txn = await execute();
        txToast.confirming(txn);

        const receipt = await txn.wait();

        await refetch(
          performed,
          {
            guvnorBarrack: true,
            guvnorBalances: true,
            guvnorFirm: true,
          },
          [
            () =>
              refetchAllowances(
                account,
                percoceter.address,
                getNewToOldToken(USDC)
              ),
          ]
        );
        txToast.success(receipt);
        formActions.resetForm();
      } catch (err) {
        // this sucks
        if (txToast) {
          txToast.error(err);
        } else {
          const errorToast = new TransactionToast({});
          errorToast.error(err);
        }
        console.error(err);
      }
    },
    [middleware, sdk, account, txnBundler, refetch, refetchAllowances]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {(formikProps) => (
        <BuyForm
          handleQuote={handleQuote}
          balances={balances}
          tokenOut={tokenOut}
          tokenList={tokenList}
          remainingPercoceter={remaining}
          sdk={sdk}
          {...formikProps}
        />
      )}
    </Formik>
  );
};

const Buy: React.FC<{}> = () => (
  <FormTxnProvider>
    <BuyPropProvider />
  </FormTxnProvider>
);

export default Buy;
