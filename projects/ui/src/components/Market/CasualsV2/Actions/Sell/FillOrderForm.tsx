import { Stack } from '@mui/material';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import React, { useCallback, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useNavigate } from 'react-router-dom';
import TurfInputField from '~/components/Common/Form/TurfInputField';
import TransactionToast from '~/components/Common/TxnToast';
import {
  TurfFragment,
  TurfSettingsFragment,
  SmartSubmitButton,
  TxnSeparator,
} from '~/components/Common/Form';
import FarmModeField from '~/components/Common/Form/FarmModeField';
import useGuvnorTurfs from '~/hooks/guvnor/useGuvnorTurfs';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useChainConstant from '~/hooks/chain/useChainConstant';
import { useSigner } from '~/hooks/ledger/useSigner';
import { TurfMap } from '~/util';
import { FarmToMode } from '~/lib/Hooliganhorde/Farm';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import { ZERO_BN } from '~/constants';
import { useFetchGuvnorField } from '~/state/guvnor/field/updater';
import { useFetchGuvnorBalances } from '~/state/guvnor/balances/updater';
import { CasualOrder } from '~/state/guvnor/market';
import { FC } from '~/types';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import useSdk from '~/hooks/sdk';

export type FillOrderFormValues = {
  turf: TurfFragment;
  destination: FarmToMode | undefined;
  settings: TurfSettingsFragment & {};
};

const FillOrderV2Form: FC<
  FormikProps<FillOrderFormValues> & {
    casualOrder: CasualOrder;
    turfs: TurfMap<BigNumber>;
    draftableIndex: BigNumber;
  }
