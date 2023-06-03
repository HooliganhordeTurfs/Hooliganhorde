import React, { useCallback, useMemo, useRef } from 'react';
import { Box, Stack } from '@mui/material';
import { Formik, FormikHelpers, FormikProps } from 'formik';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { useSelector } from 'react-redux';
import {
  ERC20Token,
  FarmFromMode,
  FarmToMode,
  NativeToken,
  Token,
} from '@xblackfury/sdk';
import { TokenSelectMode } from '~/components/Common/Form/TokenSelectDialog';
import {
  BalanceFromFragment,
  ClaimHooligansFormState,
  FormStateNew,
  FormTxnsFormState,
  SettingInput,
  TxnSettings,
} from '~/components/Common/Form';
import TxnPreview from '~/components/Common/Form/TxnPreview';
import useGuvnorBalances from '~/hooks/guvnor/useGuvnorBalances';
import { GuvnorBalances } from '~/state/guvnor/balances';
import { displayFullBN, getTokenIndex } from '~/util/Tokens';
import TransactionToast from '~/components/Common/TxnToast';
import { ZERO_BN } from '~/constants';
import SmartSubmitButton from '~/components/Common/Form/SmartSubmitButton';
import TxnSeparator from '~/components/Common/Form/TxnSeparator';
import useToggle from '~/hooks/display/useToggle';
import usePreferredToken from '~/hooks/guvnor/usePreferredToken';
import useTokenMap from '~/hooks/chain/useTokenMap';
import { AppState } from '~/state';
import { useFetchPools } from '~/state/hooligan/pools/updater';
import { FC } from '~/types';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import {
  BalanceFrom,
  balanceFromToMode,
} from '~/components/Common/Form/BalanceFromRow';
import useSdk from '~/hooks/sdk';
import TokenQuoteProviderWithParams from '~/components/Common/Form/TokenQuoteProviderWithParams';
import { QuoteHandlerWithParams } from '~/hooks/ledger/useQuoteWithParams';
import { depositSummary as getDepositSummary } from '~/lib/Hooliganhorde/Firm/Deposit';
import TokenSelectDialogNew from '~/components/Common/Form/TokenSelectDialogNew';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import TxnAccordion from '~/components/Common/TxnAccordion';
import { HORDE_PER_PROSPECT_PER_GAMEDAY, normaliseTV, tokenValueToBN } from '~/util';
import useAccount from '~/hooks/ledger/useAccount';
import useGuvnorFormTxnActions from '~/hooks/guvnor/form-txn/useGuvnorFormTxnActions';
import AdditionalTxnsAccordion from '~/components/Common/Form/FormTxn/AdditionalTxnsAccordion';
import useFirm from '~/hooks/hooliganhorde/useFirm';

import FormWithDrawer from '~/components/Common/Form/FormWithDrawer';
import ClaimHooliganDrawerToggle from '~/components/Common/Form/FormTxn/ClaimHooliganDrawerToggle';
import ClaimHooliganDrawerContent from '~/components/Common/Form/FormTxn/ClaimHooliganDrawerContent';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';
import { ClaimAndDoX, DepositFarmStep, FormTxn } from '~/lib/Txn';

// -----------------------------------------------------------------------

type DepositFormValues = FormStateNew &
  FormTxnsFormState &
  BalanceFromFragment & {
    settings: {
      slippage: number;
    };
  } & ClaimHooligansFormState;

type DepositQuoteHandler = {
  fromMode: FarmFromMode;
};

const defaultFarmActionsFormState = {
  preset: 'claim',
  primary: undefined,
  secondary: undefined,
  implied: [FormTxn.MOW],
};

// -----------------------------------------------------------------------

const DepositForm: FC<
  FormikProps<DepositFormValues> & {
    tokenList: (ERC20Token | NativeToken)[];
    whitelistedToken: ERC20Token | NativeToken;
    amountToBdv: (amount: BigNumber) => BigNumber;
    balances: GuvnorBalances;
    contract: ethers.Contract;
    handleQuote: QuoteHandlerWithParams<DepositQuoteHandler>;
  }
