import React, { useCallback, useEffect, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useFormikContext } from 'formik';
import { Box, Grid, Typography } from '@mui/material';
import useToggle from '~/hooks/display/useToggle';
import { displayBN, MaxBN, MinBN, TurfMap } from '~/util';
import TurfSelectDialog from '~/components/Field/TurfSelectDialog';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import { CASUALS } from '~/constants/tokens';

import { ZERO_BN } from '~/constants';
import {
  TurfFragment,
  TurfSettingsFragment,
  TokenAdornment,
  TokenInputField,
} from '.';
import AdvancedButton from './AdvancedButton';
import SliderField from './SliderField';
import Row from '~/components/Common/Row';

import { FC } from '~/types';
import { TokenInputProps } from '~/components/Common/Form/TokenInputField';
import useAccount from '~/hooks/ledger/useAccount';

const SLIDER_FIELD_KEYS = ['turf.start', 'turf.end'];
const InputPropsLeft = { endAdornment: 'Start' };
const InputPropsRight = { endAdornment: 'End' };

const TurfInputField: FC<
  {
    /** All turfs that are selectable via the input field */
    turfs: TurfMap<BigNumber>;
    /** The maximum number of casuals that can be entered into the input */
    max?: BigNumber;
    /** */
    disabledAdvanced?: boolean;
    /** Enable multi turf selection */
    multiSelect?: boolean;
  } & TokenInputProps
