/* eslint-disable */
import { InputAdornment, Box, Typography, Stack, Alert } from '@mui/material';
import BigNumber from 'bignumber.js';
import { FormikHelpers, Formik, FormikProps, Form } from 'formik';
import React, { useMemo } from 'react';
import { useSigner } from 'wagmi';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  TurfFragment,
  TurfSettingsFragment,
  SmartSubmitButton,
  TokenAdornment,
  TokenInputField,
  TxnPreview,
} from '~/components/Common/Form';
import FarmModeField from '~/components/Common/Form/FarmModeField';
import FieldWrapper from '~/components/Common/Form/FieldWrapper';
import TurfInputField from '~/components/Common/Form/TurfInputField';
import TxnAccordion from '~/components/Common/TxnAccordion';
import { ONE_BN, CASUAL_MARKET_TOOLTIPS, ZERO_BN } from '~/constants';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import useGuvnorListingsLedger from '~/hooks/guvnor/useGuvnorListingsLedger';
import useGuvnorTurfs from '~/hooks/guvnor/useGuvnorTurfs';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import { FarmToMode } from '~/lib/Hooliganhorde/Farm';
import { useFetchGuvnorMarket } from '~/state/guvnor/market/updater';
import { FC } from '~/types';
import {
  ActionType,
  displayBN,
  displayFullBN,
  displayTokenAmount,
  TurfMap,
  toStringBaseUnitBN,
} from '~/util';

export type CreateListingFormValues = {
  turf: TurfFragment;
  pricePerCasual: BigNumber | null;
  expiresAt: BigNumber | null;
  destination: FarmToMode | null;
  settings: TurfSettingsFragment & {};
};

const initValues = {
  turf: {
    index: null,
    amount: null,
    start: null,
    end: null,
  },
  pricePerCasual: null,
  expiresAt: null,
  destination: FarmToMode.INTERNAL,
  settings: {
    showRangeSelect: false,
  },
};

// const createSellListingAtom = atom<CreateListingFormValues>(initValues);

// const turfAtom = focusAtom(
//   createSellListingAtom,
//   (optic: OpticFor<CreateListingFormValues>) => optic.prop('turf')
// );
// const turfIndexAtom = focusAtom(turfAtom, (optic: OpticFor<TurfFragment>) =>
//   optic.prop('index')
// );
// const turfAmountAtom = focusAtom(turfAtom, (optic: OpticFor<TurfFragment>) =>
//   optic.prop('amount')
// );
// const turfStartAtom = focusAtom(turfAtom, (optic: OpticFor<TurfFragment>) =>
//   optic.prop('start')
// );
// const turfEndAtom = focusAtom(turfAtom, (optic: OpticFor<TurfFragment>) =>
//   optic.prop('end')
// );

const PricePerCasualInputProps = {
  inputProps: { step: '0.01' },
  endAdornment: <TokenAdornment token={HOOLIGAN[1]} />,
};
const ExpiresAtInputProps = {
  endAdornment: (
    <InputAdornment position="end">
      <Box sx={{ pr: 1 }}>
        <Typography color="text.primary" sx={{ fontSize: '18px' }}>
          Place in Line
        </Typography>
      </Box>
    </InputAdornment>
  ),
};

const REQUIRED_KEYS = [
  'turfIndex',
  'start',
  'end',
  'pricePerCasual',
  'expiresAt',
  'destination',
] as (keyof CreateListingFormValues)[];

const ListForm: FC<
  FormikProps<CreateListingFormValues> & {
    turfs: TurfMap<BigNumber>;
    draftableIndex: BigNumber;
  }
