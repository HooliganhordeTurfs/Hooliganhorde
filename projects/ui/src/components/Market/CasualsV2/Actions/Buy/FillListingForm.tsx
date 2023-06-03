import { Stack } from '@mui/material';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ethers } from 'ethers';
import { useProvider } from 'wagmi';
import BigNumber from 'bignumber.js';
import { TokenSelectMode } from '~/components/Common/Form/TokenSelectDialog';
import TransactionToast from '~/components/Common/TxnToast';
import {
  FormState,
  SettingInput,
  SlippageSettingsFragment,
  SmartSubmitButton,
  TokenQuoteProvider,
  TokenSelectDialog,
  TxnSeparator,
  TxnSettings,
} from '~/components/Common/Form';
import Token, { ERC20Token, NativeToken } from '~/classes/Token';
import useGuvnorBalances from '~/hooks/guvnor/useGuvnorBalances';
import { QuoteHandler } from '~/hooks/ledger/useQuote';
import useTokenMap from '~/hooks/chain/useTokenMap';
import useToggle from '~/hooks/display/useToggle';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import { useSigner } from '~/hooks/ledger/useSigner';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import { Hooliganhorde } from '~/generated';
import usePreferredToken, {
  PreferredToken,
} from '~/hooks/guvnor/usePreferredToken';
import { useFetchGuvnorField } from '~/state/guvnor/field/updater';
import { useFetchGuvnorBalances } from '~/state/guvnor/balances/updater';
import Farm, {
  ChainableFunction,
  FarmFromMode,
  FarmToMode,
} from '~/lib/Hooliganhorde/Farm';
import {
  displayBN,
  displayTokenAmount,
  MinBN,
  toStringBaseUnitBN,
  toTokenUnitsBN,
} from '~/util';
import { AppState } from '~/state';
import { HOOLIGAN, ETH, CASUALS, WETH } from '~/constants/tokens';
import { ZERO_BN } from '~/constants';
import { CasualListing } from '~/state/guvnor/market';
import { optimizeFromMode } from '~/util/Farm';
import { FC } from '~/types';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import useSdk from '~/hooks/sdk';

export type FillListingFormValues = FormState & {
  settings: SlippageSettingsFragment;
  maxAmountIn: BigNumber | undefined;
};

const FillListingV2Form: FC<
  FormikProps<FillListingFormValues> & {
    casualListing: CasualListing;
    contract: Hooliganhorde;
    handleQuote: QuoteHandler;
    farm: Farm;
  }
