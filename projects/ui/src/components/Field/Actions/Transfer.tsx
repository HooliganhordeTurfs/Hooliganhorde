import React, { useCallback, useMemo } from 'react';
import { Accordion, AccordionDetails, Box, Stack } from '@mui/material';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import BigNumber from 'bignumber.js';
import AddressInputField from '~/components/Common/Form/AddressInputField';
import FieldWrapper from '~/components/Common/Form/FieldWrapper';
import {
  TurfFragment,
  TurfSettingsFragment,
  SmartSubmitButton,
  TxnPreview,
  TxnSeparator,
} from '~/components/Common/Form';
import TransactionToast from '~/components/Common/TxnToast';
import TurfInputField from '~/components/Common/Form/TurfInputField';
import { useSigner } from '~/hooks/ledger/useSigner';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useAccount from '~/hooks/ledger/useAccount';
import useGuvnorTurfs from '~/hooks/guvnor/useGuvnorTurfs';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import { ZERO_BN } from '~/constants';
import { CASUALS } from '~/constants/tokens';
import { displayFullBN, toStringBaseUnitBN, trimAddress } from '~/util';
import { ActionType } from '~/util/Actions';
import StyledAccordionSummary from '~/components/Common/Accordion/AccordionSummary';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import { useFetchGuvnorField } from '~/state/guvnor/field/updater';

import { FC } from '~/types';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import useSdk from '~/hooks/sdk';
import { StepGenerator } from '@xblackfury/sdk';
import { ethers } from 'ethers';

export type TransferFormValues = {
  turf: TurfFragment;
  to: string | null;
  selectedTurfs: TurfFragment[];
  settings: TurfSettingsFragment & {
    slippage: number; // 0.1%
  };
  totalAmount: BigNumber;
};

export interface SendFormProps {}

