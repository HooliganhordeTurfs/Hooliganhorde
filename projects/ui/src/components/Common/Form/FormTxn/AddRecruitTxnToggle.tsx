import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  Grid,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useFormikContext } from 'formik';
import { displayFullBN } from '~/util';
import {
  HooliganhordePalette,
  FontSize,
  FontWeight,
} from '~/components/App/muiTheme';
import TokenIcon from '~/components/Common/TokenIcon';
import Row from '~/components/Common/Row';

import useToggle from '~/hooks/display/useToggle';
import useGuvnorFormTxnsSummary from '~/hooks/guvnor/form-txn/useGuvnorFormTxnsSummary';
import MergeIcon from '~/img/misc/merge-icon.svg';

import { FormTxnsFormState } from '..';
import { FormTxn } from '~/lib/Txn';

const sx = {
  accordion: {
    backgroundColor: 'primary.light',
    borderRadius: 1,
    '&.MuiAccordion-root:before': {
      backgroundColor: 'primary.light',
    },
  },
  accordionSummary: {
    '&.MuiAccordionSummary-root': {
      '&:hover': {
        /// only enable cursor on the switch component
        cursor: 'default',
      },
    },
  },
} as const;

/**
 * Used to add 'recruit' to the formState (FormTxnsFormState)
 * If nothing to 'recruit' or if the preset is not 'recruit', returns null
 *
 * NOTE: Used within Formik Context
 */
const AddRecruitTxnToggle: React.FC<{}> = () => {
  /// Local State
  const [open, show, hide] = useToggle();

  /// Formik
  const { values, setFieldValue } = useFormikContext<FormTxnsFormState>();
  const { preset, primary } = values.farmActions;

  /// Recruit Summary and State
  const { summary } = useGuvnorFormTxnsSummary();

  const items = useMemo(() => {
    const recruit = summary[FormTxn.RECRUIT].summary;
    const mow = summary[FormTxn.MOW].summary;
    return [...recruit, ...mow];
  }, [summary]);

  /// Derived
  const isRecruit = preset === 'recruit';
  const recruitEnabled = summary[FormTxn.RECRUIT].enabled;
  const isRecruiting = Boolean(primary?.includes(FormTxn.RECRUIT));

  /// Handlers
  const handleToggleOn = useCallback(() => {
    if (isRecruit) {
      setFieldValue('farmActions.primary', [FormTxn.RECRUIT]);
      show();
    }
  }, [isRecruit, setFieldValue, show]);

  const handleToggleOff = useCallback(() => {
    if (isRecruit) {
      setFieldValue('farmActions.primary', []);
      hide();
    }
  }, [hide, isRecruit, setFieldValue]);

  /// Effects
  /// Update the local state if the Form State is updated externally
  useEffect(() => {
    if (isRecruit && isRecruiting && !open) {
      show();
    } else if (open && (!isRecruit || !isRecruiting)) {
      hide();
    }
  }, [open, isRecruit, isRecruiting, show, hide]);

  /// If there is nothing to recruit or if the preset isn't recruit, return nothing
  if (!isRecruit || !recruitEnabled) return null;

  return (
    <Accordion
      expanded={open}
      defaultExpanded={false}
      defaultChecked={false}
      sx={sx.accordion}
    >
      <AccordionSummary sx={sx.accordionSummary}>
        <Row justifyContent="space-between" alignItems="center" width="100%">
          <Row
            gap={1}
            alignItems="center"
            /// only enable the switch component to toggle
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={MergeIcon}
              alt="merge"
              css={{ width: '24px', height: '24px' }}
            />
            <Stack>
              <Typography variant="h4" color="primary.main">
                Use Earned Hooligans
              </Typography>
              <Typography variant="body1" color="text.tertiary">
                Toggle to claim Earned Hooligans in your transaction
              </Typography>
            </Stack>
          </Row>
          <Switch
            checked={open}
            onClick={(e) => {
              e.stopPropagation();
              open ? handleToggleOff() : handleToggleOn();
            }}
            color="primary"
          />
        </Row>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1 }}>
        <Card
          sx={{
            background: HooliganhordePalette.honeydewGreen,
            borderColor: 'primary.light',
          }}
        >
          <Stack gap={1} p={1}>
            <Typography variant="body1" color="text.tertiary">
              You will Recruit to claim these firm rewards
            </Typography>
            <Grid container spacing={1} direction="row">
              {items.map((item, i) => (
                <Grid item xs={6} sm={3} key={`${item.token.symbol}-${i}`}>
                  <Card sx={{ border: 0, width: '100%', background: 'white' }}>
                    <Stack gap={0.2} p={1}>
                      <Row gap={0.2}>
                        <TokenIcon
                          token={item.token}
                          css={{ height: FontSize.sm }}
                        />
                        <Typography
                          variant="bodySmall"
                          fontWeight={FontWeight.semiBold}
                        >
                          {displayFullBN(item.amount, 2)}
                        </Typography>
                      </Row>
                      <Typography
                        variant="bodySmall"
                        fontWeight={FontWeight.normal}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {item.description}
                      </Typography>
                    </Stack>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Card>
      </AccordionDetails>
    </Accordion>
  );
};

export default AddRecruitTxnToggle;