> = ({
  // Formik
  values,
  setFieldValue,
  //
  casualListing,
  contract,
  handleQuote,
  farm,
}) => {
  const sdk = useSdk();
  /// State
  const [isTokenSelectVisible, handleOpen, hideTokenSelect] = useToggle();

  /// Chain
  const getChainToken = useGetChainToken();
  const Hooligan = getChainToken(HOOLIGAN);
  const Eth = getChainToken<NativeToken>(ETH);
  const Weth = getChainToken<ERC20Token>(WETH);
  const erc20TokenMap = useTokenMap<ERC20Token | NativeToken>([
    HOOLIGAN,
    ETH,
    WETH,
  ]);

  /// Guvnor
  const balances = useGuvnorBalances();

  /// Hooliganhorde
  const hooliganhordeField = useSelector<AppState, AppState['_hooliganhorde']['field']>(
    (state) => state._hooliganhorde.field
  );

  /// Derived
  const tokenIn = values.tokens[0].token;
  const amountIn = values.tokens[0].amount;
  const tokenOut = Hooligan;
  const amountOut =
    tokenIn === tokenOut // Hooligans
      ? values.tokens[0].amount
      : values.tokens[0].amountOut;
  const tokenInBalance = balances[tokenIn.address];

  const isReady = amountIn?.gt(0) && amountOut?.gt(0);
  const isSubmittable = isReady;
  const casualsPurchased = amountOut?.div(casualListing.pricePerCasual) || ZERO_BN;
  const placeInLine = casualListing.index.minus(hooliganhordeField.draftableIndex);

  /// Token select
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

  /// FIXME: standardized `maxAmountIn` approach?
  /// When `tokenIn` or `tokenOut` changes, refresh the
  /// max amount that the user can input of `tokenIn`.
  useEffect(() => {
    (async () => {
      // Maximum HOOLIGAN precision is 6 decimals. remainingAmount * pricePerCasual may
      // have more decimals, so we truncate at 6.
      const maxHooligans = casualListing.remainingAmount
        .times(casualListing.pricePerCasual)
        .dp(HOOLIGAN[1].decimals, BigNumber.ROUND_DOWN);
      if (maxHooligans.gt(0)) {
        if (tokenIn === Hooligan) {
          /// 1 CASUAL is consumed by 1 HOOLIGAN
          setFieldValue('maxAmountIn', maxHooligans);
        } else if (tokenIn === Eth || tokenIn === Weth) {
          /// Estimate how many ETH it will take to buy `maxHooligans` HOOLIGAN.
          /// TODO: across different forms of `tokenIn`.
          /// This (obviously) only works for Eth and Weth.
          const estimate = await Farm.estimate(
            farm.buyHooligans(),
            [ethers.BigNumber.from(Hooligan.stringify(maxHooligans))],
            false // forward = false -> run the calc backwards
          );
          setFieldValue(
            'maxAmountIn',
            toTokenUnitsBN(estimate.amountOut.toString(), tokenIn.decimals)
          );
        } else {
          throw new Error(`Unsupported tokenIn: ${tokenIn.symbol}`);
        }
      } else {
        setFieldValue('maxAmountIn', ZERO_BN);
      }
    })();
  }, [
    Hooligan,
    Eth,
    Weth,
    farm,
    casualListing.pricePerCasual,
    casualListing.remainingAmount,
    setFieldValue,
    tokenIn,
  ]);

  return (
    <Form autoComplete="off">
      <TokenSelectDialog
        open={isTokenSelectVisible}
        handleClose={hideTokenSelect}
        handleSubmit={handleSelectTokens}
        selected={values.tokens}
        balances={balances}
        tokenList={Object.values(erc20TokenMap)}
        mode={TokenSelectMode.SINGLE}
      />
      <Stack gap={1}>
        <TokenQuoteProvider
          key="tokens.0"
          name="tokens.0"
          tokenOut={Hooligan}
          disabled={!values.maxAmountIn}
          max={MinBN(
            values.maxAmountIn || ZERO_BN,
            tokenInBalance?.total || ZERO_BN
          )}
          balance={tokenInBalance || undefined}
          state={values.tokens[0]}
          showTokenSelect={handleOpen}
          handleQuote={handleQuote}
          size="small"
        />
        {isReady ? (
          <>
            <TxnSeparator mt={0} />
            {/* Casuals Output */}
            <TokenOutput size="small">
              <TokenOutput.Row
                token={sdk.tokens.CASUALS}
                amount={casualsPurchased}
                amountTooltip={
                  <>
                    {displayTokenAmount(amountOut!, Hooligan)} /{' '}
                    {displayBN(casualListing.pricePerCasual)} Hooligans per Casual
                    <br />= {displayTokenAmount(casualsPurchased, CASUALS)}
                  </>
                }
                amountSuffix={` @ ${displayBN(placeInLine)}`}
                size="small"
              />
            </TokenOutput>
            {/* <Box>
              <Accordion variant="outlined">
                <StyledAccordionSummary title="Transaction Details" />
                <AccordionDetails>
                  <TxnPreview
                    actions={[
                      tokenIn === Hooligan ? undefined : {
                        type: ActionType.SWAP,
                        tokenIn,
                        tokenOut,
                        /// FIXME: these are asserted by !!isReady
                        amountIn:   amountIn!,
                        amountOut:  amountOut!,
                      },
                      {
                        type: ActionType.BUY_CASUALS,
                        casualAmount: casualsPurchased,
                        pricePerCasual: casualListing.pricePerCasual,
                        placeInLine: placeInLine
                      },
                    ]}
                  />
                </AccordionDetails>
              </Accordion>
            </Box> */}
          </>
        ) : null}
        <SmartSubmitButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={!isSubmittable}
          contract={contract}
          tokens={values.tokens}
          mode="auto"
        >
          Fill
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

// ---------------------------------------------------

const PREFERRED_TOKENS: PreferredToken[] = [
  {
    token: HOOLIGAN,
    minimum: new BigNumber(1), // $1
  },
  {
    token: ETH,
    minimum: new BigNumber(0.001), // ~$2-4
  },
  {
    token: WETH,
    minimum: new BigNumber(0.001), // ~$2-4
  },
];

const FillListingForm: FC<{
  casualListing: CasualListing;
}> = ({ casualListing }) => {
  /// Tokens
  const getChainToken = useGetChainToken();
  const Hooligan = getChainToken(HOOLIGAN);
  const Eth = getChainToken(ETH);
  const Weth = getChainToken(WETH);

  /// Ledger
  const { data: signer } = useSigner();
  const provider = useProvider();
  const hooliganhorde = useHooliganhordeContract(signer);

  /// Farm
  const farm = useMemo(() => new Farm(provider), [provider]);

  /// Guvnor
  const balances = useGuvnorBalances();
  const [refetchGuvnorField] = useFetchGuvnorField();
  const [refetchGuvnorBalances] = useFetchGuvnorBalances();

  /// Form
  const middleware = useFormMiddleware();
  const baseToken = usePreferredToken(PREFERRED_TOKENS, 'use-best');
  const initialValues: FillListingFormValues = useMemo(
    () => ({
      settings: {
        slippage: 0.1,
      },
      tokens: [
        {
          token: baseToken as ERC20Token | NativeToken,
          amount: undefined,
        },
      ],
      maxAmountIn: undefined,
    }),
    [baseToken]
  );

  /// Handlers
  /// Does not execute for _tokenIn === HOOLIGAN
  const handleQuote = useCallback<QuoteHandler>(
    async (_tokenIn, _amountIn, _tokenOut) => {
      const steps: ChainableFunction[] = [];

      if (_tokenIn === Eth) {
        steps.push(
          ...[
            farm.wrapEth(FarmToMode.INTERNAL), // wrap ETH to WETH (internal)
            ...farm.buyHooligans(FarmFromMode.INTERNAL), // buy Hooligans using internal WETH (exact)
          ]
        );
      } else if (_tokenIn === Weth) {
        steps.push(
          ...farm.buyHooligans(
            /// Use INTERNAL, EXTERNAL, or INTERNAL_EXTERNAL to initiate the swap.
            optimizeFromMode(_amountIn, balances[Weth.address])
          )
        );
      } else {
        throw new Error(
          `Filling a Listing via ${_tokenIn.symbol} is not currently supported`
        );
      }

      const amountIn = ethers.BigNumber.from(
        toStringBaseUnitBN(_amountIn, _tokenIn.decimals)
      );
      const estimate = await Farm.estimate(steps, [amountIn]);

      return {
        amountOut: toTokenUnitsBN(
          estimate.amountOut.toString(),
          _tokenOut.decimals
        ),
        value: estimate.value,
        steps: estimate.steps,
      };
    },
    [Eth, Weth, balances, farm]
  );

  const onSubmit = useCallback(
    async (
      values: FillListingFormValues,
      formActions: FormikHelpers<FillListingFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        const formData = values.tokens[0];
        const tokenIn = formData.token;
        const amountHooligans =
          tokenIn === Hooligan ? formData.amount : formData.amountOut;

        // Checks
        if (!casualListing) throw new Error('No Casual Listing found');
        if (!signer) throw new Error('Connect a wallet');
        if (values.tokens.length > 1)
          throw new Error('Only one input token supported');
        if (!formData.amount || !amountHooligans || amountHooligans.eq(0))
          throw new Error('No amount set');
        if (amountHooligans.lt(casualListing.minFillAmount))
          throw new Error(
            `This Listing requires a minimum fill amount of ${displayTokenAmount(
              casualListing.minFillAmount,
              CASUALS
            )}`
          );

        const data: string[] = [];
        const amountCasuals = amountHooligans.div(casualListing.pricePerCasual);
        let finalFromMode: FarmFromMode;

        txToast = new TransactionToast({
          loading: `Buying ${displayTokenAmount(
            amountCasuals,
            CASUALS
          )} for ${displayTokenAmount(amountHooligans, Hooligan)}...`,
          success: 'Fill successful.',
        });

        /// Fill Listing directly from HOOLIGAN
        if (tokenIn === Hooligan) {
          // No swap occurs, so we know exactly how many hooligans are going in.
          // We can select from INTERNAL, EXTERNAL, INTERNAL_EXTERNAL.
          finalFromMode = optimizeFromMode(amountHooligans, balances[Hooligan.address]);
        }

        /// Swap to HOOLIGAN and buy
        else if (tokenIn === Eth || tokenIn === Weth) {
          // Require a quote
          if (!formData.steps || !formData.amountOut)
            throw new Error(`No quote available for ${formData.token.symbol}`);

          const encoded = Farm.encodeStepsWithSlippage(
            formData.steps,
            values.settings.slippage / 100
          );
          data.push(...encoded);

          // At the end of the Swap step, the assets will be in our INTERNAL balance.
          // The Swap decides where to route them from (see handleQuote).
          finalFromMode = FarmFromMode.INTERNAL_TOLERANT;
        } else {
          throw new Error(
            `Filling a Listing via ${tokenIn.symbol} is not currently supported`
          );
        }

        console.debug(
          `[FillListing] using FarmFromMode = ${finalFromMode}`,
          casualListing
        );

        data.push(
          hooliganhorde.interface.encodeFunctionData('fillCasualListing', [
            {
              account: casualListing.account,
              index: Hooligan.stringify(casualListing.index),
              start: Hooligan.stringify(casualListing.start),
              amount: Hooligan.stringify(casualListing.amount),
              pricePerCasual: Hooligan.stringify(casualListing.pricePerCasual),
              maxDraftableIndex: Hooligan.stringify(
                casualListing.maxDraftableIndex
              ),
              minFillAmount: Hooligan.stringify(casualListing.minFillAmount || 0), // minFillAmount for listings is measured in Hooligans
              mode: casualListing.mode,
            },
            Hooligan.stringify(amountHooligans),
            finalFromMode,
          ])
        );

        const overrides = { value: formData.value };
        console.debug('[FillListing] ', {
          length: data.length,
          data,
          overrides,
        });

        const txn =
          data.length === 1
            ? await signer.sendTransaction({
                to: hooliganhorde.address,
                data: data[0],
                ...overrides,
              })
            : await hooliganhorde.farm(data, overrides);
        txToast.confirming(txn);

        const receipt = await txn.wait();
        await Promise.all([
          refetchGuvnorField(), // refresh turfs; increment casuals
          refetchGuvnorBalances(), // decrement balance of tokenIn
          // FIXME: refresh listings
        ]);
        txToast.success(receipt);
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
      Hooligan,
      casualListing,
      signer,
      Eth,
      Weth,
      hooliganhorde,
      refetchGuvnorField,
      refetchGuvnorBalances,
      balances,
      middleware,
    ]
  );

  return (
    <Formik<FillListingFormValues>
      enableReinitialize
      initialValues={initialValues}
      onSubmit={onSubmit}
    >
      {(formikProps: FormikProps<FillListingFormValues>) => (
        <>
          <TxnSettings placement="condensed-form-top-right">
            <SettingInput
              name="settings.slippage"
              label="Slippage Tolerance"
              endAdornment="%"
            />
          </TxnSettings>
          <FillListingV2Form
            casualListing={casualListing}
            handleQuote={handleQuote}
            contract={hooliganhorde}
            farm={farm}
            {...formikProps}
          />
        </>
      )}
    </Formik>
  );
};

export default FillListingForm;
