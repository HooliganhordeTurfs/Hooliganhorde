/* eslint-disable */
import { InputAdornment, Slider, Stack, Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { atom, useAtom, useSetAtom } from 'jotai';
import BigNumber from 'bignumber.js';
import PlaceInLineSlider from '../Common/PlaceInLineSlider';
import { AppState } from '~/state';
import useToggle from '~/hooks/display/useToggle';
import {
  placeInLineAtom,
  selectedTurfAmountAtom,
  selectedTurfAtom,
  selectedTurfEndAtom,
  selectedTurfStartAtom,
} from '~/components/Market/CasualsV2/info/atom-context';
import useDraftableIndex from '~/hooks/hooliganhorde/useDraftableIndex';
import { ZERO_BN } from '~/constants';
import { TokenAdornment } from '~/components/Common/Form';
import { CASUALS } from '~/constants/tokens';
import { displayBN } from '~/util';
import AtomInputField from '~/components/Common/Atom/AtomInputField';
import TurfSelectDialog from '~/components/Field/TurfSelectDialog';
import Row from '~/components/Common/Row';

const SelectTurfField: React.FC<{}> = () => {
  // State
  const turfs = useSelector<AppState, AppState['_guvnor']['field']['turfs']>(
    (state) => state._guvnor.field.turfs
  );
  const [open, setOpen, close] = useToggle();
  const [selectedTurf, setSelectedTurf] = useAtom(selectedTurfAtom);
  const draftableIndex = useDraftableIndex();

  /// Clamp
  const clamp = useCallback((amount: BigNumber | undefined) => {
    if (!amount) return null;
    if (amount.lt(0)) return ZERO_BN;
    return amount;
  }, []);

  const handleTurfSelect = useCallback(
    (index: string) => {
      console.log('index: ', index);
      const numCasualsClamped = clamp(new BigNumber(turfs[index]));
      setSelectedTurf({
        index,
        amount: numCasualsClamped,
        start: ZERO_BN,
        end: numCasualsClamped,
      });
      console.log('numcasualsclamped: ', numCasualsClamped?.toNumber());
    },
    [clamp, turfs, setSelectedTurf]
  );

  // max amount of casuals for selected turf
  const maxAtom = useMemo(
    () =>
      atom(
        selectedTurf?.index ? new BigNumber(turfs[selectedTurf.index]) : null
      ),
    [turfs, selectedTurf?.index]
  );

  const InputProps = useMemo(
    () => ({
      endAdornment: (
        <TokenAdornment
          token={CASUALS}
          onClick={setOpen}
          iconSize="xs"
          downArrowIconSize="small"
          buttonLabel={
            selectedTurf?.index ? (
              <Typography variant="caption">
                {`@ ${displayBN(
                  new BigNumber(selectedTurf.index).minus(draftableIndex)
                )}`}
              </Typography>
            ) : (
              <Typography variant="caption">Select Turf</Typography>
            )
          }
        />
      ),
      startAdornment: (
        <InputAdornment position="start">
          <Typography variant="caption" color="text.primary">
            AMOUNT
          </Typography>
        </InputAdornment>
      ),
    }),
    [draftableIndex, selectedTurf?.index, setOpen]
  );

  return (
    <>
      <AtomInputField
        atom={selectedTurfAmountAtom}
        InputProps={InputProps}
        amountString="TurfSize"
        maxValueAtom={maxAtom}
        showMax
      />
      <TurfSelectDialog
        open={open}
        draftableIndex={draftableIndex}
        handleTurfSelect={handleTurfSelect}
        handleClose={close}
        turfs={turfs}
        selected={selectedTurf?.index}
      />
    </>
  );
};

const minSliderDistance = 1;
const SelectedTurfSlider: React.FC<{}> = () => {
  const turfs = useSelector<AppState, AppState['_guvnor']['field']['turfs']>(
    (state) => state._guvnor.field.turfs
  );
  const [selectedTurf, setSelectedTurf] = useAtom(selectedTurfAtom);
  const setPlaceInLine = useSetAtom(placeInLineAtom);

  const [start, setStart] = useAtom(selectedTurfStartAtom);
  const [end, setEnd] = useAtom(selectedTurfEndAtom);
  const [amount, setAmount] = useAtom(selectedTurfAmountAtom);
  const draftableIndex = useDraftableIndex();

  const handleChange = useCallback(
    (_e: Event, newValue: number | number[], activeThumb: number) => {
      if (!Array.isArray(newValue)) {
        return;
      }
      if (activeThumb === 0) {
        setStart(
          new BigNumber(Math.min(newValue[0], newValue[1] - minSliderDistance))
        );
      } else {
        setEnd(
          new BigNumber(Math.max(newValue[1], newValue[0] + minSliderDistance))
        );
      }
      setAmount(end && start ? end.minus(start) : null);
    },
    [end, start, setAmount, setEnd, setStart]
  );

  useEffect(() => {
    if (selectedTurf?.index) {
      console.log('selectedPLot?.index: ', selectedTurf?.index);
      console.log('place in line: ', turfs[selectedTurf?.index]?.toNumber());
      setPlaceInLine(new BigNumber(selectedTurf.index).minus(draftableIndex));
    }
  }, [draftableIndex, turfs, selectedTurf, setPlaceInLine]);

  if (!selectedTurf?.index) return null;

  return (
    <Stack px={0.8}>
      <Stack px={2}>
        <Slider
          color="primary"
          min={0}
          max={new BigNumber(turfs[selectedTurf?.index]).toNumber() || 100}
          value={[start?.toNumber() || 0, end?.toNumber() || 100]}
          onChange={handleChange}
          disableSwap
          size="small"
          sx={{
            color: 'primary.main',
            height: '8px',
            '& .MuiSlider-thumb': {
              width: '20px',
              height: '20px',
              boxShadow: 'none',
              boxSizing: 'border-box',
              background: '#fff',
              border: '2.5px solid currentColor',
              '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                boxShadow: 'inherit',
              },
            },
          }}
        />
      </Stack>
      <Row gap={0.8} width="100%" justifyContent="space-between">
        <AtomInputField
          atom={selectedTurfStartAtom}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Typography variant="caption" color="text.primary">
                  START
                </Typography>
              </InputAdornment>
            ),
          }}
        />
        <AtomInputField
          atom={selectedTurfEndAtom}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Typography variant="caption" color="text.primary">
                  END
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Row>
    </Stack>
  );
};

const FillBuyListing: React.FC<{}> = () => (
  <Stack>
    <Stack p={0.8} gap={0.8}>
      {/* <SubActionSelect /> */}
      <SelectTurfField />
      <SelectedTurfSlider />
      <Stack px={1.6} gap={0.8}>
        <PlaceInLineSlider canSlide={false} />
      </Stack>
    </Stack>
  </Stack>
);
export default FillBuyListing;
