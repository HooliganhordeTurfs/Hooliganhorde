import { Box, InputAdornment, Stack, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useProvider } from 'wagmi';
import TransactionToast from '~/components/Common/TxnToast';
import TxnAccordion from '~/components/Common/TxnAccordion';
import { TokenSelectMode } from '~/components/Common/Form/TokenSelectDialog';
import {
  FormTokenStateNew,
  SettingInput,
  SmartSubmitButton,
  TokenAdornment,
  TokenInputField,
  TxnPreview,
  TxnSeparator,
  TxnSettings,
} from '~/components/Common/Form';
import { ERC20Token, FarmFromMode, NativeToken, Token } from '@xblackfury/sdk';
import useChainConstant from '~/hooks/chain/useChainConstant';
import useGuvnorBalances from '~/hooks/guvnor/useGuvnorBalances';
import useTokenMap from '~/hooks/chain/useTokenMap';
import useToggle from '~/hooks/display/useToggle';
import { Hooliganhorde } from '~/generated';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import { useSigner } from '~/hooks/ledger/useSigner';
import { useFetchGuvnorBalances } from '~/state/guvnor/balances/updater';
import { useFetchGuvnorMarket } from '~/state/guvnor/market/updater';
import { ActionType } from '~/util/Actions';
import Farm from '~/lib/Hooliganhorde/Farm';
import { optimizeFromMode } from '~/util/Farm';
import {
  displayFullBN,
  toStringBaseUnitBN,
  displayTokenAmount,
  displayBN,
} from '~/util';
import { AppState } from '~/state';
import { HOOLIGAN, ETH, CASUALS } from '~/constants/tokens';
import { ONE_BN, ZERO_BN, CASUAL_MARKET_TOOLTIPS } from '~/constants';
import SliderField from '~/components/Common/Form/SliderField';
import FieldWrapper from '~/components/Common/Form/FieldWrapper';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import { FC } from '~/types';
import { useFetchGuvnorMarketItems } from '~/hooks/guvnor/market/useGuvnorMarket2';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import useSdk from '~/hooks/sdk';
import { bnToTokenValue } from '~/util';
import { BuyTurfsFarmStep } from '~/lib/Txn/FarmSteps/market/BuyTurfsFarmStep';
import TokenQuoteProviderWithParams from '~/components/Common/Form/TokenQuoteProviderWithParams';
import TokenSelectDialogNew from '~/components/Common/Form/TokenSelectDialogNew';
import usePreferredToken from '~/hooks/guvnor/usePreferredToken';
import useAccount from '~/hooks/ledger/useAccount';
import { QuoteHandlerWithParams } from '~/hooks/ledger/useQuoteWithParams';
import { getNewToOldToken } from '~/hooks/sdk';
import { tokenValueToBN } from '~/util';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';

export type CreateOrderFormValues = {
  placeInLine: BigNumber | null;
  pricePerCasual: BigNumber | null;
  tokens: FormTokenStateNew[];
  settings: {
    slippage: number;
  };
};

type CasualOrderFormParams = {
  fromMode: FarmFromMode;
};

const PlaceInLineInputProps = {
  startAdornment: (
    <InputAdornment position="start">
      <Stack sx={{ pr: 0 }} alignItems="center">
        <Typography
          color="text.primary"
          sx={{
            opacity: '0.4',
            // HOTFIX: Small forms
            mr: -0.2,
            fontSize: 17.6,
          }}
        >
          0 -
        </Typography>
      </Stack>
    </InputAdornment>
  ),
};
const PricePerCasualInputProps = {
  inputProps: { step: '0.01' },
  endAdornment: (
    <TokenAdornment
      token={HOOLIGAN[1]}
      // HOTFIX: Small forms
      size="small"
    />
  ),
};

const SLIDER_FIELD_KEYS = ['placeInLine'];

const CreateOrderV2Form: FC<
  FormikProps<CreateOrderFormValues> & {
    casualLine: BigNumber;
    handleQuote: QuoteHandlerWithParams<CasualOrderFormParams>;
    tokenList: (ERC20Token | NativeToken)[];
    contract: Hooliganhorde;
  }
