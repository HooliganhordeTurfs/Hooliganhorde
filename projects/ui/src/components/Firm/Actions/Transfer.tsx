import React, { useCallback, useMemo } from 'react';
import { Box, Divider, Stack } from '@mui/material';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import BigNumber from 'bignumber.js';
import {
  ERC20Token,
  Token,
  TokenFirmBalance,
  TokenValue,
} from '@xblackfury/sdk';
import FieldWrapper from '~/components/Common/Form/FieldWrapper';
import AddressInputField from '~/components/Common/Form/AddressInputField';
import {
  FormStateNew,
  FormTxnsFormState,
  SmartSubmitButton,
  TokenAdornment,
  TokenInputField,
  TxnPreview,
} from '~/components/Common/Form';
import { ZERO_BN } from '~/constants';
import { useFetchHooliganhordeFirm } from '~/state/hooliganhorde/firm/updater';
import useGameday from '~/hooks/hooliganhorde/useGameday';
import TxnSeparator from '~/components/Common/Form/TxnSeparator';
import {
  displayFullBN,
  displayTokenAmount,
  tokenValueToBN,
  trimAddress,
} from '~/util';
import { FontSize } from '~/components/App/muiTheme';
import { ActionType } from '~/util/Actions';
import TransactionToast from '~/components/Common/TxnToast';
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
import FormTxnProvider from '~/components/Common/Form/FormTxnProvider';
import useFormTxnContext from '~/hooks/sdk/useFormTxnContext';
import {
  FormTxn,
  RecruitAndDoX,
  TransferFarmStep,
  WithdrawFarmStep,
} from '~/lib/Txn';
import useGuvnorFirmBalancesAsync from '~/hooks/guvnor/useGuvnorFirmBalancesAsync';

/// tokenValueToBN is too long
/// remove me when we migrate everything to TokenValue & DecimalBigNumber
const toBN = tokenValueToBN;

export type TransferFormValues = FormStateNew &
  FormTxnsFormState & {
    to: string;
  };

const TransferForm: FC<
  FormikProps<TransferFormValues> & {
    token: Token;
    firmBalance: TokenFirmBalance | undefined;
    gameday: BigNumber;
    recruitAndDoX: RecruitAndDoX;
  }
