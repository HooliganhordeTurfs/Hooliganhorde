import React, { useState, useEffect, useCallback } from 'react';
import {
  DialogProps,
  Stack,
  Dialog,
  Typography,
  useMediaQuery,
  Divider,
  Box,
  Link,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LoadingButton } from '@mui/lab';
import unripeHooliganIcon from '~/img/tokens/unripe-hooligan-logo-circled.svg';
import brownLPIcon from '~/img/tokens/unripe-lp-logo-circled.svg';
import { HooliganhordePalette } from '~/components/App/muiTheme';
import {
  StyledDialogActions,
  StyledDialogContent,
  StyledDialogTitle,
} from '~/components/Common/Dialog';
import pickImage from '~/img/hooliganhorde/unripe/pick.png';
import DescriptionButton from '~/components/Common/DescriptionButton';
import type { PickMerkleResponse } from '~/functions/pick/pick';
import TransactionToast from '~/components/Common/TxnToast';
import Token from '~/classes/Token';
import { useSigner } from '~/hooks/ledger/useSigner';
import {
  HOOLIGAN,
  HOOLIGAN_CRV3_LP,
  HOOLIGAN_ETH_UNIV2_LP,
  HOOLIGAN_LUSD_LP,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
} from '~/constants/tokens';
import { UNRIPE_ASSET_TOOLTIPS } from '~/constants/tooltips';
import { ZERO_BN } from '~/constants';
import { displayFullBN, toTokenUnitsBN } from '~/util';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import useGetChainToken from '~/hooks/chain/useGetChainToken';
import { FarmFromMode, FarmToMode } from '~/lib/Hooliganhorde/Farm';
import useAccount from '~/hooks/ledger/useAccount';
import { useFetchGuvnorFirm } from '~/state/guvnor/firm/updater';
import UnripeTokenRow from './UnripeTokenRow';
import Row from '~/components/Common/Row';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';

// ----------------------------------------------------

import { FC } from '~/types';

// ----------------------------------------------------

type UnripeKeys =
  // Hooligans
  | 'circulatingHooligans'
  | 'withdrawnHooligans'
  | 'draftableHooligans'
  | 'orderedHooligans'
  | 'farmableHooligans'
  | 'farmHooligans'
  | 'unripeHooligans'
  // LP
  | 'circulatingHooliganEthLp'
  | 'circulatingHooliganLusdLp'
  | 'circulatingHooligan3CrvLp'
  | 'withdrawnHooliganEthLp'
  | 'withdrawnHooliganLusdLp'
  | 'withdrawnHooligan3CrvLp'
  | 'circulatingHooliganEthBdv'
  | 'circulatingHooliganLusdBdv'
  | 'circulatingHooligan3CrvBdv'
  | 'withdrawnHooliganEthBdv'
  | 'withdrawnHooliganLusdBdv'
  | 'withdrawnHooligan3CrvBdv'
  | 'unripeLp';
type GetUnripeResponse = Partial<{ [key in UnripeKeys]: string }>;

// ----------------------------------------------------

const UNRIPE_HOOLIGAN_CATEGORIES = [
  'circulating',
  'withdrawn',
  'draftable',
  'ordered',
  // 'farmable',
  'farm',
] as const;

const UNRIPE_LP_CATEGORIES = [
  {
    key: 'HooliganEth',
    token: HOOLIGAN_ETH_UNIV2_LP[1],
  },
  {
    key: 'Hooligan3Crv',
    token: HOOLIGAN_CRV3_LP[1],
  },
  {
    key: 'HooliganLusd',
    token: HOOLIGAN_LUSD_LP[1],
  },
] as const;

const tokenOrZero = (amount: string | undefined, token: Token) => {
  if (!amount) return ZERO_BN;
  return toTokenUnitsBN(amount, token.decimals);
};

const PickHooligansDialog: FC<
  {
    handleClose: any;
  } & DialogProps