> = ({
  values,
  setFieldValue,
  isSubmitting,
  handleQuote,
  casualLine,
  tokenList,
  contract,
}) => {
  const sdk = useSdk();
  const Hooligan = sdk.tokens.HOOLIGAN;
  const erc20TokenMap = useTokenMap<ERC20Token | NativeToken>(tokenList);
  const balances = useGuvnorBalances();

  const [showTokenSelect, handleOpen, handleClose] = useToggle();
  const handleSelectTokens = useCallback(
    (_tokens: Set<Token>) => {
      // If the user has typed some existing values in,
      // save them. Add new tokens to the end of the list.
      // FIXME: match sorting of erc20TokenList
      const copy = new Set(_tokens);
      const v = values.tokens.filter((x) => {
        copy.delete(x.token);
        return _tokens.has(x.token);
      });
      setFieldValue('tokens', [
        ...v,
        ...Array.from(copy).map((_token) => ({
          token: _token,
          amount: undefined,
        })),
      ]);
    },
    [values.tokens, setFieldValue]
  );

  const quoteHandlerParams = useMemo(
    () => ({
      fromMode: FarmFromMode.EXTERNAL,
    }),
    []
  );

  const tokenIn = values.tokens[0].token;
  const amountIn = values.tokens[0].amount;
  const tokenOut = Hooligan;
  const amountOut =
    tokenIn === tokenOut // Hooligans
      ? values.tokens[0].amount
      : values.tokens[0].amountOut;

  const isReady =
    amountIn &&
    values.placeInLine?.gt(0) &&
    values.pricePerCasual?.gt(0) &&
    amountOut;
  const amountCasuals = isReady ? amountOut.div(values.pricePerCasual!) : ZERO_BN;

  return (
    <Form autoComplete="off" noValidate>
      <TokenSelectDialogNew
        open={showTokenSelect}
        handleClose={handleClose}
        selected={values.tokens}
        handleSubmit={handleSelectTokens}
        balances={balances}
        tokenList={Object.values(erc20TokenMap)}
        mode={TokenSelectMode.SINGLE}
      />
      <Stack gap={1.5}>
        <FieldWrapper
          label="Max Place in Line"
          tooltip="The maximum Place in Line in which you are willing to buy Casuals at the following price."
        >
          <Box px={1.7}>
            <SliderField
              min={0}
              fields={SLIDER_FIELD_KEYS}
              max={casualLine.toNumber()}
              initialState={0}
            />
          </Box>
          <TokenInputField
            name="placeInLine"
            placeholder={displayFullBN(casualLine, 0).toString()}
            max={casualLine}
            InputProps={PlaceInLineInputProps}
            size="small"
          />
        </FieldWrapper>
        <FieldWrapper
          label="Price per Casual"
          tooltip={CASUAL_MARKET_TOOLTIPS.pricePerCasualOrder}
        >
          <TokenInputField
            name="pricePerCasual"
            placeholder="0.0000"
            InputProps={PricePerCasualInputProps}
            max={ONE_BN}
            size="small"
          />
        </FieldWrapper>
        <FieldWrapper label="Order using">
          <>
            {values.tokens.map((state, index) => (
              <TokenQuoteProviderWithParams<CasualOrderFormParams>
                key={`tokens.${index}`}
                name={`tokens.${index}`}
                tokenOut={Hooligan}
                balance={
                  state.token.address === ''
                    ? balances['eth']
                    : balances[state.token.address] || ZERO_BN
                }
                state={state}
                params={quoteHandlerParams}
                showTokenSelect={handleOpen}
                handleQuote={handleQuote}
                size="small"
              />
            ))}
          </>
        </FieldWrapper>
        {isReady ? (
          <>
            <TxnSeparator mt={-1} />
            <TokenOutput size="small">
              <TokenOutput.Row
                token={sdk.tokens.CASUALS}
                amount={amountCasuals}
                size="small"
              />
            </TokenOutput>
            {/* <Alert
              color="warning"
              icon={
                <IconWrapper boxSize={IconSize.medium}>
                  <WarningAmberIcon sx={{ fontSize: IconSize.small }} />
                </IconWrapper>
              }
            >
              You will only receive this number of Casuals if your Order is
              entirely Filled.
            </Alert> */}
            <Box>
              <TxnAccordion>
                <TxnPreview
                  actions={[
                    tokenIn === tokenOut
                      ? undefined
                      : {
                          type: ActionType.SWAP,
                          tokenIn: getNewToOldToken(tokenIn),
                          amountIn: amountIn,
                          tokenOut: getNewToOldToken(tokenOut),
                          amountOut: amountOut,
                        },
                    {
                      type: ActionType.CREATE_ORDER,
                      message: `Order ${displayTokenAmount(
                        amountCasuals,
                        CASUALS
                      )} at ${displayFullBN(
                        values.pricePerCasual!,
                        4
                      )} Hooligans per Casual. Any Casuals before ${displayBN(
                        values.placeInLine!
                      )} in the Casual Line are eligible to Fill this Order.`,
                    },
                    {
                      type: ActionType.BASE,
                      message: `${displayTokenAmount(
                        amountOut,
                        tokenOut
                      )} will be locked in the Casual Order to allow for instant settlement. You can reclaim these Hooligans by Cancelling the Order.`,
                    },
                  ]}
                />
              </TxnAccordion>
            </Box>
          </>
        ) : null}
        <Box sx={{ position: 'sticky', bottom: 6.5, zIndex: 10 }}>
          <SmartSubmitButton
            loading={isSubmitting}
            disabled={isSubmitting || !isReady}
            type="submit"
            variant="contained"
            color="primary"
            contract={contract}
            tokens={values.tokens}
            mode="auto"
            sx={{ width: '100%', outline: '6.5px solid white' }}
          >
            Order
          </SmartSubmitButton>
        </Box>
      </Stack>
    </Form>
  );
};