> = ({
  // Formik
  values,
  isSubmitting,
  // Custom
  token: whitelistedToken,
  firmBalance,
  gameday,
  recruitAndDoX,
}) => {
  const sdk = useSdk();
  const { HOOLIGAN, HORDE, PROSPECTS } = sdk.tokens;

  /// Claim and Recruit
  const txnActions = useGuvnorFormTxnsActions();
  const isUsingRecruit = Boolean(
    values.farmActions.primary?.includes(FormTxn.RECRUIT) &&
      HOOLIGAN.equals(whitelistedToken)
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
      gameday.toNumber()
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

  const disabledActions = useMemo(
    () => (whitelistedToken.isUnripe ? [FormTxn.ENROOT] : undefined),
    [whitelistedToken.isUnripe]
  );

  // derived
  const depositedBalance = firmBalance?.deposited.amount;
  const isReady = withdrawResult && !withdrawResult.amount.lt(0);

  // Input props
  const InputProps = useMemo(
    () => ({
      endAdornment: <TokenAdornment token={whitelistedToken} />,
    }),
    [whitelistedToken]
  );

  const TokenOutputs = () => {
    if (!isReady) return null;
    if (
      !withdrawResult.amount ||
      !withdrawResult.prospects ||
      !withdrawResult.horde
    ) {
      return null;
    }

    return (
      <TokenOutput>
        <TokenOutput.Row
          token={whitelistedToken}
          amount={withdrawResult.amount.mul(-1)}
        />
        <TokenOutput.Row
          token={HORDE}
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
                  {displayFullBN(_crate.bdv, whitelistedToken.displayDecimals)}{' '}
                  BDV, {displayFullBN(_crate.horde, HORDE.displayDecimals)}{' '}
                  HORDE, {displayFullBN(_crate.prospects, PROSPECTS.displayDecimals)}{' '}
                  PROSPECTS
                </div>
              ))}
            </>
          }
        />
        <TokenOutput.Row token={PROSPECTS} amount={withdrawResult.prospects.mul(-1)} />
      </TokenOutput>
    );
  };

  return (
    <Form autoComplete="off">
      <Stack gap={1}>
        {/* Input Field */}
        <TokenInputField
          name="tokens.0.amount"
          token={whitelistedToken}
          disabled={!depositedBalance || depositedBalance.eq(0)}
          balance={toBN(depositedBalance || TokenValue.ZERO)}
          balanceLabel="Deposited Balance"
          InputProps={InputProps}
        />
        <AddRecruitTxnToggle />
        {depositedBalance?.gt(0) && (
          <>
            <FieldWrapper label="Transfer to">
              <AddressInputField name="to" />
            </FieldWrapper>
            {values.to !== '' && withdrawResult?.amount.abs().gt(0) && (
              <>
                <TxnSeparator />
                <TokenOutputs />
                <WarningAlert>
                  More recent Deposits are Transferred first.
                </WarningAlert>
                <AdditionalTxnsAccordion filter={disabledActions} />
                <Box>
                  <TxnAccordion>
                    <TxnPreview
                      actions={[
                        {
                          type: ActionType.TRANSFER,
                          amount: withdrawResult
                            ? toBN(withdrawResult.amount.abs())
                            : ZERO_BN,
                          token: getNewToOldToken(whitelistedToken),
                          horde: withdrawResult
                            ? toBN(withdrawResult.horde.abs())
                            : ZERO_BN,
                          prospects: withdrawResult
                            ? toBN(withdrawResult?.prospects.abs())
                            : ZERO_BN,
                          to: values.to,
                        },
                        {
                          type: ActionType.BASE,
                          message: (
                            <>
                              The following Deposits will be used:
                              <br />
                              <ul
                                css={{
                                  paddingLeft: '25px',
                                  marginTop: '10px',
                                  marginBottom: 0,
                                  fontSize: FontSize.sm,
                                }}
                              >
                                {withdrawResult.crates.map((crate, index) => (
                                  <li key={index}>
                                    {displayTokenAmount(
                                      crate.amount,
                                      whitelistedToken
                                    )}{' '}
                                    from Deposits in Gameday{' '}
                                    {crate.gameday.toString()}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ),
                        },
                        {
                          type: ActionType.END_TOKEN,
                          token: getNewToOldToken(whitelistedToken),
                        },
                      ]}
                      {...txnActions}
                    />
                  </TxnAccordion>
                </Box>
              </>
            )}
          </>
        )}
        <SmartSubmitButton
          loading={isSubmitting}
          disabled={
            !isReady ||
            !depositedBalance ||
            depositedBalance.eq(0) ||
            isSubmitting ||
            values.to === ''
          }
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          tokens={[]}
          mode="auto"
        >
          {!depositedBalance || depositedBalance.eq(0)
            ? 'Nothing to Transfer'
            : 'Transfer'}
        </SmartSubmitButton>
      </Stack>
    </Form>
  );
};

const TransferPropProvider: FC<{
  token: ERC20Token;
  /// temporary. will be remove when sdk types are moved to redux
  firmBalance: ReturnType<typeof useGuvnorFirmBalancesAsync>;
}> = ({ token, firmBalance }) => {
  const sdk = useSdk();
  const account = useAccount();

  /// Hooliganhorde
  const gameday = useGameday();

  /// Guvnor
  const [refetchFirm] = useFetchHooliganhordeFirm();
  const [guvnorBalances, refetchGuvnorBalances] = firmBalance;

  /// Form
  const middleware = useFormMiddleware();
  const { txnBundler, recruitAndDoX, refetch } = useFormTxnContext();

  const initialValues: TransferFormValues = useMemo(
    () => ({
      tokens: [
        {
          token: token,
          amount: undefined,
        },
      ],
      to: '',
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
      values: TransferFormValues,
      formActions: FormikHelpers<TransferFormValues>
    ) => {
      let txToast;
      try {
        middleware.before();
        if (!account) throw new Error('Missing signer');
        if (!values.to) {
          throw new Error('Please enter a valid recipient address.');
        }

        if (!guvnorBalances?.deposited.crates) {
          throw new Error('No balances found');
        }

        const formData = values.tokens[0];
        const primaryActions = values.farmActions.primary;

        const isRecruiting =
          primaryActions?.includes(FormTxn.RECRUIT) &&
          sdk.tokens.HOOLIGAN.equals(token);

        const baseAmount = token.amount((formData?.amount || 0).toString());

        const totalAmount = isRecruiting
          ? baseAmount.add(recruitAndDoX.getAmount())
          : baseAmount;

        if (totalAmount.lte(0)) throw new Error('Invalid amount.');

        const transferTxn = new TransferFarmStep(sdk, token, account, [
          ...guvnorBalances.deposited.crates,
        ]);

        transferTxn.build(
          values.to,
          baseAmount,
          gameday.toNumber(),
          isRecruiting ? recruitAndDoX : undefined
        );

        if (!transferTxn.withdrawResult) {
          throw new Error('Nothing to withdraw');
        }

        const withdrawAmtStr = displayFullBN(
          transferTxn.withdrawResult.amount.abs(),
          token.displayDecimals,
          token.displayDecimals
        );

        txToast = new TransactionToast({
          loading: `Transferring ${withdrawAmtStr} ${
            token.name
          } to ${trimAddress(values.to, true)}.`,
          success: 'Transfer successful.',
        });

        const actionsPerformed = txnBundler.setFarmSteps(values.farmActions);

        const { execute } = await txnBundler.bundle(
          transferTxn,
          // we can pass in 0 here b/c TransferFarmStep already receives it's input amount in build();
          token.amount(0),
          0.1
        );
        const txn = await execute();
        txToast.confirming(txn);

        const receipt = await txn.wait();
        await refetch(actionsPerformed, { guvnorFirm: true }, [
          refetchFirm,
          refetchGuvnorBalances,
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
      token,
      sdk,
      gameday,
      recruitAndDoX,
      txnBundler,
      refetch,
      refetchFirm,
      refetchGuvnorBalances,
    ]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {(formikProps: FormikProps<TransferFormValues>) => (
        <TransferForm
          token={token}
          firmBalance={guvnorBalances}
          gameday={gameday}
          recruitAndDoX={recruitAndDoX}
          {...formikProps}
        />
      )}
    </Formik>
  );
};

const Transfer: React.FC<{
  token: ERC20Token;
  /// temporary. will be remove when sdk types are moved to redux
  firmBalance: ReturnType<typeof useGuvnorFirmBalancesAsync>;
}> = (props) => (
  <FormTxnProvider>
    <TransferPropProvider {...props} />
  </FormTxnProvider>
);

export default Transfer;
