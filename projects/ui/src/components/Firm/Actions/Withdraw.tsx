import React, { useCallback, useMemo } from 'react';
import { Box, Divider, Stack } from '@mui/material';
import BigNumber from 'bignumber.js';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { useSelector } from 'react-redux';
import {
  Token,
  ERC20Token,
  TokenFirmBalance,
  TokenValue,
  HooliganhordeSDK,
} from '@xblackfury/sdk';
import { PROSPECTS, HORDE } from '~/constants/tokens';
import {
  TxnPreview,
  TokenInputField,
  TokenAdornment,
  TxnSeparator,
  SmartSubmitButton,
  FormStateNew,
  FormTxnsFormState,
} from '~/components/Common/Form';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import { displayFullBN, tokenValueToBN } from '~/util';
import TransactionToast from '~/components/Common/TxnToast';
import { AppState } from '~/state';
import { ActionType } from '~/util/Actions';
import { ZERO_BN } from '~/constants';
import { useFetchHooliganhordeFirm } from '~/state/hooliganhorde/firm/updater';
import { FC } from '~/types';
import useFormMiddleware from '~/hooks/ledger/useFormMiddleware';
import useSdk, { getNewToOldToken } from '~/hooks/sdk';
import TokenOutput from '~/components/Common/Form/TokenOutput';
import WarningAlert from '~/components/Common/Alert/WarningAlert';
import TxnAccordion from '~/components/Common/TxnAccordion';
import useAccount from '~/hooks/ledger/useAccount';
import AdditionalTxnsAccordion from '~/components/Common/Form/FormTxn/AdditionalTxnsAccordion';
import useGuvnorFormTxnsActions from '~/hooks/guvnor/form-txn/useGuvnorFormTxnActions';
import AddRecruitTxnToggle from '~/components/Common/Form/FormTxn/AddRecruitTxnToggle';
import useGuvnorFirmBalancesAsync from '~/hooks/guvnor/useGuvnorFirmBalancesAsync';
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';
import { FormTxn, RecruitAndDoX, WithdrawFarmStep } from '~/lib/Txn';

// -----------------------------------------------------------------------

/// tokenValueToBN is too long
/// remove me when we migrate everything to TokenValue & DecimalBigNumber
const toBN = tokenValueToBN;

type WithdrawFormValues = FormStateNew & FormTxnsFormState;

const WithdrawForm: FC<
  FormikProps<WithdrawFormValues> & {
    token: Token;
    firmBalance: TokenFirmBalance | undefined;
    withdrawGamedays: BigNumber;
    gameday: BigNumber;
    sdk: HooliganhordeSDK;
    recruitAndDoX: RecruitAndDoX;
  }
