import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import BigNumber from 'bignumber.js';
import {
  Token,
  ERC20Token,
  NativeToken,
  DataSource,
  HooliganhordeSDK,
} from '@xblackfury/sdk';
import {
  FormStateNew,
  FormTxnsFormState,
  SettingInput,
  SmartSubmitButton,
  TxnSettings,
} from '~/components/Common/Form';
import TxnPreview from '~/components/Common/Form/TxnPreview';
import TxnSeparator from '~/components/Common/Form/TxnSeparator';
import PillRow from '~/components/Common/Form/PillRow';
import { TokenSelectMode } from '~/components/Common/Form/TokenSelectDialog';
import { displayFullBN, MaxBN, MinBN } from '~/util/Tokens';
import { ZERO_BN } from '~/constants';
import useToggle from '~/hooks/display/useToggle';
import { tokenValueToBN, bnToTokenValue } from '~/util';
import { GuvnorFirm } from '~/state/guvnor/firm';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { convert } from '~/lib/Hooliganhorde/Firm/Convert';
import TransactionToast from '~/components/Common/TxnToast';
import useBDV from '~/hooks/hooliganhorde/useBDV';
import TokenIcon from '~/components/Common/TokenIcon';
import { useFetchPools } from '~/state/hooligan/pools/updater';
import { ActionType } from '~/util/Actions';
import useGuvnorFirm from '~/hooks/guvnor/useGuvnorFirm';
import { FC } from '~/types';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import TokenSelectDialogNew from '~/components/Common/Form/TokenSelectDialogNew';
import TokenQuoteProviderWithParams from '~/components/Common/Form/TokenQuoteProviderWithParams';
import useSdk, { getNewToOldToken } from '~/hooks/sdk';
import { QuoteHandlerWithParams } from '~/hooks/ledger/useQuoteWithParams';
import useAccount from '~/hooks/ledger/useAccount';
import WarningAlert from '~/components/Common/Alert/WarningAlert';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import TxnAccordion from '~/components/Common/TxnAccordion';

import useGuvnorDepositCrateFromRecruit from '~/hooks/guvnor/useGuvnorDepositCrateFromRecruit';
import AdditionalTxnsAccordion from '~/components/Common/Form/FormTxn/AdditionalTxnsAccordion';
import useGuvnorFormTxnsActions from '~/hooks/guvnor/form-txn/useGuvnorFormTxnActions';
import useAsyncMemo from '~/hooks/display/useAsyncMemo';
import AddRecruitTxnToggle from '~/components/Common/Form/FormTxn/AddRecruitTxnToggle';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';
import { FormTxn, ConvertFarmStep } from '~/lib/Txn';

// -----------------------------------------------------------------------

type ConvertFormValues = FormStateNew & {
  settings: {
    slippage: number;
  };
  maxAmountIn: BigNumber | undefined;
  tokenOut: Token | undefined;
} & FormTxnsFormState;

type ConvertQuoteHandlerParams = {
  slippage: number;
  isConvertingRecruited: boolean;
};

// -----------------------------------------------------------------------

const INIT_CONVERSION = {
  amount: ZERO_BN,
  bdv: ZERO_BN,
  horde: ZERO_BN,
  prospects: ZERO_BN,
  actions: [],
};

const ConvertForm: FC<
  FormikProps<ConvertFormValues> & {
    /** List of tokens that can be converted to. */
    tokenList: (ERC20Token | NativeToken)[];
    /** Guvnor's firm balances */
    firmBalances: GuvnorFirm['balances'];
    handleQuote: QuoteHandlerWithParams<ConvertQuoteHandlerParams>;
    currentGameday: BigNumber;
    /** other */
    sdk: HooliganhordeSDK;
  }