> = ({ values, isSubmitting, turfs, draftableIndex }) => {
  /// Form Data
  const turf = values.turf;

  /// Data
  const existingListings = useGuvnorListingsLedger();

  /// Derived
  const placeInLine = useMemo(() => {
    const _placeInLine = turf.index
      ? new BigNumber(turf.index).minus(draftableIndex)
      : ZERO_BN;
    return _placeInLine;
  }, [draftableIndex, turf.index]);

  /// Calculations
  const alreadyListed = turf?.index
    ? existingListings[toStringBaseUnitBN(turf.index, HOOLIGAN[1].decimals)]
    : false;
  const isSubmittable = !REQUIRED_KEYS.some((k) => values[k] === null);

  return (
    <Form autoComplete="off" noValidate>
      <Stack gap={1}>
        <TurfInputField turfs={turfs} />
        {turf.index && (
          <>
            {alreadyListed ? (
              <Alert
                variant="standard"
                color="warning"
                icon={<WarningAmberIcon />}
              >
                This Turf is already listed on the Market. Creating a new
                Listing will override the previous one.
              </Alert>
            ) : null}
            <FieldWrapper
              label="Price per Casual"
              tooltip={CASUAL_MARKET_TOOLTIPS.pricePerCasualListing}
            >
              <TokenInputField
                name="pricePerCasual"
                placeholder="0.0000"
                InputProps={PricePerCasualInputProps}
                max={ONE_BN}
              />
            </FieldWrapper>
            <FieldWrapper
              label="Expires in"
              tooltip={CASUAL_MARKET_TOOLTIPS.expiresAt}
            >
              <TokenInputField
                name="expiresAt"
                placeholder="0.0000"
                InputProps={ExpiresAtInputProps}
                max={placeInLine.plus(turf.start || ZERO_BN)}
              />
            </FieldWrapper>
            <FarmModeField
              name="destination"
              circDesc="When Casuals are sold, send Hooligans to your wallet."
              farmDesc="When Casuals are sold, send Hooligans to your internal Hooliganhorde balance."
              label="Send proceeds to"
            />
            {isSubmittable && (
              <Box>
                <TxnAccordion>
                  <TxnPreview
                    actions={[
                      {
                        type: ActionType.BASE,
                        message: `List ${displayTokenAmount(
                          turf.amount || ZERO_BN,
                          CASUALS
                        )} at ${displayFullBN(
                          values.pricePerCasual || ZERO_BN
                        )} Hooligans per Casual from your Turf at ${displayBN(
                          placeInLine
                        )} in the Casual Line.`,
                      },
                      {
                        type: ActionType.BASE,
                        message: `If the Casual Line moves forward by ${displayFullBN(
                          values.expiresAt || ZERO_BN
                        )} more Casuals, this Listing will automatically expire.`,
                      },
                      {
                        type: ActionType.BASE,
                        message: `Proceeds will be delivered to your ${
                          values.destination === FarmToMode.INTERNAL
                            ? 'Farm balance'
                            : 'Circulating balance'
                        }.`,
                      },
                    ]}
                  />
                </TxnAccordion>
              </Box>
            )}
          </>
        )}
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
          {alreadyListed ? 'Update Listing' : 'List'}
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

const CreateSellListing: React.FC<{}> = () => {
  /// Tokens
  const getChainToken = useGetChainToken();

  /// Ledger
  const { data: signer } = useSigner();
  const hooliganhorde = useHooliganhordeContract(signer);

  /// Hooliganhorde
  const draftableIndex = useDraftableIndex();

  /// Guvnor
  const turfs = useGuvnorTurfs();
  const [refetchGuvnorMarket] = useFetchGuvnorMarket();

  /// Form
  const middleware = useFormMiddleware();
  const initialValues: CreateListingFormValues = useMemo(
    () => ({ ...initValues }),
    []
  );

  const onSubmit = async (
    values: CreateListingFormValues,
    formActions: FormikHelpers<CreateListingFormValues>
  ) => {};

  return (
    <Formik<CreateListingFormValues>
      initialValues={initialValues}
      onSubmit={onSubmit}
    >
      {(formikProps: FormikProps<CreateListingFormValues>) => (
        <ListForm
          turfs={turfs}
          draftableIndex={draftableIndex}
          {...formikProps}
        />
      )}
    </Formik>
  );
};

export default CreateSellListing;