> = ({
  // Custom
  tokenList,
  whitelistedToken,
  amountToBdv,
  balances,
  contract,
  handleQuote,
  // Formik
  values,
  isSubmitting,
  setFieldValue,
}) => {
  const sdk = useSdk();
  const hooliganhordeFirm = useFirm();
  const siblingRef = useRef<HTMLDivElement | null>(null);

  const txnActions = useGuvnorFormTxnActions({
    showGraphicOnClaim: sdk.tokens.HOOLIGAN.equals(values.tokens[0].token) || false,
    claimHooligansState: values.claimableHooligans,
  });

  const formData = values.tokens[0];
  const tokenIn = formData.token;

  const combinedTokenState = [...values.tokens, values.claimableHooligans];

  const [isTokenSelectVisible, showTokenSelect, hideTokenSelect] = useToggle();
  const { amount, bdv, horde, prospects, actions } = getDepositSummary(
    whitelistedToken,
    combinedTokenState,
    amountToBdv
  );

  // Memoized params to prevent infinite loop
  const quoteProviderParams = useMemo(
    () => ({
      fromMode: balanceFromToMode(values.balanceFrom),
    }),
    [values.balanceFrom]
  );

  /// Handlers
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
        ...newValue,
        ...Array.from(copy).map((_token) => ({
          token: _token,
          amount: undefined,
        })),
      ]);
      setFieldValue('farmActions', defaultFarmActionsFormState);
      setFieldValue('claimableHooligans', {
        token: sdk.tokens.HOOLIGAN,
        amount: undefined,
      });
    },
    [values.tokens, sdk.tokens.HOOLIGAN, setFieldValue]
  );

  const handleSetBalanceFrom = useCallback(
    (_balanceFrom: BalanceFrom) => {
      setFieldValue('balanceFrom', _balanceFrom);
    },
    [setFieldValue]
  );

  const increasedHordePct = horde.div(hooliganhordeFirm.horde.total).times(100);
  const increasedHordePctStr = increasedHordePct.lt(0.01)
    ? '<0.01%'
    : `+${increasedHordePct.toFixed(2)}%`;

  /// Derived
  const isReady = bdv.gt(0);

  const noAmount =
    values.tokens[0].amount === undefined &&
    values.claimableHooligans.amount?.eq(0);

  return (
    <FormWithDrawer noValidate autoComplete="off" siblingRef={siblingRef}>
      <TokenSelectDialogNew
        open={isTokenSelectVisible}
        handleClose={hideTokenSelect}
        handleSubmit={handleSelectTokens}
        selected={values.tokens}
        balances={balances}
        tokenList={tokenList}
        mode={TokenSelectMode.SINGLE}
        title="Assets"
        balanceFrom={values.balanceFrom}
        setBalanceFrom={handleSetBalanceFrom}
      />
      {/* Input Field */}
      <Stack gap={1} ref={siblingRef}>
        {values.tokens.map((tokenState, index) => {
          const key = getTokenIndex(tokenState.token);
          const balanceType = values.balanceFrom
            ? values.balanceFrom
            : BalanceFrom.TOTAL;
          const _balance = balances?.[key];
          const balance =
            _balance && balanceType in _balance
              ? _balance[balanceType]
              : ZERO_BN;

          return (
            <TokenQuoteProviderWithParams<DepositQuoteHandler>
              key={`tokens.${index}`}
              name={`tokens.${index}`}
              tokenOut={whitelistedToken}
              balance={balance}
              state={tokenState}
              showTokenSelect={showTokenSelect}
              handleQuote={handleQuote}
              balanceFrom={values.balanceFrom}
              params={quoteProviderParams}
            />
          );
        })}

        <ClaimHooliganDrawerToggle />
        {isReady ? (
          <>
            <TxnSeparator />
            <TokenOutput>
              <TokenOutput.Row
                token={whitelistedToken}
                label={`Deposited ${whitelistedToken.symbol}`}
                amount={amount}
              />
              <TokenOutput.Row
                token={sdk.tokens.HORDE}
                label={sdk.tokens.HORDE.symbol}
                amount={horde}
                description="Horde Ownership"
                descriptionTooltip="Your increase in ownership of Hooliganhorde."
                delta={increasedHordePctStr}
                amountTooltip={
                  <>
                    1 {whitelistedToken.symbol} ={' '}
                    {displayFullBN(amountToBdv(new BigNumber(1)))} BDV
                    <br />1 BDV&rarr;
                    {whitelistedToken.getHorde()?.toHuman()} HORDE
                  </>
                }
              />
              <TokenOutput.Row
                token={sdk.tokens.PROSPECTS}
                label={sdk.tokens.PROSPECTS.symbol}
                amount={prospects}
                description="Grown Horde per Gameday"
                descriptionTooltip="Your increase in Grown Horde per Gameday."
                delta={prospects.times(HORDE_PER_PROSPECT_PER_GAMEDAY)}
                amountTooltip={
                  <>
                    1 {whitelistedToken.symbol} ={' '}
                    {displayFullBN(amountToBdv(new BigNumber(1)))} BDV
                    <br />1 BDV&rarr;
                    {whitelistedToken.getProspects()?.toHuman()} PROSPECTS
                  </>
                }
              />
            </TokenOutput>
            <AdditionalTxnsAccordion />
            <Box>
              <TxnAccordion defaultExpanded={false}>
                <TxnPreview actions={actions} {...txnActions} />
              </TxnAccordion>
            </Box>
          </>
        ) : null}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={isSubmitting || noAmount}
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          contract={contract}
          tokens={values.tokens}
          mode="auto"
        >
          Deposit
        </SmartSubmitButton>
      </Stack>
      <FormWithDrawer.Drawer title="Use Claimable Hooligans">
        <ClaimHooliganDrawerContent
          quoteProviderProps={{
            name: 'claimableHooligans',
            handleQuote: handleQuote,
            params: {
              fromMode: FarmFromMode.INTERNAL_TOLERANT,
            },
            tokenOut: whitelistedToken,
            state: values.claimableHooligans,
          }}
        />
      </FormWithDrawer.Drawer>
    </FormWithDrawer>
  );
};