> = ({ turfs, max, disabledAdvanced = false, multiSelect, ...props }) => {
  /// Form state
  const { values, setFieldValue, isSubmitting } = useFormikContext<{
    /// These fields are required in the parent's Formik state
    turf: TurfFragment;
    selectedTurfs: TurfFragment[];
    totalAmount: BigNumber;
    settings: TurfSettingsFragment;
  }>();

  /// Local state
  const [dialogOpen, showDialog, hideDialog] = useToggle();

  /// Data
  const draftableIndex = useDraftableIndex();

  /// Account
  const account = useAccount();

  useMemo(() => {
    setFieldValue('selectedTurfs', []);
    setFieldValue('totalAmount', undefined);
    setFieldValue('turf.amount', undefined);
    setFieldValue('turf.index', undefined);
    setFieldValue('turf.start', undefined);
    setFieldValue('turf.end', undefined);
  }, [account]);

  /// Find the currently selected turf from form state.
  /// If selected, grab the number of casuals from the guvnor's field state.
  const turf = values.turf;
  const [numCasuals, numCasualsFloat] = useMemo(() => {
    if (!turf.index) return [ZERO_BN, 0];
    const _casuals = turfs[turf.index];
    return [_casuals, _casuals.toNumber()];
  }, [turfs, turf.index]);

  const selectedTurfsAmount =
    values.selectedTurfs == undefined ? 0 : values.selectedTurfs.length;
  /// Button to select a new turf
  const InputProps = useMemo(
    () => ({
      endAdornment: (
        <TokenAdornment
          token={CASUALS}
          onClick={showDialog}
          buttonLabel={
            values.selectedTurfs == undefined ||
            values.selectedTurfs.length < 2 ? (
              turf.index ? (
                <Row gap={0.75}>
                  <Typography display="inline" fontSize={16}>
                    @
                  </Typography>
                  {displayBN(new BigNumber(turf.index).minus(draftableIndex))}
                </Row>
              ) : (
                'Select Turfs'
              )
            ) : (
              <Row gap={0.75}>
                {`${selectedTurfsAmount > 1 ? selectedTurfsAmount : 0} TURFS`}
              </Row>
            )
          }
          size={props.size}
        />
      ),
    }),
    [draftableIndex, turf.index, showDialog, props.size, selectedTurfsAmount]
  );

  /// "Advanced" control in the Quote slot
  const Quote = useMemo(
    () =>
      disabledAdvanced ? undefined : (
        <AdvancedButton
          open={values.settings.showRangeSelect}
          onClick={() =>
            setFieldValue(
              'settings.showRangeSelect',
              !values.settings.showRangeSelect
            )
          }
        />
      ),
    [disabledAdvanced, setFieldValue, values.settings.showRangeSelect]
  );

  /// Clamp
  const clamp = useCallback(
    (amount: BigNumber | undefined) => {
      if (!amount) return undefined;
      if (amount.lt(0)) return ZERO_BN;
      if (max && amount.gt(max)) return max;
      return amount;
    },
    [max]
  );

  /// Update `start` and `end` based on `amount`
  const onChangeAmount = useCallback(
    (amount: BigNumber | undefined) => {
      if (!amount) {
        /// If the user clears the amount input, set start/end to the end
        /// of the Turf; amount will get set to zero by below effect
        setFieldValue('turf.start', numCasuals);
        setFieldValue('turf.end', numCasuals);
      } else {
        /// Expand the turf turf range assuming that the right handle is fixed:
        ///
        /// turf                              start     end     amount    next action
        /// -----------------------------------------------------------------------------------
        /// 0 [     |---------|     ] 1000    300       600     300       increase amount by 150
        /// 0 [  |------------|     ] 1000    150       600     450       increase amount by 300
        /// 0 [------------------|  ] 1000    0         750     750       increase amount by 150
        /// 0 [---------------------] 1000    0         1000    1000      reached maximum amount
        const delta = (turf?.end || ZERO_BN).minus(amount);
        setFieldValue('turf.start', MaxBN(ZERO_BN, delta));
        if (delta.lt(0)) {
          setFieldValue(
            'turf.end',
            MinBN(numCasuals, (turf?.end || ZERO_BN).plus(delta.abs()))
          );
        }
      }
    },
    [numCasuals, turf?.end, setFieldValue]
  );

  /// Select a new turf
  const handleTurfSelect = useCallback(
    (index: string) => {
      if (!values.selectedTurfs) {
        values.selectedTurfs = [];
      }
      const indexOf = values.selectedTurfs.findIndex(
        (item) => item.index == index
      );
      if (
        values.selectedTurfs == undefined ||
        values.selectedTurfs.length == 0 ||
        indexOf < 0
      ) {
        if (multiSelect) {
          values.selectedTurfs.push({
            amount: turfs[index],
            index: index,
            start: ZERO_BN,
            end: turfs[index],
          });
        } else {
          values.selectedTurfs[0] = {
            amount: turfs[index],
            index: index,
            start: ZERO_BN,
            end: turfs[index],
          };
        }
      } else {
        if (values.selectedTurfs.length > 1) {
          values.selectedTurfs.splice(indexOf, 1);
        }
      }
      const numCasualsClamped = clamp(
        new BigNumber(values.selectedTurfs[0].amount!)
      );
      let total: any[] = [];
      values.selectedTurfs.forEach((element) => {
        total.push(element.amount);
      });
      let totalSum = BigNumber.sum.apply(null, total);
      setFieldValue('totalAmount', totalSum);
      setFieldValue('turf.amount', numCasualsClamped);
      setFieldValue('turf.index', values.selectedTurfs[0].index);
      // set start/end directly since `onChangeAmount` depends on the current `turf`
      setFieldValue('turf.start', ZERO_BN);
      setFieldValue('turf.end', numCasualsClamped);
    },
    [clamp, turfs, setFieldValue, multiSelect, values.selectedTurfs]
  );

  /// Update amount when an endpoint changes via the advanced controls
  /// If one of end/start change, so does the amount input.
  /// Values are changed when the slider moves or a manual input changes.
  useEffect(() => {
    const clampedAmount = clamp(turf.end?.minus(turf.start || ZERO_BN));
    setFieldValue('turf.amount', clampedAmount);
  }, [setFieldValue, turf.end, turf.start, clamp]);

  return (
    <>
      <TurfSelectDialog
        turfs={turfs}
        draftableIndex={draftableIndex}
        handleTurfSelect={handleTurfSelect}
        handleClose={hideDialog}
        selected={values.selectedTurfs}
        open={dialogOpen}
        multiSelect={multiSelect}
      />
      {values.selectedTurfs == undefined ||
        (values.selectedTurfs.length < 2 && (
          <TokenInputField
            name="turf.amount"
            fullWidth
            max={max}
            InputProps={InputProps}
            balance={numCasuals}
            hideBalance={!turf.index}
            balanceLabel={turf.index ? 'Turf Size' : undefined}
            onChange={onChangeAmount}
            quote={turf.index ? Quote : undefined}
            {...props}
          />
        ))}
      {values.selectedTurfs !== undefined &&
        values.selectedTurfs.length >= 2 && (
          <TokenInputField
            name={'totalAmount'}
            fullWidth
            InputProps={InputProps}
            placeholder={values.totalAmount.toString()}
            disabled={true}
            hideBalance={true}
            {...props}
          />
        )}
      {values.settings.showRangeSelect && (
        <>
          <Box px={1}>
            <SliderField
              min={0}
              max={numCasualsFloat}
              fields={SLIDER_FIELD_KEYS}
              initialState={[
                /// The slider is re-initialized whenever this
                /// section gets re-rendered.
                turf.start?.toNumber() || 0,
                turf.end?.toNumber() || numCasualsFloat,
              ]}
              disabled={isSubmitting}
              // changeMode="onChangeCommitted"
            />
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <TokenInputField
                name="turf.start"
                placeholder="0.0000"
                max={numCasuals}
                InputProps={InputPropsLeft}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TokenInputField
                name="turf.end"
                placeholder="0.0000"
                max={numCasuals}
                InputProps={InputPropsRight}
                size="small"
              />
            </Grid>
          </Grid>
        </>
      )}
    </>
  );
};

export default TurfInputField;