> = ({
  tokenList,
  firmBalances,
  handleQuote,
  currentGameday,
  sdk,
  // Formik
  values,
  isSubmitting,
  setFieldValue,
}) => {
  /// Local state
  const [isTokenSelectVisible, showTokenSelect, hideTokenSelect] = useToggle();
  const getBDV = useBDV();

  const { crate: recruitCrate } = useGuvnorDepositCrateFromRecruit();

  /// Extract values from form state
  const tokenIn = values.tokens[0].token; // converting from token
  const amountIn = values.tokens[0].amount; // amount of from token
  const tokenOut = values.tokenOut; // converting to token
  const amountOut = values.tokens[0].amountOut; // amount of to token
  const maxAmountIn = values.maxAmountIn;
  const canConvert = maxAmountIn?.gt(0) || false;
  const firmBalance = firmBalances[tokenIn.address]; // FIXME: this is mistyped, may not exist
  const depositedAmount = firmBalance?.deposited.amount || ZERO_BN;
  const isQuoting = values.tokens[0].quoting || false;
  const slippage = values.settings.slippage;

  const isUsingRecruited = Boolean(
    values.farmActions.primary?.includes(FormTxn.RECRUIT) &&
      sdk.tokens.HOOLIGAN.equals(tokenIn)
  );

  const totalAmountIn = isUsingRecruited
    ? (amountIn || ZERO_BN).plus(recruitCrate.asBN.amount)
    : amountIn;

  /// Derived form state
  let isReady = false;
  let buttonLoading = false;
  let buttonContent = 'Convert';
  let bdvOut; // the BDV received after re-depositing `amountOut` of `tokenOut`.
  // let bdvIn;
  let deltaBDV: BigNumber | undefined; // the change in BDV during the convert. should always be >= 0.
  let deltaHorde; // the change in Horde during the convert. should always be >= 0.
  let deltaProspectsPerBDV; // change in prospects per BDV for this pathway. ex: hooligan (2 prospects) -> hooligan:3crv (4 prospects) = +2 prospects.
  let deltaProspects; // the change in prospects during the convert.

  const txnActions = useGuvnorFormTxnsActions();

  ///
  const [conversion, setConversion] = useState(INIT_CONVERSION);
  const runConversion = useCallback(
    (_amountIn: BigNumber) => {
      if (!tokenOut) {
        setConversion(INIT_CONVERSION);
      } else if (tokenOut && !isQuoting) {
        console.debug(
          `[Convert] setting conversion. tokenOut: ${tokenOut.symbol} isQuoting: ${isQuoting}`
        );
        const crates = [...(firmBalance?.deposited.crates || [])]; // depositedCrates
        // only append the recruit deposit crate if FIRM:HOOLIGAN is being converted
        if (isUsingRecruited) {
          crates.push(recruitCrate.asBN);
        }

        setConversion(
          convert(
            getNewToOldToken(tokenIn), // from
            getNewToOldToken(tokenOut), // to
            _amountIn, // amount
            crates, // depositedCrates
            currentGameday
          )
        );
      }
    },
    [
      tokenOut,
      isQuoting,
      firmBalance?.deposited.crates,
      isUsingRecruited,
      tokenIn,
      currentGameday,
      recruitCrate.asBN,
    ]
  );

  /// FIXME: is there a better pattern for this?
  /// we want to refresh the conversion info only
  /// when the quoting is complete and amountOut
  /// has been updated respectively. if runConversion
  /// depends on amountIn it will run every time the user
  /// types something into the input.
  useEffect(() => {
    runConversion(totalAmountIn || ZERO_BN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountOut, runConversion]);

  /// Change button state and prepare outputs
  if (depositedAmount.eq(0)) {
    buttonContent = 'Nothing to Convert';
  } else if (values.maxAmountIn === null) {
    if (values.tokenOut) {
      buttonContent = 'Refreshing convert data...';
      buttonLoading = false;
    } else {
      buttonContent = 'No output selected';
      buttonLoading = false;
    }
  } else if (!canConvert) {
    // buttonContent = 'Pathway unavailable';
  } else {
    buttonContent = 'Convert';
    if (tokenOut && amountOut?.gt(0)) {
      isReady = true;
      bdvOut = getBDV(tokenOut).times(amountOut);
      deltaBDV = MaxBN(bdvOut.minus(conversion.bdv.abs()), ZERO_BN);
      deltaHorde = MaxBN(
        tokenValueToBN(tokenOut.getHorde(bnToTokenValue(tokenOut, deltaBDV))),
        ZERO_BN
      );
      deltaProspectsPerBDV = tokenOut
        .getProspects()
        .sub(tokenValueToBN(tokenIn.getProspects()).toNumber());
      deltaProspects = tokenValueToBN(
        tokenOut
          .getProspects(bnToTokenValue(tokenOut, bdvOut)) // prospects for depositing this token with new BDV
          .sub(bnToTokenValue(tokenOut, conversion.prospects.abs()))
      ); // prospects lost when converting
    }
  }

  /// When a new output token is selected, reset maxAmountIn.
  const handleSelectTokenOut = useCallback(
    async (_tokens: Set<Token>) => {
      const arr = Array.from(_tokens);
      if (arr.length !== 1) throw new Error();
      const _tokenOut = arr[0];
      /// only reset if the user clicked a different token
      if (tokenOut !== _tokenOut) {
        setFieldValue('tokenOut', _tokenOut);
        setFieldValue('maxAmountIn', null);
      }
    },
    [setFieldValue, tokenOut]
  );

  /// When `tokenIn` or `tokenOut` changes, refresh the
  /// max amount that the user can input of `tokenIn`.
  /// FIXME: flash when clicking convert tab
  useEffect(() => {
    (async () => {
      if (tokenOut) {
        if (!tokenOut) return;
        const maxAmount = await ConvertFarmStep.getMaxConvert(
          sdk,
          tokenIn,
          tokenOut
        );
        const _maxAmountIn = tokenValueToBN(maxAmount);
        setFieldValue('maxAmountIn', _maxAmountIn);

        const _maxAmountInStr = tokenIn.amount(_maxAmountIn.toString());
        console.debug('[Convert][maxAmountIn]: ', _maxAmountInStr);
      }
    })();
  }, [sdk, setFieldValue, tokenIn, tokenOut]);

  const quoteHandlerParams = useMemo(
    () => ({
      slippage: slippage,
      isConvertingRecruited: isUsingRecruited,
    }),
    [slippage, isUsingRecruited]
  );
  const maxAmountUsed =
    totalAmountIn && maxAmountIn ? totalAmountIn.div(maxAmountIn) : null;

  const disabledFormActions = useMemo(
    () => (tokenIn.isUnripe ? [FormTxn.ENROOT] : undefined),
    [tokenIn.isUnripe]
  );

  return (
    <Form noValidate autoComplete="off">
      <TokenSelectDialogNew
        open={isTokenSelectVisible}
        handleClose={hideTokenSelect}
        handleSubmit={handleSelectTokenOut}
        selected={values.tokens}
        tokenList={tokenList}
        mode={TokenSelectMode.SINGLE}
      />
      <Stack gap={1}>
        {/* Input token */}
        <TokenQuoteProviderWithParams
          name="tokens.0"
          tokenOut={(tokenOut || tokenIn) as ERC20Token}
          max={MinBN(values.maxAmountIn || ZERO_BN, depositedAmount)}
          balance={depositedAmount}
          balanceLabel="Deposited Balance"
          state={values.tokens[0]}
          handleQuote={handleQuote}
          displayQuote={(_amountOut) =>
            _amountOut &&
            deltaBDV && (
              <Typography variant="body1">
                ~{displayFullBN(conversion.bdv.abs(), 2)} BDV
              </Typography>
            )
          }
          tokenSelectLabel={tokenIn.symbol}
          disabled={
            !values.maxAmountIn || // still loading `maxAmountIn`
            values.maxAmountIn.eq(0) // = 0 means we can't make this conversion
          }
          params={quoteHandlerParams}
        />
        {!canConvert && tokenOut && maxAmountIn ? null : <AddRecruitTxnToggle />}
        {/* Output token */}
        {depositedAmount.gt(0) ? (
          <PillRow
            isOpen={isTokenSelectVisible}
            label="Convert to"
            onClick={showTokenSelect}
          >
            {tokenOut ? <TokenIcon token={tokenOut} /> : null}
            <Typography>{tokenOut?.symbol || 'Select token'}</Typography>
          </PillRow>
        ) : null}
        {/* Warning Alert */}
        {!canConvert && tokenOut && maxAmountIn ? (
          <Box>
            <WarningAlert iconSx={{ alignItems: 'flex-start' }}>
              {tokenIn.symbol} can only be Converted to {tokenOut?.symbol} when
              deltaB{' '}
              {tokenIn.isLP || tokenIn.symbol === 'urHOOLIGAN3CRV' ? '<' : '>'} 0.
              <br />
              {/* <Typography sx={{ opacity: 0.7 }} fontSize={FontSize.sm}>Press ⌥ + 1 to see deltaB.</Typography> */}
            </WarningAlert>
          </Box>
        ) : null}
        {totalAmountIn && tokenOut && maxAmountIn && amountOut?.gt(0) ? (
          <>
            <TxnSeparator mt={-1} />
            <TokenOutput>
              <TokenOutput.Row
                token={tokenOut}
                amount={amountOut || ZERO_BN}
                delta={bdvOut ? `~${displayFullBN(bdvOut, 2)} BDV` : undefined}
              />
              <TokenOutput.Row
                token={sdk.tokens.HORDE}
                amount={deltaHorde || ZERO_BN}
                amountTooltip={
                  deltaBDV?.gt(0) ? (
                    <>
                      Converting will increase the BDV of your Deposit by{' '}
                      {displayFullBN(deltaBDV || ZERO_BN, 6)}
                      {deltaBDV?.gt(0) ? ', resulting in a gain of Horde' : ''}.
                    </>
                  ) : (
                    <>
                      The BDV of your Deposit won&apos;t change with this
                      Convert.
                    </>
                  )
                }
              />
              <TokenOutput.Row
                token={sdk.tokens.PROSPECTS}
                amount={deltaProspects || ZERO_BN}
                amountTooltip={
                  <>
                    Converting from {tokenIn.symbol} to {tokenOut.symbol}{' '}
                    results in{' '}
                    {!deltaProspectsPerBDV || deltaProspectsPerBDV.eq(0)
                      ? 'no change in PROSPECTS per BDV'
                      : `a ${
                          deltaProspectsPerBDV.gt(0) ? 'gain' : 'loss'
                        } of ${deltaProspectsPerBDV.abs().toHuman()} Prospects per BDV`}
                    .
                  </>
                }
              />
            </TokenOutput>
            {maxAmountUsed && maxAmountUsed.gt(0.9) ? (
              <Box>
                <WarningAlert>
                  You are converting{' '}
                  {displayFullBN(maxAmountUsed.times(100), 4, 0)}% of the way to
                  the peg. When Converting all the way to the peg, the Convert
                  may fail due to a small amount of slippage in the direction of
                  the peg.
                </WarningAlert>
              </Box>
            ) : null}
            <AdditionalTxnsAccordion filter={disabledFormActions} />
            <Box>
              <TxnAccordion defaultExpanded={false}>
                <TxnPreview
                  actions={[
                    {
                      type: ActionType.BASE,
                      message: `Convert ${displayFullBN(
                        totalAmountIn,
                        tokenIn.displayDecimals
                      )} ${tokenIn.name} to ${displayFullBN(
                        amountOut,
                        tokenIn.displayDecimals
                      )} ${tokenOut.name}.`,
                    },
                    {
                      type: ActionType.UPDATE_FIRM_REWARDS,
                      horde: deltaHorde || ZERO_BN,
                      prospects: deltaProspects || ZERO_BN,
                    },
                  ]}
                  {...txnActions}
                />
              </TxnAccordion>
            </Box>
          </>
        ) : null}
        <SmartSubmitButton
          loading={buttonLoading || isQuoting}
          disabled={!isReady || isSubmitting}
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          tokens={[]}
          mode="auto"
        >
          {buttonContent}
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

// -----------------------------------------------------------------------

const ConvertPropProvider: FC<{
  fromToken: ERC20Token | NativeToken;
}> = ({ fromToken }) => {
  const sdk = useSdk();

  /// Token List
  const [tokenList, initialTokenOut] = useMemo(() => {
    const { path } = ConvertFarmStep.getConversionPath(sdk, fromToken);
    const _tokenList = [...path].filter((_token) => !_token.equals(fromToken));
    return [
      _tokenList, // all available tokens to convert to
      _tokenList[0], // tokenOut is the first available token that isn't the fromToken
    ];
  }, [sdk, fromToken]);

  /// Hooliganhorde
  const gameday = useGameday();
  const [refetchPools] = useFetchPools();

  /// Guvnor
  const guvnorFirm = useGuvnorFirm();
  const guvnorFirmBalances = guvnorFirm.balances;
  const account = useAccount();

  /// Temporary solution. Remove this when we move the site to use the new sdk types.
  const [guvnorBalances, refetchGuvnorBalances] = useAsyncMemo(async () => {
    if (!account) return undefined;
    console.debug(
      `[Convert] Fetching firm balances for FIRM:${fromToken.symbol}`
    );
    return sdk.firm.getBalance(fromToken, account, {
      source: DataSource.LEDGER,
    });
  }, [account, sdk]);

  /// Form
  const middleware = useFormMiddleware();
  const { txnBundler, recruitAndDoX, refetch } = useFormTxnContext();

  const initialValues: ConvertFormValues = useMemo(
    () => ({
      // Settings
      settings: {
        slippage: 0.1,
      },
      // Token Inputs
      tokens: [
        {
          token: fromToken,
          amount: undefined,
          quoting: false,
          amountOut: undefined,
        },
      ],
      // Convert data
      maxAmountIn: undefined,
      // Token Outputs
      tokenOut: initialTokenOut,
      farmActions: {
        preset: fromToken.isLP || fromToken.isUnripe ? 'noPrimary' : 'recruit',
        primary: undefined,
        secondary: undefined,
        implied: [FormTxn.MOW],
      },
    }),
    [fromToken, initialTokenOut]
  );

  /// Handlers
  // This handler does not run when _tokenIn = _tokenOut (direct deposit)
  const handleQuote = useCallback<
    QuoteHandlerWithParams<ConvertQuoteHandlerParams>
  >(
    async (tokenIn, _amountIn, tokenOut, { slippage, isConvertingRecruited }) => {
      try {
        if (!guvnorBalances?.deposited) {
          throw new Error('No balances found');
        }

        const result = await ConvertFarmStep._handleConversion(
          sdk,
          guvnorBalances.deposited.crates,
          tokenIn,
          tokenOut,
          tokenIn.amount(_amountIn.toString()),
          gameday.toNumber(),
          slippage,
          isConvertingRecruited ? recruitAndDoX : undefined
        );

        return tokenValueToBN(result.minAmountOut);
      } catch (e) {
        console.debug('[Convert/handleQuote]: FAILED: ', e);
        return new BigNumber('0');
      }
    },
    [guvnorBalances?.deposited, sdk, gameday, recruitAndDoX]
  );

  const onSubmit = useCallback(
    async (
      values: ConvertFormValues,
      formActions: FormikHelpers<ConvertFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();

        /// FormData
        const slippage = values?.settings?.slippage;
        const tokenIn = values.tokens[0].token;
        const tokenOut = values.tokenOut;
        const _amountIn = values.tokens[0].amount;

        /// Validation
        if (!account) throw new Error('Wallet connection required');
        if (!slippage) throw new Error('No slippage value set.');
        if (!_amountIn) throw new Error('No amount input');
        if (!tokenOut) throw new Error('Conversion pathway not set');
        if (!guvnorBalances) throw new Error('No balances found');

        txToast = new TransactionToast({
          loading: 'Converting...',
          success: 'Convert successful.',
        });

        const amountIn = tokenIn.amount(_amountIn.toString()); // amount of from token
        const isRecruiting = values.farmActions.primary?.includes(FormTxn.RECRUIT);

        const convertTxn = new ConvertFarmStep(
          sdk,
          tokenIn,
          gameday.toNumber(),
          guvnorBalances.deposited.crates
        );

        const { getEncoded, minAmountOut } = await convertTxn.handleConversion(
          amountIn,
          slippage,
          isRecruiting ? recruitAndDoX : undefined
        );

        convertTxn.build(getEncoded, minAmountOut);
        const actionsPerformed = txnBundler.setFarmSteps(values.farmActions);

        const { execute } = await txnBundler.bundle(
          convertTxn,
          amountIn,
          slippage
        );

        const txn = await execute();
        txToast.confirming(txn);

        const receipt = await txn.wait();

        await refetch(actionsPerformed, { guvnorFirm: true }, [
          refetchPools, // update prices to account for pool conversion
          refetchGuvnorBalances,
        ]);

        txToast.success(receipt);

        /// Reset the max Amount In
        const _maxAmountIn = await ConvertFarmStep.getMaxConvert(
          sdk,
          tokenIn,
          tokenOut
        );

        formActions.resetForm({
          values: {
            ...initialValues,
            maxAmountIn: tokenValueToBN(_maxAmountIn),
          },
        });
      } catch (err) {
        console.error(err);
        if (txToast) {
          txToast.error(err);
        } else {
          const errorToast = new TransactionToast({});
          errorToast.error(err);
        }
        formActions.setSubmitting(false);
      }
    },
    [
      middleware,
      account,
      guvnorBalances,
      sdk,
      gameday,
      recruitAndDoX,
      txnBundler,
      refetch,
      refetchPools,
      refetchGuvnorBalances,
      initialValues,
    ]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {(formikProps) => (
        <>
          <TxnSettings placement="form-top-right">
            <SettingInput
              name="settings.slippage"
              label="Slippage Tolerance"
              endAdornment="%"
            />
          </TxnSettings>
          <ConvertForm
            handleQuote={handleQuote}
            tokenList={tokenList as (ERC20Token | NativeToken)[]}
            firmBalances={guvnorFirmBalances}
            currentGameday={gameday}
            sdk={sdk}
            {...formikProps}
          />
        </>
      )}
    </Formik>
  );
};

const Convert: FC<{
  fromToken: ERC20Token | NativeToken;
}> = (props) => (
  <FormTxnProvider>
    <ConvertPropProvider {...props} />
  </FormTxnProvider>
);

export default Convert;
