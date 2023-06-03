import React from 'react';
import { Button, Dialog, Stack, Typography } from '@mui/material';
import {
  StyledDialogTitle,
  StyledDialogContent,
} from '~/components/Common/Dialog';

import { FC } from '~/types';

const CodexDialog: FC<{
  open: boolean;
  handleClose: () => void;
}> = ({ open, handleClose }) => (
  <Dialog onClose={handleClose} open={open}>
    <StyledDialogTitle onClose={handleClose}>Confirm Actuation</StyledDialogTitle>
    <StyledDialogContent>
      <Stack gap={1}>
        <Typography>TEST</Typography>
        <Button type="submit">Actuation</Button>
      </Stack>
    </StyledDialogContent>
  </Dialog>
);

export default CodexDialog;