const TransferForm: FC<SendFormProps & FormikProps<TransferFormValues>> = ({
  values,
  isValid,
  isSubmitting,
}) => {
  const sdk = useSdk();
  /// Data
  const turfs = useGuvnorTurfs();
  const draftableIndex = useDraftableIndex();

  /// Derived
  const turf = values.turf;
  const isReady =
    turf.index && values.to && turf.start && turf.amount?.gt(0) && isValid;

  return (
    <Form autoComplete="off">
      <Stack gap={1}>
        <TurfInputField turfs={turfs} multiSelect />
        {turf.index && (
          <FieldWrapper label="Transfer to">
            <AddressInputField name="to" />
          </FieldWrapper>
        )}
        {/* Txn info */}
        {values.to && turf.amount && turf.start && turf.index && (
          <>
            <TxnSeparator />
            <TokenOutput>
              {values.selectedTurfs !== undefined &&
              values.selectedTurfs.length > 1 ? (
                <TokenOutput.Row
                  amount={values.totalAmount.negated()}
                  token={sdk.tokens.CASUALS}
                />
              ) : (
                <TokenOutput.Row
                  amount={turf.amount.negated()}
                  token={sdk.tokens.CASUALS}
                />
              )}
            </TokenOutput>
            <Box>
              <Accordion variant="outlined">
                <StyledAccordionSummary title="Transaction Details" />
                <AccordionDetails>
                  <TxnPreview
                    actions={
                      values.selectedTurfs !== undefined &&
                      values.selectedTurfs.length > 1
                        ? [
                            {
                              type: ActionType.TRANSFER_MULTIPLE_TURFS,
                              amount: values.totalAmount || ZERO_BN,
                              address: values.to !== null ? values.to : '',
                              turfs: values.selectedTurfs.length,
                            },
                            {
                              type: ActionType.END_TOKEN,
                              token: CASUALS,
                            },
                          ]
                        : [
                            {
                              type: ActionType.TRANSFER_CASUALS,
                              amount: turf.amount || ZERO_BN,
                              address: values.to !== null ? values.to : '',
                              placeInLine: new BigNumber(turf.index)
                                .minus(draftableIndex)
                                .plus(turf.start),
                            },
                            {
                              type: ActionType.END_TOKEN,
                              token: CASUALS,
                            },
                          ]
                    }
                  />
                </AccordionDetails>
              </Accordion>
            </Box>
          </>
        )}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={!isReady || isSubmitting}
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          tokens={[]}
          mode="auto"
        >
          Transfer
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

const Transfer: FC<{}> = () => {
  /// Ledger
  const account = useAccount();
  const { data: signer } = useSigner();
  const hooliganhorde = useHooliganhordeContract(signer);
  const sdk = useSdk();
  const workflow = sdk.farm.create('Multi Turf Transfer!', 'hooliganhorde');
  const _hooliganhorde = sdk.contracts.hooliganhorde;

  /// Guvnor
  const [refetchGuvnorField] = useFetchGuvnorField();

  /// Form setup
  const middleware = useFormMiddleware();
  const initialValues: TransferFormValues = useMemo(
    () => ({
      turf: {
        index: null,
        start: null,
        end: null,
        amount: null,
      },
      selectedTurfs: [],
      totalAmount: BigNumber(0),
      to: null,
      settings: {
        slippage: 0.1, // 0.1%
        showRangeSelect: false,
      },
    }),
    []
  );

  /// Handlers
  const onSubmit = useCallback(
    async (
      values: TransferFormValues,
      formActions: FormikHelpers<TransferFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();

        if (!account) throw new Error('Connect a wallet first.');
        const {
          to,
          turf: { index, start, end, amount },
        } = values;
        if (!to || !index || !start || !end || !amount)
          throw new Error('Missing data.');

        let txn;

        if (values.selectedTurfs.length === 1) {
          txToast = new TransactionToast({
            loading: `Transferring ${displayFullBN(
              amount.abs(),
              CASUALS.decimals
            )} Casuals to ${trimAddress(to, true)}...`,
            success: 'Turf Transfer successful.',
          });

          const call = hooliganhorde.transferTurf(
            account,
            to.toString(),
            toStringBaseUnitBN(index, CASUALS.decimals),
            toStringBaseUnitBN(start, CASUALS.decimals),
            toStringBaseUnitBN(end, CASUALS.decimals)
          );
          txn = await call;
        } else {
          for (let i = 0; i < values.selectedTurfs.length; i++) {
            let index = values.selectedTurfs[i].index!;
            let start = values.selectedTurfs[i].start!;
            let end = values.selectedTurfs[i].end!;
            let data: StepGenerator = (_amountInStep) => ({
              name: 'transferTurf',
              amountOut: _amountInStep,
              prepare: () => ({
                target: _hooliganhorde.address,
                callData: _hooliganhorde.interface.encodeFunctionData(
                  'transferTurf',
                  [
                    account,
                    to.toString(),
                    toStringBaseUnitBN(index, CASUALS.decimals),
                    toStringBaseUnitBN(start, CASUALS.decimals),
                    toStringBaseUnitBN(end, CASUALS.decimals),
                  ]
                ),
              }),
              decode: (data: string) =>
                _hooliganhorde.interface.decodeFunctionResult('transferTurf', data),
              decodeResult: (result: string) =>
                _hooliganhorde.interface.decodeFunctionResult(
                  'transferTurf',
                  result
                ),
            });
            workflow.add(data);
          }

          txToast = new TransactionToast({
            loading: `Transferring ${displayFullBN(
              values.totalAmount.abs(),
              CASUALS.decimals
            )} Casuals in ${values.selectedTurfs.length} Turfs to ${trimAddress(
              to,
              true
            )}...`,
            success: 'Multi Turf Transfer successful.',
          });

          txn = await workflow.execute(ethers.BigNumber.from(0), {
            slippage: values.settings.slippage,
          });
        }

        txToast.confirming(txn);

        const receipt = await txn.wait();
        await Promise.all([refetchGuvnorField()]);

        txToast.success(receipt);
        formActions.resetForm();
        values.selectedTurfs = [];
      } catch (err) {
        if (txToast) {
          txToast.error(err);
        } else {
          const errorToast = new TransactionToast({});
          errorToast.error(err);
        }
      }
    },
    [account, hooliganhorde, refetchGuvnorField, middleware]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {(formikProps: FormikProps<TransferFormValues>) => (
        <TransferForm {...formikProps} />
      )}
    </Formik>
  );
};

export default Transfer;
