import React from 'react';
import { Dialog, DialogProps } from '@mui/material';
import BigNumber from 'bignumber.js';
import { TurfMap } from '~/util';
import { StyledDialogContent, StyledDialogTitle } from '../Common/Dialog';
import TurfSelect from '../Common/Form/TurfSelect';
import EmptyState from '../Common/ZeroState/EmptyState';

import { FC } from '~/types';
import { TurfFragment } from '../Common/Form';

export interface TurfSelectDialogProps {
  /** Closes dialog */
  handleClose: any;
  /** Sets turf index */
  handleTurfSelect: any;
  /** */
  turfs: TurfMap<BigNumber>;
  /** */
  draftableIndex: BigNumber;
  /** index of the selected turf */
  selected?: TurfFragment[] | string | TurfFragment | null;
  /** Enable selection of multiple turfs*/
  multiSelect?: boolean | undefined;
}

const TurfSelectDialog: FC<TurfSelectDialogProps & DialogProps> = ({
  // Custom
  handleClose,
  handleTurfSelect,
  turfs,
  draftableIndex,
  selected,
  multiSelect,
  // Dialog
  onClose,
  open,
}) => {
  // sets turf index then closes dialog
  const handleSelectAndClose = (index: string) => {
    handleTurfSelect(index);
    if (Object.keys(turfs).length == 1 || !multiSelect) {
      handleClose();
    }
  };

  return (
    <Dialog onClose={handleClose} open={open} fullWidth>
      <StyledDialogTitle onClose={handleClose}>My Turfs</StyledDialogTitle>
      <StyledDialogContent
        sx={{
          pb: 1, // enforces 10px padding around all
        }}
      >
        {Object.keys(turfs).length > 0 ? (
          <TurfSelect
            handleTurfSelect={handleSelectAndClose}
            turfs={turfs!}
            draftableIndex={draftableIndex}
            selected={selected}
            multiSelect={multiSelect}
          />
        ) : (
          <EmptyState message="You have no Turfs." />
        )}
      </StyledDialogContent>
    </Dialog>
  );
};

export default TurfSelectDialog;