> = ({
  // Formik
  values,
  isSubmitting,
  // Custom
  token: whitelistedToken,
  firmBalance,
  withdrawGamedays,
  gameday,
  sdk,
  recruitAndDoX,
}) => {
  const { HOOLIGAN } = sdk.tokens;

  // Input props
  const InputProps = useMemo(
    () => ({
      endAdornment: <TokenAdornment token={whitelistedToken} />,
    }),
    [whitelistedToken]
  );

  // claim and recruit
  const txActions = useGuvnorFormTxnsActions();
  const isUsingRecruit = Boolean(
    values.farmActions.primary?.includes(FormTxn.RECRUIT) &&
      sdk.tokens.HOOLIGAN.equals(whitelistedToken)
  );

  // Results
  const withdrawResult = useMemo(() => {
    const amount = HOOLIGAN.amount(values.tokens[0].amount?.toString() || '0');
    const crates = firmBalance?.deposited.crates || [];

    if (!isUsingRecruit && (amount.lte(0) || !crates.length)) return null;
    if (isUsingRecruit && recruitAndDoX.getAmount().lte(0)) return null;

    return WithdrawFarmStep.calculateWithdraw(
      sdk.firm.firmWithdraw,
      whitelistedToken,
      crates,
      amount,
      gameday.toNumber(),
      isUsingRecruit ? recruitAndDoX : undefined
    );
  }, [
    HOOLIGAN,
    isUsingRecruit,
    recruitAndDoX,
    sdk.firm.firmWithdraw,
    gameday,
    firmBalance?.deposited.crates,
    values.tokens,
    whitelistedToken,
  ]);

  /// derived
  const depositedBalance = firmBalance?.deposited.amount;

  const isReady = withdrawResult && !withdrawResult.amount.lt(0);

  const disabledActions = useMemo(
    () => (whitelistedToken.isUnripe ? [FormTxn.ENROOT] : undefined),
    [whitelistedToken.isUnripe]
  );

  return (
    <Form autoComplete="off" noValidate>
      {/* Form Content */}
      <Stack gap={1}>
        {/* Input Field */}
        <TokenInputField
          name="tokens.0.amount"
          token={whitelistedToken}
          disabled={!depositedBalance || depositedBalance.eq(0)}
          balance={toBN(depositedBalance || TokenValue.ZERO) || ZERO_BN}
          balanceLabel="Deposited Balance"
          InputProps={InputProps}
        />
        <AddRecruitTxnToggle />
        {isReady ? (
          <Stack direction="column" gap={1}>
            <TxnSeparator />
            <TokenOutput>
              <TokenOutput.Row
                token={sdk.tokens.HORDE}
                amount={withdrawResult.horde.mul(-1)}
                amountTooltip={
                  <>
                    <div>
                      Withdrawing from {withdrawResult.crates.length} Deposit
                      {withdrawResult.crates.length === 1 ? '' : 's'}:
                    </div>
                    <Divider sx={{ opacity: 0.2, my: 1 }} />
                    {withdrawResult.crates.map((_crate, i) => (
                      <div key={i}>
                        Gameday {_crate.gameday.toString()}:{' '}
                        {displayFullBN(
                          _crate.bdv,
                          whitelistedToken.displayDecimals
                        )}{' '}
                        BDV,{' '}
                        {displayFullBN(_crate.horde, HORDE.displayDecimals)}{' '}
                        HORDE,{' '}
                        {displayFullBN(_crate.prospects, PROSPECTS.displayDecimals)}{' '}
                        PROSPECTS
                      </div>
                    ))}
                  </>
                }
              />
              <TokenOutput.Row
                token={sdk.tokens.PROSPECTS}
                amount={withdrawResult.prospects.mul(-1)}
              />
            </TokenOutput>
            <WarningAlert>
              You can Claim your Withdrawn assets at the start of the next
              Gameday.
            </WarningAlert>
            <AdditionalTxnsAccordion filter={disabledActions} />
            <Box>
              <TxnAccordion>
                <TxnPreview
                  actions={[
                    {
                      type: ActionType.WITHDRAW,
                      amount: toBN(withdrawResult.amount),
                      token: getNewToOldToken(whitelistedToken),
                    },
                    {
                      type: ActionType.UPDATE_FIRM_REWARDS,
                      horde: toBN(withdrawResult.horde.mul(-1)),
                      prospects: toBN(withdrawResult.prospects.mul(-1)),
                    },
                    {
                      type: ActionType.IN_TRANSIT,
                      amount: toBN(withdrawResult.amount),
                      token: getNewToOldToken(whitelistedToken),
                      withdrawGamedays,
                    },
                  ]}
                  {...txActions}
                />
              </TxnAccordion>
            </Box>
          </Stack>
        ) : null}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={!isReady || isSubmitting}
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          tokens={[]}
          mode="auto"
        >
          Withdraw
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

// -----------------------------------------------------------------------

const WithdrawPropProvider: FC<{
  token: ERC20Token;
  // TEMPORARY. will be remove when sdk types are moved to redux
  firmBalance: ReturnType<typeof useGuvnorFirmBalancesAsync>;
}> = ({ token, firmBalance }) => {
  const sdk = useSdk();
  const { txnBundler, recruitAndDoX, refetch } = useFormTxnContext();
  const account = useAccount();

  /// Hooliganhorde
  const gameday = useGameday();
  const withdrawGamedays = useSelector<AppState, BigNumber>(
    (state) => state._hooliganhorde.firm.withdrawGamedays
  );

  /// Guvnor
  const [guvnorBalances, fetchGuvnorBalances] = firmBalance;
  const [refetchFirm] = useFetchHooliganhordeFirm();

  /// Form
  const middleware = useFormMiddleware();
  const initialValues: WithdrawFormValues = useMemo(
    () => ({
      tokens: [
        {
          token: token,
          amount: undefined,
        },
      ],
      farmActions: {
        preset: sdk.tokens.HOOLIGAN.equals(token) ? 'recruit' : 'noPrimary',
        primary: undefined,
        secondary: undefined,
        implied: [FormTxn.MOW],
      },
    }),
    [sdk.tokens.HOOLIGAN, token]
  );

  const onSubmit = useCallback(
    async (
      values: WithdrawFormValues,
      formActions: FormikHelpers<WithdrawFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        if (!account) throw new Error('Missing signer');
        if (!guvnorBalances?.deposited.crates) {
          throw new Error('No balances found');
        }

        const formData = values.tokens[0];
        const primaryActions = values.farmActions.primary;

        const addRecruit =
          primaryActions?.includes(FormTxn.RECRUIT) &&
          sdk.tokens.HOOLIGAN.equals(token);

        const baseAmount = token.amount((formData?.amount || 0).toString());

        const totalAmount = addRecruit
          ? baseAmount.add(recruitAndDoX.getAmount())
          : baseAmount;

        if (totalAmount.lte(0)) throw new Error('Invalid amount.');

        const withdrawTxn = new WithdrawFarmStep(sdk, token, [
          ...guvnorBalances.deposited.crates,
        ]);

        withdrawTxn.build(
          baseAmount,
          gameday.toNumber(),
          addRecruit ? recruitAndDoX : undefined
        );

        if (!withdrawTxn.withdrawResult) {
          throw new Error('Nothing to Withdraw.');
        }

        const withdrawAmtStr = displayFullBN(
          withdrawTxn.withdrawResult.amount.abs(),
          token.displayDecimals,
          token.displayDecimals
        );

        txToast = new TransactionToast({
          loading: `Withdrawing ${withdrawAmtStr} ${token.name} from the Firm...`,
          success: `Withdraw successful. Your ${token.name} will be available to Claim at the start of the next Gameday.`,
        });

        const actionsPerformed = txnBundler.setFarmSteps(values.farmActions);
        const { execute } = await txnBundler.bundle(
          withdrawTxn,
          // we can pass in 0 here b/c WithdrawFarmStep already receives it's input amount in build();
          token.amount(0),
          0.1
        );

        const txn = await execute();

        txToast.confirming(txn);
        const receipt = await txn.wait();

        await refetch(actionsPerformed, { guvnorFirm: true }, [
          refetchFirm,
          fetchGuvnorBalances,
        ]);

        txToast.success(receipt);
        formActions.resetForm();
      } catch (err) {
        if (txToast) {
          txToast.error(err);
        } else {
          const toast = new TransactionToast({});
          toast.error(err);
        }
        formActions.setSubmitting(false);
      }
    },
    [
      middleware,
      account,
      guvnorBalances?.deposited.crates,
      sdk,
      token,
      recruitAndDoX,
      gameday,
      txnBundler,
      refetch,
      refetchFirm,
      fetchGuvnorBalances,
    ]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {(formikProps) => (
        <WithdrawForm
          token={token}
          withdrawGamedays={withdrawGamedays}
          firmBalance={guvnorBalances}
          gameday={gameday}
          sdk={sdk}
          recruitAndDoX={recruitAndDoX}
          {...formikProps}
        />
      )}
    </Formik>
  );
};

const Withdraw: React.FC<{
  token: ERC20Token;
  // TEMPORARY. will be remove when sdk types are moved to redux
  firmBalance: ReturnType<typeof useGuvnorFirmBalancesAsync>;
}> = (props) => (
  <FormTxnProvider>
    <WithdrawPropProvider {...props} />
  </FormTxnProvider>
);

export default Withdraw;
