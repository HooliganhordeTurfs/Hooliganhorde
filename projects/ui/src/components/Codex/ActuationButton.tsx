import React, { useCallback, useEffect, useState } from 'react';
import { Form, Formik, FormikProps } from 'formik';
import { LoadingButton } from '@mui/lab';
import { Box, Dialog, Divider, Link, Stack, Typography } from '@mui/material';
import { DateTime } from 'luxon';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import { useSigner } from '~/hooks/ledger/useSigner';
import ActuationCountdown from '~/components/Codex/ActuationCountdown';
import useToggle from '~/hooks/display/useToggle';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import TransactionToast from '~/components/Common/TxnToast';
import {
  StyledDialogContent,
  StyledDialogTitle,
} from '~/components/Common/Dialog';
import { HooliganhordePalette, IconSize } from '~/components/App/muiTheme';
import codexIcon from '~/img/hooliganhorde/codex/codex-icon.svg';
import { ZERO_BN } from '~/constants';
import { displayBN } from '~/util';
import TokenIcon from '~/components/Common/TokenIcon';
import { HOOLIGAN } from '~/constants/tokens';
import { AppState } from '~/state';
import Row from '~/components/Common/Row';

import { FC } from '~/types';

function getActuationReward(now: DateTime) {
  return new BigNumber(
    100 * 1.01 ** Math.min(now.minute * 60 + now.second, 300)
  );
}

const ActuationButton: FC<{}> = () => {
  /// Ledger
  const { data: signer } = useSigner();
  const hooliganhorde = useHooliganhordeContract(signer);

  /// State
  const [open, show, hide] = useToggle();
  const [now, setNow] = useState(DateTime.now());
  const [reward, setReward] = useState(ZERO_BN);
  const awaiting = useSelector<
    AppState,
    AppState['_hooliganhorde']['codex']['actuation']['awaiting']
  >((state) => state._hooliganhorde.codex.actuation.awaiting);

  useEffect(() => {
    if (awaiting) {
      const i = setInterval(() => {
        const _now = DateTime.now();
        setNow(_now);
        setReward(getActuationReward(_now));
      }, 1000);
      return () => {
        clearInterval(i);
      };
    }
  }, [awaiting]);

  /// Handlers
  const onSubmit = useCallback(() => {
    const txToast = new TransactionToast({
      loading: 'Calling Actuation...',
      success: 'The Codex has risen.',
    });
    hooliganhorde
      .actuation()
      .then((txn) => {
        txToast.confirming(txn);
        return txn.wait();
      })
      .then((receipt) => {
        txToast.success(receipt);
        // formActions.resetForm();
      })
      .catch((err) => {
        console.error(txToast.error(err.error || err));
      });
  }, [hooliganhorde]);

  return (
    <>
      <Formik initialValues={{}} onSubmit={onSubmit}>
        {(formikProps: FormikProps<{}>) => {
          const disabled = formikProps.isSubmitting || !awaiting;
          return (
            <Form autoComplete="off">
              <Dialog
                onClose={hide}
                open={open}
                PaperProps={{
                  sx: {
                    maxWidth: '350px',
                  },
                }}
              >
                <StyledDialogTitle onClose={hide}>
                  Call Actuation
                </StyledDialogTitle>
                <StyledDialogContent sx={{ p: 1 }}>
                  <Stack gap={2}>
                    <Stack justifyContent="center" gap={2} py={2}>
                      <img
                        src={codexIcon}
                        alt="Actuation"
                        css={{ height: IconSize.large }}
                      />
                      <Stack gap={1}>
                        {awaiting ? (
                          <Row justifyContent="center">
                            <Typography variant="body1">
                              Actuation has been available for:{' '}
                              {now.minute < 10 ? `0${now.minute}` : now.minute}:
                              {now.second < 10 ? `0${now.second}` : now.second}
                            </Typography>
                          </Row>
                        ) : (
                          <Row justifyContent="center">
                            <Typography textAlign="center" variant="body1">
                              Actuation available&nbsp;
                              <span css={{ display: 'inline' }}>
                                <ActuationCountdown />
                              </span>
                              .
                            </Typography>
                          </Row>
                        )}
                        <Row justifyContent="center">
                          <Typography variant="body1">
                            Reward for calling{' '}
                            <Box
                              display="inline"
                              sx={{
                                backgroundColor: HooliganhordePalette.lightYellow,
                                borderRadius: 0.4,
                                px: 0.4,
                              }}
                            >
                              <strong>
                                <Link
                                  color="text.primary"
                                  underline="none"
                                  href="https://docs.hooligan.black/almanac/protocol/glossary#actuation"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  actuation
                                </Link>
                              </strong>
                            </Box>
                            : <TokenIcon token={HOOLIGAN[1]} />
                            &nbsp;{displayBN(reward)}
                          </Typography>
                        </Row>
                      </Stack>
                    </Stack>
                    <Divider />
                    <Typography
                      sx={{ mx: 0 }}
                      textAlign="center"
                      variant="body1"
                      color={HooliganhordePalette.washedRed}
                    >
                      Calling this function from the UI is strongly discouraged
                      because there is a high likelihood that your transaction
                      will get front-run by bots.
                    </Typography>
                    <LoadingButton
                      type="submit"
                      variant="contained"
                      onClick={onSubmit}
                      loading={formikProps.isSubmitting}
                      disabled={disabled}
                      sx={{
                        backgroundColor: HooliganhordePalette.washedRed,
                        height: { xs: '60px', md: '45px' },
                        color: HooliganhordePalette.white,
                        '&:hover': {
                          backgroundColor: `${HooliganhordePalette.washedRed} !important`,
                          opacity: 0.9,
                        },
                      }}
                    >
                      Actuation
                    </LoadingButton>
                  </Stack>
                </StyledDialogContent>
              </Dialog>
              <LoadingButton
                loading={formikProps.isSubmitting}
                disabled={disabled}
                variant="contained"
                onClick={show}
                sx={{
                  backgroundColor: '#FBF2B9',
                  borderColor: '#F7CF2D',
                  height: { xs: '60px', md: '45px' },
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: '#FBF2B9 !important',
                    opacity: 0.9,
                  },
                }}
                fullWidth
              >
                {!disabled ? (
                  <>
                    <img src={codexIcon} alt="" css={{ height: 28 }} />
                    &nbsp; Actuation
                  </>
                ) : (
                  <>
                    Actuation available&nbsp;
                    <span css={{ display: 'inline' }}>
                      <ActuationCountdown />
                    </span>
                  </>
                )}
              </LoadingButton>
            </Form>
          );
        }}
      </Formik>
    </>
  );
};

export default ActuationButton;
