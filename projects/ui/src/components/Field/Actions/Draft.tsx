import React, { useCallback, useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import BigNumber from 'bignumber.js';
import { FarmToMode, Token, TokenValue } from '@xblackfury/sdk';
import {
  FormTxnsFormState,
  SmartSubmitButton,
  TokenInputField,
  TxnPreview,
  TxnSeparator,
} from '~/components/Common/Form';
import { ActionType } from '~/util/Actions';
import { displayFullBN } from '~/util';
import useGuvnorField from '~/hooks/guvnor/useGuvnorField';
import copy from '~/constants/copy';
import FarmModeField from '~/components/Common/Form/FarmModeField';
import TransactionToast from '~/components/Common/TxnToast';
import { ZERO_BN } from '~/constants';
import TokenAdornment from '~/components/Common/Form/TokenAdornment';
import { FC } from '~/types';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import Row from '~/components/Common/Row';
import TokenIcon from '~/components/Common/TokenIcon';
import useSdk from '~/hooks/sdk';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import TxnAccordion from '~/components/Common/TxnAccordion';
import useAccount from '~/hooks/ledger/useAccount';
import useGuvnorFormTxnsActions from '~/hooks/guvnor/form-txn/useGuvnorFormTxnActions';
import AdditionalTxnsAccordion from '~/components/Common/Form/FormTxn/AdditionalTxnsAccordion';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import { FormTxn, DraftFarmStep } from '~/lib/Txn';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';

// -----------------------------------------------------------------------

type DraftFormValues = {
  amount: BigNumber;
  destination: FarmToMode | undefined;
} & FormTxnsFormState;

type Props = FormikProps<DraftFormValues> & {
  CASUALS: Token;
  draftableCasuals: BigNumber;
};

const QuickDraftForm: FC<Props> = ({
  // Custom
  draftableCasuals,
  CASUALS,
  // Formike
  values,
  isSubmitting,
}) => {
  /// Derived
  const amount = draftableCasuals;
  const isSubmittable =
    amount && amount.gt(0) && values.destination !== undefined;

  return (
    <Form autoComplete="off" noValidate>
      <Stack gap={1}>
        <Stack px={0.5} spacing={0.5}>
          <Row justifyContent="space-between">
            <Typography color="primary">Draftable Casuals</Typography>
            <Row gap={0.5}>
              <TokenIcon token={CASUALS} />
              <Typography variant="h3">{displayFullBN(amount, 0)}</Typography>
            </Row>
          </Row>
          <FarmModeField name="destination" />
        </Stack>
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={!isSubmittable || isSubmitting}
          type="submit"
          variant="contained"
          color="primary"
          size="medium"
          tokens={[]}
          mode="auto"
        >
          Draft
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

// -----------------------------------------------------------------------

const DraftForm: FC<Props> = ({
  // Custom
  draftableCasuals,
  CASUALS,
  // Formik
  values,
  isSubmitting,
}) => {
  const sdk = useSdk();
  const txnActions = useGuvnorFormTxnsActions();

  /// Derived
  const amount = draftableCasuals;
  const isSubmittable =
    amount && amount.gt(0) && values.destination !== undefined;

  return (
    <Form autoComplete="off" noValidate>
      <Stack gap={1}>
        {/* Claimable Token */}
        <TokenInputField
          name="amount"
          balance={amount}
          balanceLabel="Draftable Balance"
          disabled
          InputProps={{
            endAdornment: <TokenAdornment token={CASUALS} />,
          }}
        />
        {values.amount?.gt(0) ? (
          <>
            {/* Setting: Destination */}
            <FarmModeField name="destination" />
            <TxnSeparator mt={-1} />
            <TokenOutput>
              <TokenOutput.Row
                token={sdk.tokens.HOOLIGAN}
                amount={values.amount || ZERO_BN}
              />
            </TokenOutput>
            {/* <Box>
              <Alert
                color="warning"
                icon={
                  <IconWrapper boxSize={IconSize.medium}><WarningAmberIcon
                    sx={{ fontSize: IconSize.small }} />
                  </IconWrapper>
                }
              >
                You can Draft your Casuals and Deposit Hooligans into the Firm in one transaction on the&nbsp;
                <Link href={`/#/firm/${hooligan.address}`}>Hooligan</Link> or <Link href={`/#/firm/${lp.address}`}>LP</Link> Deposit
                page.
              </Alert>
            </Box> */}
            <AdditionalTxnsAccordion />
            <Box>
              <TxnAccordion defaultExpanded={false}>
                <TxnPreview
                  actions={[
                    {
                      type: ActionType.DRAFT,
                      amount: amount,
                    },
                    {
                      type: ActionType.RECEIVE_HOOLIGANS,
                      amount: amount,
                      destination: values.destination,
                    },
                  ]}
                  {...txnActions}
                />
              </TxnAccordion>
            </Box>
          </>
        ) : null}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={!isSubmittable || isSubmitting}
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          tokens={[]}
          mode="auto"
        >
          Draft
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

const DraftPropProvider: FC<{ quick?: boolean }> = ({ quick = false }) => {
  const sdk = useSdk();
  const account = useAccount();

  const casuals = sdk.tokens.CASUALS;

  /// Guvnor
  const guvnorField = useGuvnorField();

  /// Form
  const middleware = useFormMiddleware();
  const { txnBundler, refetch } = useFormTxnContext();

  const initialValues: DraftFormValues = useMemo(
    () => ({
      amount: guvnorField.draftableCasuals || null,
      destination: undefined,
      farmActions: {
        preset: 'noPrimary',
        primary: undefined,
        secondary: undefined,
        exclude: [FormTxn.DRAFT],
      },
    }),
    [guvnorField.draftableCasuals]
  );

  /// Handlers
  const onSubmit = useCallback(
    async (
      values: DraftFormValues,
      formActions: FormikHelpers<DraftFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();

        if (!account) {
          throw new Error('Connect a wallet first.');
        }
        if (!guvnorField.draftableCasuals.gt(0)) {
          throw new Error('No Draftable Casuals.');
        }
        if (!guvnorField.draftableTurfs) {
          throw new Error('No Draftable Turfs.');
        }
        if (!values.destination) {
          throw new Error('No destination set.');
        }

        txToast = new TransactionToast({
          loading: `Drafting ${displayFullBN(
            guvnorField.draftableCasuals,
            casuals.displayDecimals
          )} Casuals.`,
          success: `Draft successful. Added ${displayFullBN(
            guvnorField.draftableCasuals,
            casuals.displayDecimals
          )} Hooligans to your ${copy.MODES[values.destination]}.`,
        });

        const _turfIds = Object.keys(guvnorField.draftableTurfs);
        const turfIds = _turfIds.map((turfIndex) =>
          casuals.amount(turfIndex).toBlockchain()
        );

        const draftTxn = new DraftFarmStep(sdk, turfIds);
        draftTxn.build(values.destination);

        const actionsPerformed = txnBundler.setFarmSteps(values.farmActions);
        const { execute } = await txnBundler.bundle(
          draftTxn,
          TokenValue.ZERO,
          0.1
        );

        const txn = await execute();
        txToast.confirming(txn);

        const receipt = await txn.wait();

        await refetch(actionsPerformed, {
          guvnorField: true,
          guvnorBalances: true,
        });

        txToast.success(receipt);
        formActions.resetForm();
      } catch (err) {
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
      account,
      guvnorField.draftableCasuals,
      guvnorField.draftableTurfs,
      casuals,
      sdk,
      txnBundler,
      refetch,
    ]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {(formikProps) => (
        <Stack spacing={1}>
          {quick ? (
            <QuickDraftForm
              draftableCasuals={guvnorField.draftableCasuals}
              CASUALS={casuals}
              {...formikProps}
            />
          ) : (
            <DraftForm
              draftableCasuals={guvnorField.draftableCasuals}
              CASUALS={casuals}
              {...formikProps}
            />
          )}
        </Stack>
      )}
    </Formik>
  );
};

const Draft: React.FC<{ quick?: boolean }> = (props) => (
  <FormTxnProvider>
    <DraftPropProvider {...props} />
  </FormTxnProvider>
);

export default Draft;