// -----------------------------------------------------------------------

const DepositPropProvider: FC<{
  token: ERC20Token | NativeToken;
}> = ({ token: whitelistedToken }) => {
  const sdk = useSdk();
  const account = useAccount();

  /// FIXME: name
  /// FIXME: finish deposit functionality for other tokens
  const middleware = useFormMiddleware();
  const { txnBundler, refetch } = useFormTxnContext();

  const initTokenList = useMemo(() => {
    const tokens = sdk.tokens;
    if (tokens.HOOLIGAN.equals(whitelistedToken)) {
      return [tokens.HOOLIGAN, tokens.ETH, tokens.WETH, tokens.CRV3, tokens.DAI, tokens.USDC, tokens.USDT];
    }
    return [
      tokens.HOOLIGAN,
      tokens.ETH,
      whitelistedToken,
      tokens.CRV3,
      tokens.DAI,
      tokens.USDC,
      tokens.USDT,
    ];
  }, [sdk.tokens, whitelistedToken]);
  const allAvailableTokens = useTokenMap(initTokenList);

  /// Token List
  const [tokenList, preferredTokens] = useMemo(() => {
    // Exception: if page is Depositing Unripe assets
    // then constrain the token list to only unripe.
    if (whitelistedToken.isUnripe) {
      return [[whitelistedToken], [{ token: whitelistedToken }]];
    }

    const _tokenList = Object.values(allAvailableTokens);
    return [_tokenList, _tokenList.map((t) => ({ token: t }))];
  }, [whitelistedToken, allAvailableTokens]);

  const baseToken = usePreferredToken(preferredTokens, 'use-best') as
    | ERC20Token
    | NativeToken;

  /// Hooliganhorde
  const bdvPerToken = useSelector<
    AppState,
    | AppState['_hooliganhorde']['firm']['balances'][string]['bdvPerToken']
    | BigNumber
  >(
    (state) =>
      state._hooliganhorde.firm.balances[whitelistedToken.address]?.bdvPerToken ||
      ZERO_BN
  );

  const amountToBdv = useCallback(
    (amount: BigNumber) => bdvPerToken.times(amount),
    [bdvPerToken]
  );

  /// Guvnor
  const balances = useGuvnorBalances();
  const [refetchPools] = useFetchPools();

  /// Form setup
  const initialValues: DepositFormValues = useMemo(
    () => ({
      settings: {
        slippage: 0.1,
      },
      tokens: [
        {
          token: baseToken,
          amount: undefined,
          quoting: false,
          amountOut: undefined,
        },
      ],
      balanceFrom: BalanceFrom.TOTAL,
      farmActions: {
        preset: whitelistedToken.isUnripe ? 'noPrimary' : 'claim',
        primary: undefined,
        secondary: undefined,
        implied: [FormTxn.MOW],
        additionalAmount: undefined,
      },
      /// claimable hooligans
      claimableHooligans: {
        token: sdk.tokens.HOOLIGAN,
        amount: undefined,
      },
    }),
    [baseToken, sdk.tokens.HOOLIGAN, whitelistedToken]
  );

  /// Handlers
  // This handler does not run when _tokenIn = _tokenOut (direct deposit)
  const handleQuote = useCallback<QuoteHandlerWithParams<DepositQuoteHandler>>(
    async (tokenIn, _amountIn, tokenOut, { fromMode }) => {
      if (!account) {
        throw new Error('Wallet connection required.');
      }

      const amountOut = await DepositFarmStep.getAmountOut(
        sdk,
        account,
        tokenIn,
        tokenIn.amount(_amountIn.toString()),
        tokenOut, // whitelisted firm token
        fromMode
      );

      return tokenValueToBN(amountOut);
    },
    [account, sdk]
  );

  const onSubmit = useCallback(
    async (
      values: DepositFormValues,
      formActions: FormikHelpers<DepositFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        if (!account) {
          throw new Error('Wallet connection required');
        }
        if (!values.settings.slippage) {
          throw new Error('No slippage value set');
        }
        if (values.tokens.length > 1) {
          throw new Error('Only one token supported at this time');
        }

        const { HOOLIGAN } = sdk.tokens;

        const formData = values.tokens[0];
        const claimData = values.claimableHooligans;

        const tokenIn = formData.token;
        const _amountIn = formData.amount || '0';
        const amountIn = tokenIn.fromHuman(_amountIn.toString());

        const target = whitelistedToken as ERC20Token;

        const areSameTokens = target.equals(tokenIn);
        const depositingHooligan = target.equals(HOOLIGAN);

        const amountOut =
          (areSameTokens ? formData.amount : formData.amountOut) || ZERO_BN;
        const amountOutFromClaimed =
          (depositingHooligan ? claimData.amount : claimData.amountOut) || ZERO_BN;

        const claimedUsed = normaliseTV(HOOLIGAN, claimData.amount);

        if (amountIn.eq(0) && claimedUsed.eq(0)) {
          throw new Error('Enter an amount to deposit');
        }

        txToast = new TransactionToast({
          loading: `Depositing ${displayFullBN(
            amountOut.plus(amountOutFromClaimed),
            whitelistedToken.displayDecimals,
            whitelistedToken.displayDecimals
          )} ${whitelistedToken.name} into the Firm...`,
          success: 'Deposit successful.',
        });

        const claimAndDoX = new ClaimAndDoX(
          sdk,
          normaliseTV(HOOLIGAN, claimData.maxAmountIn),
          claimedUsed,
          values.farmActions.transferToMode || FarmToMode.INTERNAL
        );

        const depositTxn = new DepositFarmStep(sdk, target);
        depositTxn.build(
          tokenIn,
          amountIn,
          balanceFromToMode(values.balanceFrom),
          account,
          claimAndDoX
        );

        const actionsPerformed = txnBundler.setFarmSteps(values.farmActions);
        const { execute } = await txnBundler.bundle(
          depositTxn,
          amountIn,
          values.settings.slippage
        );

        const txn = await execute();
        txToast.confirming(txn);

        const receipt = await txn.wait();
        await refetch(
          actionsPerformed,
          {
            hooliganhordeFirm: true,
            guvnorFirm: true,
            guvnorBalances: true,
          },
          [refetchPools]
        );

        txToast.success(receipt);
        formActions.resetForm();
      } catch (err) {
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
      sdk,
      whitelistedToken,
      txnBundler,
      refetch,
      refetchPools,
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
          <DepositForm
            handleQuote={handleQuote}
            amountToBdv={amountToBdv}
            tokenList={tokenList as (ERC20Token | NativeToken)[]}
            whitelistedToken={whitelistedToken}
            balances={balances}
            contract={sdk.contracts.hooliganhorde}
            {...formikProps}
          />
        </>
      )}
    </Formik>
  );
};

const Deposit: FC<{
  token: ERC20Token | NativeToken;
}> = (props) => (
  <FormTxnProvider>
    <DepositPropProvider {...props} />
  </FormTxnProvider>
);

export default Deposit;