> = ({ open, sx, onClose, fullWidth, fullScreen, handleClose }) => {
  /// Theme
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tab, setTab] = useState(0);

  /// Tokens
  const getChainToken = useGetChainToken();
  const urHooligan = getChainToken(UNRIPE_HOOLIGAN);
  const urHooliganCRV3 = getChainToken(UNRIPE_HOOLIGAN_CRV3);

  /// Guvnor
  const [refetchGuvnorFirm] = useFetchGuvnorFirm();

  /// Ledger
  const account = useAccount();
  const { data: signer } = useSigner();
  const hooliganhorde = useHooliganhordeContract(signer);

  /// Local data
  const [unripe, setUnripe] = useState<GetUnripeResponse | null>(null);
  const [merkles, setMerkles] = useState<PickMerkleResponse | null>(null);
  const [pickStatus, setPickStatus] = useState<
    null | 'picking' | 'success' | 'error'
  >(null);
  const [picked, setPicked] = useState<[null, null] | [boolean, boolean]>([
    null,
    null,
  ]);

  /// Form
  const middleware = useFormMiddleware();

  /// Refresh
  useEffect(() => {
    (async () => {
      try {
        if (account && open) {
          const [_unripe, _merkles, _picked] = await Promise.all([
            fetch(`/.netlify/functions/unripe?account=${account}`).then(
              (response) => response.json()
            ),
            fetch(`/.netlify/functions/pick?account=${account}`).then(
              (response) => response.json()
            ),
            Promise.all([
              hooliganhorde.picked(account, urHooligan.address),
              hooliganhorde.picked(account, urHooliganCRV3.address),
            ]),
          ]);
          console.debug('[PickDialog] loaded states', {
            _unripe,
            _merkles,
            _picked,
          });
          setUnripe(_unripe);
          setMerkles(_merkles);
          setPicked(_picked);
        }
      } catch (err) {
        console.error(err);
        const errorToast = new TransactionToast({});
        errorToast.error(err);
      }
    })();
  }, [account, hooliganhorde, open, urHooligan.address, urHooliganCRV3.address]);

  /// Tab handlers
  const handleDialogClose = () => {
    handleClose();
    setTab(0);
  };
  const handleNextTab = () => {
    setTab(tab + 1);
  };
  const handlePreviousTab = () => {
    setTab(tab - 1);
    if (pickStatus !== 'picking') setPickStatus(null);
  };

  /// Pick handlers
  const handlePick = useCallback(
    (isDeposit: boolean) => () => {
      if (!merkles) return;
      middleware.before();

      setPickStatus('picking');
      const data = [];

      if (merkles.hooligan && picked[0] === false) {
        data.push(
          hooliganhorde.interface.encodeFunctionData('pick', [
            urHooligan.address,
            merkles.hooligan.amount,
            merkles.hooligan.proof,
            isDeposit ? FarmToMode.INTERNAL : FarmToMode.EXTERNAL,
          ])
        );
        if (isDeposit) {
          data.push(
            hooliganhorde.interface.encodeFunctionData('deposit', [
              urHooligan.address,
              merkles.hooligan.amount,
              FarmFromMode.INTERNAL, // always use internal for deposits
            ])
          );
        }
      }
      if (merkles.hooligan3crv && picked[1] === false) {
        data.push(
          hooliganhorde.interface.encodeFunctionData('pick', [
            urHooliganCRV3.address,
            merkles.hooligan3crv.amount,
            merkles.hooligan3crv.proof,
            isDeposit ? FarmToMode.INTERNAL : FarmToMode.EXTERNAL,
          ])
        );
        if (isDeposit) {
          data.push(
            hooliganhorde.interface.encodeFunctionData('deposit', [
              urHooliganCRV3.address,
              merkles.hooligan3crv.amount,
              FarmFromMode.INTERNAL, // always use internal for deposits
            ])
          );
        }
      }

      const txToast = new TransactionToast({
        loading: `Picking${isDeposit ? ' and depositing' : ''} Unripe Assets`,
        success: `Pick${
          isDeposit ? ' and deposit' : ''
        } successful. You can find your Unripe Assets ${
          isDeposit ? 'in the Firm' : 'in your wallet'
        }.`,
      });

      hooliganhorde
        .farm(data)
        .then((txn) => {
          txToast.confirming(txn);
          return txn.wait();
        })
        .then((receipt) =>
          Promise.all([refetchGuvnorFirm()]).then(() => receipt)
        )
        .then((receipt) => {
          txToast.success(receipt);
          setPickStatus('success');
        })
        .catch((err) => {
          console.error(txToast.error(err.error || err));
          setPickStatus('error');
        });
    },
    [
      merkles,
      picked,
      hooliganhorde,
      urHooligan.address,
      urHooliganCRV3.address,
      refetchGuvnorFirm,
      middleware,
    ]
  );

  /// Tab: Pick Overview
  const alreadyPicked = picked[0] === true || picked[1] === true;
  const buttonLoading = !merkles;
  let buttonText = 'Nothing to Pick';
  let buttonDisabled = true;
  if (alreadyPicked) {
    buttonText = 'Already Picked';
    buttonDisabled = true;
  } else if (merkles && (merkles.hooligan || merkles.hooligan3crv)) {
    buttonDisabled = false;
    const avail = [];
    if (merkles.hooligan) avail.push('Unripe Hooligans');
    if (merkles.hooligan3crv) avail.push('Unripe HOOLIGAN:3CRV LP');
    buttonText = `Pick ${avail.join(' & ')}`;
  }

  const tab0 = (
    <>
      <StyledDialogTitle sx={{ pb: 1 }} onClose={handleDialogClose}>
        Pick non-Deposited Unripe Hooligans and Unripe HOOLIGAN:3CRV LP
      </StyledDialogTitle>
      <Row gap={1} pb={2} pl={1} pr={3}>
        <img src={pickImage} alt="pick" css={{ height: 120 }} />
        <Typography sx={{ fontSize: '15px' }} color="text.secondary">
          To claim non-Deposited Unripe Hooligans and Unripe HOOLIGAN:3CRV LP, they must
          be Picked. After Rerecruit, you can Pick assets to your wallet, or Pick
          and Deposit them directly in the Firm.
          <br />
          <br />
          Unripe Deposited assets <b>do not need to be Picked</b> and will be
          automatically Deposited at Rerecruit.
          <br />
          <br />
          Read more about Unripe assets{' '}
          <Link
            href="https://docs.hooligan.black/almanac/farm/barrack#unripe-assets"
            target="_blank"
            rel="noreferrer"
          >
            here
          </Link>
          .
        </Typography>
      </Row>
      <Divider />
      <StyledDialogContent>
        <Stack gap={2}>
          {/**
           * Section 2: Unripe Hooligans
           */}
          <Stack gap={1}>
            {/**
             * Section 2a: Hooligans by State
             */}
            <Typography variant="h4">
              Non-Deposited pre-exploit Hooligan balances
            </Typography>
            <Stack gap={0.5} pl={1}>
              {UNRIPE_HOOLIGAN_CATEGORIES.map((key) => (
                <UnripeTokenRow
                  key={key}
                  name={
                    key === 'draftable' ? 'Draftable Casuals' : `${key} Hooligans`
                  }
                  amount={tokenOrZero(unripe?.[`${key}Hooligans`], HOOLIGAN[1])}
                  tooltip={UNRIPE_ASSET_TOOLTIPS[`${key}Hooligans`]}
                  token={HOOLIGAN[1]}
                />
              ))}
            </Stack>
            <Divider sx={{ ml: 1 }} />
            {/**
             * Section 3b: Total Unripe Hooligans
             */}
            <Row justifyContent="space-between" pl={1}>
              <Typography>Unripe Hooligans available to Pick at Rerecruit</Typography>
              <Row gap={0.3}>
                <img src={unripeHooliganIcon} alt="Circulating Hooligans" width={13} />
                <Typography variant="h4">
                  {displayFullBN(
                    // HOTFIX:
                    // After launching this dialog, the team decided to
                    // auto-deposit Farmable Hooligans. Instead of reworking the
                    // underlying JSONs, we just subtract farmableHooligans from
                    // the total unripeHooligans for user display.
                    tokenOrZero(unripe?.unripeHooligans, HOOLIGAN[1]).minus(
                      tokenOrZero(unripe?.farmableHooligans, HOOLIGAN[1])
                    )
                  )}
                </Typography>
              </Row>
            </Row>
          </Stack>
          {/**
           * Section 3: LP
           */}
          <Stack sx={{ pl: isMobile ? 0 : 0, pb: 0.5 }} gap={1}>
            {/**
             * Section 2a: LP by State
             */}
            <Typography variant="h4">
              Non-Deposited pre-exploit LP balances
            </Typography>
            {UNRIPE_LP_CATEGORIES.map((obj) => (
              <Stack key={obj.token.address} gap={0.5} pl={1}>
                <Typography sx={{ fontSize: '16px' }}>
                  {obj.token.name} Balances
                </Typography>
                <UnripeTokenRow
                  name={`Circulating ${obj.token.name}`}
                  amount={tokenOrZero(
                    unripe?.[`circulating${obj.key}Lp`],
                    obj.token
                  )}
                  tooltip={UNRIPE_ASSET_TOOLTIPS[`circulating${obj.key}Lp`]}
                  token={obj.token}
                  bdv={tokenOrZero(
                    unripe?.[`circulating${obj.key}Bdv`],
                    HOOLIGAN[1]
                  )}
                />
                <UnripeTokenRow
                  name={`Withdrawn ${obj.token.name}`}
                  amount={tokenOrZero(
                    unripe?.[`withdrawn${obj.key}Lp`],
                    obj.token
                  )}
                  tooltip={UNRIPE_ASSET_TOOLTIPS[`withdrawn${obj.key}Lp`]}
                  token={obj.token}
                  bdv={tokenOrZero(unripe?.[`withdrawn${obj.key}Bdv`], HOOLIGAN[1])}
                />
              </Stack>
            ))}
            <Divider sx={{ ml: 1 }} />
            {/**
             * Section 2b: Total Unripe LP
             */}
            <Row justifyContent="space-between" pl={1}>
              <Typography>
                Unripe HOOLIGAN:3CRV LP available to Pick at Rerecruit
              </Typography>
              <Row gap={0.3}>
                <img src={brownLPIcon} alt="Circulating Hooligans" width={13} />
                <Typography variant="h4">
                  {displayFullBN(tokenOrZero(unripe?.unripeLp, HOOLIGAN[1]))}
                </Typography>
              </Row>
            </Row>
          </Stack>
        </Stack>
      </StyledDialogContent>
      <StyledDialogActions>
        <Box width="100%">
          <LoadingButton
            loading={buttonLoading}
            disabled={buttonDisabled}
            onClick={handleNextTab}
            fullWidth
            // Below two params are required for the disabled
            // state to work correctly and for the font to show
            // as white when enabled
            variant="contained"
            color="dark"
            sx={{
              py: 1,
              backgroundColor: HooliganhordePalette.brown,
              '&:hover': {
                backgroundColor: HooliganhordePalette.brown,
                opacity: 0.96,
              },
            }}
          >
            {buttonText}
          </LoadingButton>
        </Box>
      </StyledDialogActions>
    </>
  );

  /// Tab: Pick
  const tab1 = (
    <>
      <StyledDialogTitle onBack={handlePreviousTab} onClose={handleDialogClose}>
        Pick Unripe Assets
      </StyledDialogTitle>
      <StyledDialogContent sx={{ width: isMobile ? null : '560px' }}>
        <Stack gap={0.8}>
          {pickStatus === null ? (
            <>
              <DescriptionButton
                title="Pick Unripe Assets"
                description="Claim your Unripe Hooligans and Unripe LP to your wallet."
                onClick={handlePick(false)}
              />
              <DescriptionButton
                title="Pick and Deposit Unripe Assets"
                description="Claim your Unripe Hooligans and Unripe LP, then Deposit them in the Firm to earn yield."
                onClick={handlePick(true)}
              />
            </>
          ) : (
            <Stack
              direction="column"
              sx={{ width: '100%', minHeight: 100 }}
              justifyContent="center"
              gap={1}
              alignItems="center"
            >
              {pickStatus === 'picking' && (
                <CircularProgress
                  variant="indeterminate"
                  color="primary"
                  size={32}
                />
              )}
              {pickStatus === 'error' && (
                <Typography color="text.secondary">
                  Something went wrong while picking your Unripe assets.
                </Typography>
              )}
              {pickStatus === 'success' && (
                <Typography color="text.secondary">
                  Unripe Assets picked successfully.
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </StyledDialogContent>
    </>
  );

  return (
    <Dialog
      onClose={onClose}
      open={open}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      sx={{ ...sx }}
    >
      {tab === 0 && tab0}
      {tab === 1 && tab1}
    </Dialog>
  );
};

export default PickHooligansDialog;
