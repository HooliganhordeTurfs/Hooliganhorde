import { Box, Dialog, Stack, Tooltip, useMediaQuery } from '@mui/material';
import { Field, FieldProps, FormikProps } from 'formik';
import React, { useCallback, useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { useTheme } from '@mui/material/styles';

import GasTag from '~/components/Common/GasTag';
import {
  StyledDialogActions,
  StyledDialogContent,
  StyledDialogTitle,
} from '~/components/Common/Dialog';
import { ClaimRewardsAction } from '~/lib/Hooliganhorde/Farm';
import { UNRIPE_HOOLIGAN, UNRIPE_HOOLIGAN_CRV3 } from '~/constants/tokens';
import DescriptionButton from '~/components/Common/DescriptionButton';
import RewardsBar, { RewardsBarProps } from './RewardsBar';
import { hoverMap } from '~/constants/firm';
import { HooliganhordePalette } from '~/components/App/muiTheme';
import useGuvnorFirmBalances from '~/hooks/guvnor/useGuvnorFirmBalances';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import { FC } from '~/types';
import RewardsForm from './RewardsForm';

export type SendFormValues = {
  to?: string;
};

type ClaimRewardsFormValues = {
  action: ClaimRewardsAction | undefined;
};

const options = [
  {
    title: 'Mow',
    description:
      'Add Grown Horde to your Horde balance. Mow is called upon any interaction with the Firm.',
    value: ClaimRewardsAction.MOW,
  },
  {
    title: 'Recruit',
    description:
      'Add Recruitable Prospects to your Prospect balance. Also Mows Grown Horde, Deposits Earned Hooligans and claims Earned Horde.',
    value: ClaimRewardsAction.RECRUIT_AND_MOW,
  },
  {
    title: 'Enroot',
    description:
      'Add Revitalized Horde and Prospects to your Horde and Prospect balances, respectively. Also Mows Grown Horde.',
    value: ClaimRewardsAction.ENROOT_AND_MOW,
    hideIfNoUnripe: true,
  },
  {
    title: 'Claim all Firm Rewards',
    description: 'Mow, Recruit and Enroot.',
    value: ClaimRewardsAction.CLAIM_ALL,
    hideIfNoUnripe: true,
  },
];

type ClaimCalls = {
  [key in ClaimRewardsAction]: {
    estimateGas: () => Promise<ethers.BigNumber>;
    execute: () => Promise<ethers.ContractTransaction>;
    enabled: boolean;
  };
};
type ClaimGasResults = {
  [key in ClaimRewardsAction]?: BigNumber;
};

// ------------------------------------------

const ClaimRewardsForm: FC<
  FormikProps<ClaimRewardsFormValues> &
    RewardsBarProps & {
      gas: ClaimGasResults | null;
      calls: ClaimCalls | null;
    }
> = ({ submitForm, isSubmitting, values, gas, calls, ...rewardsBarProps }) => {
  /// Helpers
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const getChainToken = useGetChainToken();

  /// State
  const balances = useGuvnorFirmBalances();

  /// The currently hovered action.
  const [hoveredAction, setHoveredAction] = useState<
    ClaimRewardsAction | undefined
  >(undefined);
  /// The currently selected action (after click).
  const selectedAction = values.action;

  /// Calculate Unripe Firm Balance
  const urHooligan = getChainToken(UNRIPE_HOOLIGAN);
  const urHooliganCrv3 = getChainToken(UNRIPE_HOOLIGAN_CRV3);
  const unripeDepositedBalance = balances[
    urHooligan.address
  ]?.deposited.amount.plus(balances[urHooliganCrv3.address]?.deposited.amount);

  /// Handlers
  const onMouseOver = useCallback(
    (v: ClaimRewardsAction) => () => setHoveredAction(v),
    []
  );
  const onMouseOutContainer = useCallback(
    () => setHoveredAction(undefined),
    []
  );

  /// Used to grey out text in rewards bar.
  // Prioritizes selected action over hovered.
  const action =
    selectedAction !== undefined
      ? selectedAction
      : hoveredAction !== undefined
      ? hoveredAction
      : undefined;

  // Checks if the current hoverState includes a given ClaimRewardsAction
  const isHovering = (c: ClaimRewardsAction) => {
    if (selectedAction !== undefined) {
      return hoverMap[selectedAction].includes(c);
    }
    return hoveredAction && hoverMap[hoveredAction].includes(c);
  };

  return (
    <>
      <StyledDialogContent sx={{ pb: 0 }}>
        <Stack gap={1.5}>
          <Box px={1} py={0.5}>
            <RewardsBar
              compact
              action={action}
              hideRevitalized={unripeDepositedBalance.eq(0)}
              {...rewardsBarProps}
            />
          </Box>
          <Field name="action">
            {(fieldProps: FieldProps<any>) => {
              const set = (v: any) => () => {
                // if user clicks on the selected action, unselect the action
                if (
                  fieldProps.form.values.action !== undefined &&
                  v === fieldProps.form.values.action
                ) {
                  fieldProps.form.setFieldValue('action', undefined);
                } else {
                  fieldProps.form.setFieldValue('action', v);
                }
              };
              return (
                <Stack gap={1}>
                  {options.map((option) => {
                    /// hide this option if user has no deposited unripe assets
                    if (
                      unripeDepositedBalance?.eq(0) &&
                      option.hideIfNoUnripe
                    ) {
                      return null;
                    }
                    const disabled =
                      !calls || calls[option.value].enabled === false;
                    const hovered = isHovering(option.value) && !disabled;
                    return (
                      <Tooltip
                        title={!disabled || isMobile ? '' : 'Nothing to claim'}
                      >
                        <div>
                          <DescriptionButton
                            key={option.value}
                            title={option.title}
                            description={
                              isMobile ? undefined : `${option.description}`
                            }
                            titleTooltip={
                              isMobile ? `${option.description}` : undefined
                            }
                            tag={
                              <GasTag gasLimit={gas?.[option.value] || null} />
                            }
                            // Button
                            fullWidth
                            onClick={set(option.value)}
                            onMouseOver={onMouseOver(option.value)}
                            onMouseLeave={onMouseOutContainer}
                            isSelected={hovered}
                            disabled={disabled}
                            sx={{
                              '&:disabled': {
                                borderColor: HooliganhordePalette.lightestGrey,
                              },
                            }}
                          />
                        </div>
                      </Tooltip>
                    );
                  })}
                </Stack>
              );
            }}
          </Field>
        </Stack>
      </StyledDialogContent>
      <StyledDialogActions>
        <LoadingButton
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          loading={isSubmitting}
          disabled={isSubmitting || values.action === undefined}
          onClick={submitForm}
        >
          {selectedAction === undefined
            ? 'Select Claim type'
            : `${options[selectedAction].title}`}
        </LoadingButton>
      </StyledDialogActions>
    </>
  );
};

const RewardsDialog: FC<
  RewardsBarProps & {
    handleClose: () => void;
    open: boolean;
  }
> = ({ handleClose, open, ...rewardsBarProps }) => (
  <Dialog
    onClose={handleClose}
    open={open}
    fullWidth
    maxWidth="md"
    // PaperProps={{
    //   sx: {
    //     width: '550px'
    //   }
    // }}
  >
    <StyledDialogTitle onClose={handleClose}>Claim Rewards</StyledDialogTitle>
    <RewardsForm>
      {(props) => <ClaimRewardsForm {...props} {...rewardsBarProps} />}
    </RewardsForm>
  </Dialog>
);

export default RewardsDialog;