> = ({
  values,
  isSubmitting,
  casualOrder,
  turfs: allTurfs, // rename to prevent collision
  draftableIndex,
}) => {
  const sdk = useSdk();
  /// Derived
  const turf = values.turf;
  const [eligibleTurfs, numEligibleTurfs] = useMemo(
    () =>
      Object.keys(allTurfs).reduce<[TurfMap<BigNumber>, number]>(
        (prev, curr) => {
          const indexBN = new BigNumber(curr);
          if (indexBN.minus(draftableIndex).lt(casualOrder.maxPlaceInLine)) {
            prev[0][curr] = allTurfs[curr];
            prev[1] += 1;
          }
          return prev;
        },
        [{}, 0]
      ),
    [allTurfs, draftableIndex, casualOrder.maxPlaceInLine]
  );

  // const placeInLine   = turf.index ? new BigNumber(turf.index).minus(draftableIndex) : undefined;
  const hooligansReceived = turf.amount?.times(casualOrder.pricePerCasual) || ZERO_BN;
  const isReady = numEligibleTurfs > 0 && turf.index && turf.amount?.gt(0);

  return (
    <Form autoComplete="off" noValidate>
      <Stack gap={1}>
        <TurfInputField
          turfs={eligibleTurfs}
          max={casualOrder.casualAmountRemaining}
          disabledAdvanced
          size="small"
        />
        <FarmModeField name="destination" />
        {isReady && (
          <>
            <TxnSeparator mt={0} />
            <TokenOutput size="small">
              <TokenOutput.Row
                token={sdk.tokens.HOOLIGAN}
                amount={hooligansReceived}
                size="small"
              />
            </TokenOutput>
            {/* <Box>
              <Accordion variant="outlined">
                <StyledAccordionSummary title="Transaction Details" />
                <AccordionDetails>
                  <TxnPreview
                    actions={[
                      {
                        type: ActionType.SELL_CASUALS,
                        casualAmount: turf.amount ? turf.amount : ZERO_BN,
                        placeInLine: placeInLine !== undefined ? placeInLine : ZERO_BN
                      },
                      {
                        type: ActionType.RECEIVE_HOOLIGANS,
                        amount: hooligansReceived,
                        destination: values.destination,
                      },
                    ]}
                  />
                </AccordionDetails>
              </Accordion>
            </Box> */}
          </>
        )}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={!(isReady && values.destination)}
          type="submit"
          variant="contained"
          color="primary"
          tokens={[]}
          mode="auto"
        >
          {numEligibleTurfs === 0 ? 'No eligible Turfs' : 'Fill'}
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

const FillOrderForm: FC<{ casualOrder: CasualOrder }> = ({ casualOrder }) => {
  /// Tokens
  const Hooligan = useChainConstant(HOOLIGAN);

  /// Ledger
  const { data: signer } = useSigner();
  const hooliganhorde = useHooliganhordeContract(signer);

  /// Hooliganhorde
  const draftableIndex = useDraftableIndex();

  /// Guvnor
  const allTurfs = useGuvnorTurfs();
  const [refetchGuvnorField] = useFetchGuvnorField();
  const [refetchGuvnorBalances] = useFetchGuvnorBalances();

  /// Form
  const middleware = useFormMiddleware();
  const initialValues: FillOrderFormValues = useMemo(
    () => ({
      turf: {
        index: null,
        start: ZERO_BN,
        end: null,
        amount: null,
      },
      destination: undefined,
      settings: {
        showRangeSelect: false,
      },
    }),
    []
  );

  /// Navigation
  const navigate = useNavigate();

  /// Handlers
  const onSubmit = useCallback(
    async (
      values: FillOrderFormValues,
      formActions: FormikHelpers<FillOrderFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        const { index, start, amount } = values.turf;
        if (!index) throw new Error('No turf selected');
        const numCasuals = allTurfs[index];
        if (!numCasuals) throw new Error('Turf not recognized.');
        if (!start || !amount) throw new Error('Malformatted turf data.');
        if (!values.destination) throw new Error('No destination selected.');
        if (amount.lt(new BigNumber(1)))
          throw new Error('Amount not greater than minFillAmount.');

        console.debug('[FillOrder]', {
          numCasuals: numCasuals.toString(),
          index: index.toString(),
          start: start.toString(),
          amount: amount.toString(),
          sum: start.plus(amount).toString(),
          params: [
            {
              account: casualOrder.account,
              maxPlaceInLine: Hooligan.stringify(casualOrder.maxPlaceInLine),
              pricePerCasual: Hooligan.stringify(casualOrder.pricePerCasual),
              minFillAmount: CASUALS.stringify(casualOrder.minFillAmount || 0), // minFillAmount for Orders is measured in Casuals
            },
            Hooligan.stringify(index),
            Hooligan.stringify(start),
            Hooligan.stringify(amount),
            values.destination,
          ],
        });

        txToast = new TransactionToast({
          loading: 'Filling Order...',
          // loading: `Selling ${displayTokenAmount(amount, CASUALS)} for ${displayTokenAmount(amount.multipliedBy(casualOrder.pricePerCasual), Hooligan)}.`,
          success: 'Fill successful.',
        });

        const txn = await hooliganhorde.fillCasualOrder(
          {
            account: casualOrder.account,
            maxPlaceInLine: Hooligan.stringify(casualOrder.maxPlaceInLine),
            pricePerCasual: Hooligan.stringify(casualOrder.pricePerCasual),
            minFillAmount: CASUALS.stringify(casualOrder.minFillAmount || 0), // minFillAmount for Orders is measured in Casuals
          },
          Hooligan.stringify(index), // index of turf to sell
          Hooligan.stringify(start), // start index within turf
          Hooligan.stringify(amount), // amount of casuals to sell
          values.destination
        );
        txToast.confirming(txn);

        const receipt = await txn.wait();
        await Promise.all([
          refetchGuvnorField(), // refresh turfs; decrement casuals
          refetchGuvnorBalances(), // increment balance of HOOLIGAN received
          // FIXME: refresh orders
        ]);
        txToast.success(receipt);
        formActions.resetForm();

        // Return to market index, open Your Orders
        navigate('/market/sell');
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
      allTurfs,
      casualOrder.account,
      casualOrder.maxPlaceInLine,
      casualOrder.pricePerCasual,
      casualOrder.minFillAmount,
      Hooligan,
      hooliganhorde,
      refetchGuvnorField,
      refetchGuvnorBalances,
      navigate,
    ]
  );

  return (
    <Formik<FillOrderFormValues>
      initialValues={initialValues}
      onSubmit={onSubmit}
    >
      {(formikProps: FormikProps<FillOrderFormValues>) => (
        <FillOrderV2Form
          casualOrder={casualOrder}
          turfs={allTurfs}
          draftableIndex={draftableIndex}
          {...formikProps}
        />
      )}
    </Formik>
  );
};

export default FillOrderForm;
