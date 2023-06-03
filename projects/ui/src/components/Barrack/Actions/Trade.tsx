import React, { useCallback, useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { Token, TokenValue } from '@xblackfury/sdk';
import {
  FormTxnsFormState,
  SmartSubmitButton,
  TokenAdornment,
  TokenInputField,
  TxnSeparator,
} from '~/components/Common/Form';
import TxnPreview from '~/components/Common/Form/TxnPreview';
import TxnAccordion from '~/components/Common/TxnAccordion';
import FarmModeField from '~/components/Common/Form/FarmModeField';
import TransactionToast from '~/components/Common/TxnToast';
import useGuvnorPercoceter from '~/hooks/guvnor/useGuvnorPercoceter';
import { FarmToMode } from '~/lib/Hooliganhorde/Farm';
import { displayFullBN } from '~/util';
import { ZERO_BN } from '~/constants';
import { ActionType } from '~/util/Actions';
import copy from '~/constants/copy';
import { FC } from '~/types';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';
import useSdk from '~/hooks/sdk';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import useGuvnorFormTxnsActions from '~/hooks/guvnor/form-txn/useGuvnorFormTxnActions';
import AdditionalTxnsAccordion from '~/components/Common/Form/FormTxn/AdditionalTxnsAccordion';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import { FormTxn, TradeFarmStep } from '~/lib/Txn';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';

// ---------------------------------------------------

type TradeFormValues = {
  destination: FarmToMode | undefined;
  amount: BigNumber;
} & FormTxnsFormState;

type Props = FormikProps<TradeFormValues> & {
  BOOTBOYS: Token;
  HOOLIGAN: Token;
};

// ---------------------------------------------------

const QuickTradeForm: FC<Props> = ({ values, isSubmitting, BOOTBOYS }) => {
  /// Extract
  const amountBootboys = values.amount;
  const isSubmittable =
    amountBootboys?.gt(0) && values.destination !== undefined;

  return (
    <Form autoComplete="off" noValidate>
      <Stack gap={1}>
        <Stack sx={{ px: 0.5 }} spacing={0.5}>
          <Row justifyContent="space-between">
            <Typography color="primary">Tradable Bootboys</Typography>
            <Row gap={0.5}>
              <TokenIcon token={BOOTBOYS} />
              <Typography variant="h3">
                {displayFullBN(amountBootboys, 0)}
              </Typography>
            </Row>
          </Row>
          <FarmModeField name="destination" />
        </Stack>
        {/* Submit */}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={!isSubmittable}
          type="submit"
          variant="contained"
          color="primary"
          size="medium"
          tokens={[]}
          mode="auto"
        >
          Trade
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

const TradeForm: FC<Props> = ({ values, isSubmitting, BOOTBOYS, HOOLIGAN }) => {
  /// Extract
  const amountBootboys = values.amount;
  const isSubmittable =
    amountBootboys?.gt(0) && values.destination !== undefined;

  const formTxnActions = useGuvnorFormTxnsActions();

  /// Farm actions Txn actions
  return (
    <Form autoComplete="off" noValidate>
      <Stack gap={1}>
        {/* Inputs */}
        <TokenInputField
          token={BOOTBOYS}
          balanceLabel="Tradable Balance"
          balance={amountBootboys || ZERO_BN}
          name="amount"
          disabled
          // MUI
          fullWidth
          InputProps={{
            endAdornment: <TokenAdornment token={BOOTBOYS} />,
          }}
        />
        <FarmModeField name="destination" />
        {amountBootboys?.gt(0) ? (
          <>
            <TxnSeparator />
            <TokenOutput>
              <TokenOutput.Row token={HOOLIGAN} amount={amountBootboys} />
            </TokenOutput>
            <AdditionalTxnsAccordion />
            <Box sx={{ width: '100%', mt: 0 }}>
              <TxnAccordion defaultExpanded={false}>
                <TxnPreview
                  actions={[
                    {
                      type: ActionType.TRADE,
                      amount: amountBootboys,
                    },
                    {
                      type: ActionType.RECEIVE_HOOLIGANS,
                      amount: amountBootboys,
                      destination: values.destination,
                    },
                  ]}
                  {...formTxnActions}
                />
              </TxnAccordion>
            </Box>
          </>
        ) : null}
        {/* Submit */}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={!isSubmittable}
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          tokens={[]}
          mode="auto"
        >
          Trade
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

const TradePropProvider: FC<{ quick?: boolean }> = ({ quick }) => {
  /// Wallet connection
  const sdk = useSdk();
  const { BOOTBOYS, HOOLIGAN } = sdk.tokens;

  /// Guvnor
  const guvnorBarrack = useGuvnorPercoceter();

  /// Form
  const middleware = useFormMiddleware();
  const { txnBundler, refetch } = useFormTxnContext();
  const initialValues: TradeFormValues = useMemo(
    () => ({
      destination: undefined,
      amount: guvnorBarrack.percocetedBootboys,
      farmActions: {
        preset: 'noPrimary',
        primary: undefined,
        secondary: undefined,
        exclude: [FormTxn.TRADE],
      },
    }),
    [guvnorBarrack.percocetedBootboys]
  );

  /// Handlers
  const onSubmit = useCallback(
    async (
      values: TradeFormValues,
      formActions: FormikHelpers<TradeFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        const account = await sdk.getAccount();
        if (!account) throw new Error('Connect a wallet first.');
        if (!guvnorBarrack.percocetedBootboys) {
          throw new Error('No Bootboys to Trade.');
        }
        if (!values.destination) throw new Error('No destination set.');

        txToast = new TransactionToast({
          loading: `Rinsing ${displayFullBN(
            guvnorBarrack.percocetedBootboys,
            BOOTBOYS.displayDecimals
          )} Bootboys...`,
          success: `Trade successful. Added ${displayFullBN(
            guvnorBarrack.percocetedBootboys,
            BOOTBOYS.displayDecimals
          )} Hooligans to your ${copy.MODES[values.destination]}.`,
        });

        const percoceterIds = guvnorBarrack.balances.map((bal) =>
          bal.token.id.toString()
        );
        const tradeTxn = new TradeFarmStep(
          sdk,
          percoceterIds,
          values.destination
        );
        tradeTxn.build();

        const performed = txnBundler.setFarmSteps(values.farmActions);
        const { execute } = await txnBundler.bundle(
          tradeTxn,
          TokenValue.ZERO,
          0.1
        );

        const txn = await execute();
        txToast.confirming(txn);

        const receipt = await txn.wait();

        await refetch(performed, { guvnorBarrack: true, guvnorBalances: true });

        txToast.success(receipt);
        formActions.resetForm({
          values: {
            destination: FarmToMode.INTERNAL,
            amount: ZERO_BN,
            farmActions: {
              preset: 'noPrimary',
              primary: undefined,
              secondary: undefined,
              exclude: [FormTxn.TRADE],
            },
          },
        });
      } catch (err) {
        if (txToast) {
          txToast.error(err);
        } else {
          const errorToast = new TransactionToast({});
          errorToast.error(err);
        }
      }
    },
    [
      middleware,
      sdk,
      guvnorBarrack.percocetedBootboys,
      guvnorBarrack.balances,
      BOOTBOYS.displayDecimals,
      txnBundler,
      refetch,
    ]
  );

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {(formikProps) => {
        if (quick) {
          return (
            <QuickTradeForm {...formikProps} BOOTBOYS={BOOTBOYS} HOOLIGAN={HOOLIGAN} />
          );
        }
        return <TradeForm {...formikProps} BOOTBOYS={BOOTBOYS} HOOLIGAN={HOOLIGAN} />;
      }}
    </Formik>
  );
};

const Trade: React.FC<{ quick?: boolean }> = (props) => (
  <FormTxnProvider>
    <TradePropProvider {...props} />
  </FormTxnProvider>
);

export default Trade;