// ---------------------------------------------------

const CreateOrderProvider: FC<{}> = () => {
  const sdk = useSdk();

  /// Tokens
  const Eth = useChainConstant(ETH);
  const Hooligan = sdk.tokens.HOOLIGAN;
  const Weth = sdk.tokens.WETH;

  const { preferredTokens, tokenList } = useMemo(() => {
    const tokens = BuyTurfsFarmStep.getPreferredTokens(sdk.tokens);
    return {
      preferredTokens: tokens.preferred,
      tokenList: tokens.tokenList,
    };
  }, [sdk]);

  const tokenMap = useTokenMap<ERC20Token | NativeToken>(tokenList);

  /// Ledger
  const { data: signer } = useSigner();
  const provider = useProvider();
  const hooliganhorde = useHooliganhordeContract(signer);

  /// Farm
  const farm = useMemo(() => new Farm(provider), [provider]);

  /// Hooliganhorde
  const hooliganhordeField = useSelector<AppState, AppState['_hooliganhorde']['field']>(
    (state) => state._hooliganhorde.field
  );
  const account = useAccount();

  /// Guvnor
  const balances = useGuvnorBalances();
  const [refetchGuvnorBalances] = useFetchGuvnorBalances();
  const [refetchGuvnorMarket] = useFetchGuvnorMarket();
  // subgraph queries
  const { fetch: fetchGuvnorMarketItems } = useFetchGuvnorMarketItems();

  /// Form
  const middleware = useFormMiddleware();
  const { txnBundler } = useFormTxnContext();

  const baseToken = usePreferredToken(preferredTokens, 'use-best');
  const initialValues: CreateOrderFormValues = useMemo(
    () => ({
      placeInLine: ZERO_BN,
      pricePerCasual: null,
      tokens: [
        {
          token: baseToken as ERC20Token | NativeToken,
          amount: undefined,
        },
      ],
      settings: {
        slippage: 0.1,
      },
    }),
    [Eth]
  );

  /// Handlers

  const handleQuote = useCallback(
    async (_tokenIn: any, _amountIn: any, _tokenOut: any) => {
      const amountOut = await BuyTurfsFarmStep.getAmountOut(
        sdk,
        _tokenIn,
        _amountIn.toString(),
        FarmFromMode.EXTERNAL,
        account
      );

      return {
        amountOut: tokenValueToBN(amountOut),
        tokenValue: amountOut,
      };
    },
    [Weth, farm]
  );

  const onSubmit = useCallback(
    async (
      values: CreateOrderFormValues,
      formActions: FormikHelpers<CreateOrderFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();

        if (!values.settings.slippage) {
          throw new Error('No slippage value set.');
        }
        if (values.tokens.length > 1) {
          throw new Error('Only one token supported at this time');
        }
        const tokenData = values.tokens[0];
        const { pricePerCasual, placeInLine } = values;

        if (!tokenData?.amount || tokenData.amount.eq(0)) {
          throw new Error('No amount set');
        }
        if (!pricePerCasual || !placeInLine) throw new Error('Missing data');

        ///
        let call;
        let txn;
        const inputToken = tokenData.token;

        ///
        txToast = new TransactionToast({
          loading: 'Ordering Casuals...',
          success: 'Order successful.',
        });

        /// Create Casual Order directly
        /// We only need one call to do this, so we skip
        /// the farm() call below to optimize gas.

        if (inputToken === Hooligan) {
          call = hooliganhorde.createCasualOrder(
            toStringBaseUnitBN(tokenData.amount, Hooligan.decimals),
            toStringBaseUnitBN(pricePerCasual, Hooligan.decimals),
            toStringBaseUnitBN(placeInLine, Hooligan.decimals),
            CASUALS.stringify(new BigNumber(1)), // minFillAmount is measured in Casuals
            optimizeFromMode(tokenData.amount, balances[Hooligan.address])
          );

          txn = await call;
        }

        /// Buy and Create Casual Order
        else {
          /// Require a quote
          if (!tokenData.amountOut) {
            throw new Error(`No quote available for ${tokenData.token.symbol}`);
          }

          const hooliganAmountOut = await handleQuote(
            tokenData.token,
            tokenData.amount,
            HOOLIGAN
          );

          const orderTxn = new BuyTurfsFarmStep(sdk, account!);
          orderTxn.build(
            tokenData.token,
            hooliganAmountOut.tokenValue,
            pricePerCasual,
            placeInLine
          );

          const { execute } = await txnBundler.bundle(
            orderTxn,
            bnToTokenValue(tokenData.token, tokenData.amount),
            values.settings.slippage
          );

          txn = await execute();
        }

        txToast.confirming(txn);

        const receipt = await txn.wait();
        await Promise.all([
          refetchGuvnorBalances(),
          refetchGuvnorMarket(),
          fetchGuvnorMarketItems(),
        ]);
        txToast.success(receipt);
        formActions.resetForm();
      } catch (err) {
        if (txToast) {
          txToast.error(err);
        } else {
          const errorToast = new TransactionToast({});
          errorToast.error(err);
        }
        console.error(err);
      }
    },
    [
      middleware,
      Hooligan,
      refetchGuvnorBalances,
      refetchGuvnorMarket,
      fetchGuvnorMarketItems,
      hooliganhorde,
      balances,
      Eth,
    ]
  );

  return (
    <Formik<CreateOrderFormValues>
      initialValues={initialValues}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {(formikProps: FormikProps<CreateOrderFormValues>) => (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              zIndex: 10,
            }}
          >
            <TxnSettings placement="condensed-form-top-right">
              <SettingInput
                name="settings.slippage"
                label="Slippage Tolerance"
                endAdornment="%"
              />
            </TxnSettings>
          </Box>
          <CreateOrderV2Form
            casualLine={hooliganhordeField.casualLine}
            handleQuote={handleQuote}
            tokenList={Object.values(tokenMap) as (ERC20Token | NativeToken)[]}
            contract={hooliganhorde}
            {...formikProps}
          />
        </>
      )}
    </Formik>
  );
};

const CreateOrder: FC<{}> = (props) => (
  <FormTxnProvider>
    <CreateOrderProvider {...props} />
  </FormTxnProvider>
);

export default CreateOrder;
