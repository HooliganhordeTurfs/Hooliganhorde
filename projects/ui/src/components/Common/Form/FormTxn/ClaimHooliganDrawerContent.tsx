import React, { useCallback, useEffect, useMemo } from 'react';
import { FarmToMode } from '@xblackfury/sdk';
import { Card, Stack, Typography } from '@mui/material';
import { useFormikContext } from 'formik';
import BigNumber from 'bignumber.js';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ZERO_BN } from '~/constants';
import {
  HooliganhordePalette,
  FontWeight,
  IconSize,
} from '~/components/App/muiTheme';
import TokenSelectionCard from '~/components/Common/Card/TokenSelectionCard';
import useGuvnorFormTxnsSummary, {
  FormTxnOptionSummary,
} from '~/hooks/guvnor/form-txn/useGuvnorFormTxnsSummary';
import { FormTxnsFormState } from '~/components/Common/Form';
import SelectionItem from '~/components/Common/SelectionItem';
import AddressIcon from '~/components/Common/AddressIcon';
import Row from '~/components/Common/Row';
import TokenQuoteProviderWithParams, {
  TokenQuoteProviderWithParamsCustomProps,
} from '../TokenQuoteProviderWithParams';
import useSdk from '~/hooks/sdk';
import { FormTxn, FormTxnBundler, FormTxnMap } from '~/lib/Txn';

export type UseClaimableHooligansDrawerProps<T> = {
  /** */
  maxHooligans?: BigNumber;
  /** */
  hooligansUsed?: BigNumber;
} & {
  quoteProviderProps: Pick<
    TokenQuoteProviderWithParamsCustomProps<T>,
    'tokenOut' | 'handleQuote' | 'params' | 'state' | 'name'
  >;
};

const sharedCardProps = {
  sx: {
    background: HooliganhordePalette.honeydewGreen,
    borderColor: 'primary.light',
  },
} as const;

const toModeOptions = [
  {
    key: FarmToMode.INTERNAL,
    icon: <>🚜</>,
    name: 'Farm',
    content: 'Transfer the remainder to your Farm Balance. Costs no extra gas.',
  },
  {
    key: FarmToMode.EXTERNAL,
    icon: (
      <AddressIcon
        size={IconSize.small}
        width={IconSize.small}
        height={IconSize.small}
      />
    ),
    name: 'Circulating',
    content: 'Transfer the remainder to your wallet. Costs extra gas.',
  },
];

export default function ClaimHooliganDrawerContent<T>({
  maxHooligans,
  hooligansUsed,
  quoteProviderProps: { tokenOut, handleQuote, params: _params, state, name },
}: UseClaimableHooligansDrawerProps<T>) {
  const sdk = useSdk();

  /// Formik
  const { values, setFieldValue } = useFormikContext<FormTxnsFormState>();
  const { farmActions } = values;

  /// Summary
  const { summary, getClaimable } = useGuvnorFormTxnsSummary();

  /// Form values
  const preset = values.farmActions.preset;
  const destination = farmActions.transferToMode || FarmToMode.INTERNAL;
  const additionalAmount = state.amount || ZERO_BN;

  ///
  const optionsMap = useMemo(() => {
    const options = FormTxnBundler.presets[preset].primary;
    return options.reduce((prev, curr) => {
      prev[curr] = summary[curr].summary[0];
      return prev;
    }, {} as Partial<FormTxnMap<FormTxnOptionSummary>>);
  }, [preset, summary]);

  const selectionsSet = useMemo(
    () => new Set(values.farmActions.primary || []),
    [values.farmActions.primary]
  );

  /// Derived
  const claimAmount = getClaimable([...selectionsSet]).bn;
  const maxClaimableHooligansUsable = maxHooligans
    ? BigNumber.max(maxHooligans.minus(hooligansUsed || ZERO_BN), ZERO_BN)
    : claimAmount;

  const transferrable = claimAmount.minus(additionalAmount);

  const inputDisabled = claimAmount.lte(0) || maxClaimableHooligansUsable.lte(0);

  /// Handlers
  const handleToggle = useCallback(
    (option: FormTxn) => {
      const copy = new Set(selectionsSet);
      if (copy.has(option)) copy.delete(option);
      else copy.add(option);

      const newSelections = [...copy];

      if (!newSelections.length) {
        /// reset the form state.
        setFieldValue('farmActions.primary', []);
        setFieldValue(`${name}`, {
          token: sdk.tokens.HOOLIGAN,
          amount: undefined,
        });
        return;
      }

      const newClaimAmount = getClaimable(newSelections).bn;

      setFieldValue('farmActions.primary', newSelections);
      setFieldValue(`${name}.maxAmountIn`, newClaimAmount);

      if (newClaimAmount.lt(additionalAmount)) {
        setFieldValue(`${name}.amount`, newClaimAmount);
      }
    },
    [
      selectionsSet,
      getClaimable,
      setFieldValue,
      name,
      additionalAmount,
      sdk.tokens.HOOLIGAN,
    ]
  );

  const handleSetDestination = useCallback(
    (_toMode: FarmToMode) => {
      if (_toMode === destination) return;
      setFieldValue('farmActions.transferToMode', _toMode);
    },
    [destination, setFieldValue]
  );

  const _maxHooligansUsable = maxClaimableHooligansUsable.toString();
  const _additionalAmount = additionalAmount.toString();

  useEffect(() => {
    const _additional = new BigNumber(_additionalAmount);
    const _max = new BigNumber(_maxHooligansUsable);
    if (_additional.gt(_max)) {
      console.debug(
        '[ClaimHooligansDrawerContent]: claimed hooligans used + hooligans used > max amount. Setting amount: ',
        {
          additional: _additional.toString(),
          max: _max.toString(),
        }
      );
      setFieldValue(`${name}.amount`, _max);
    }
  }, [_additionalAmount, _maxHooligansUsable, name, setFieldValue]);

  return (
    <Stack gap={1}>
      <Card {...sharedCardProps}>
        <Stack gap={1} p={1}>
          <Typography variant="body1" color="text.tertiary">
            Which Hooligans would you like to Claim?
          </Typography>
          <Stack gap={1} direction={{ xs: 'column', sm: 'row' }}>
            {Object.entries(optionsMap).map(([k, item]) => (
              <TokenSelectionCard
                key={k}
                token={item.token}
                amount={item.amount}
                selected={selectionsSet.has(k as FormTxn)}
                onClick={() => handleToggle(k as FormTxn)}
                disabled={item.amount.lte(0)}
                backgroundOnHover={false}
              >
                <Stack>
                  <Typography
                    variant="bodySmall"
                    fontWeight={FontWeight.normal}
                    sx={{ whiteSpace: 'nowrap' }}
                    alignSelf="flex-start"
                  >
                    {item.description}
                  </Typography>
                </Stack>
              </TokenSelectionCard>
            ))}
          </Stack>
        </Stack>
      </Card>
      {/* Input Field */}
      {claimAmount.gt(0) ? (
        <Card {...sharedCardProps}>
          <Stack gap={1} p={1}>
            <Typography variant="body1" color="text.tertiary">
              Amount of Claimable Hooligans to use in this transaction
            </Typography>
            <TokenQuoteProviderWithParams<T>
              name={name}
              fullWidth
              state={state}
              max={maxClaimableHooligansUsable}
              params={_params}
              balance={claimAmount}
              tokenOut={tokenOut}
              disabled={inputDisabled}
              handleQuote={handleQuote}
              balanceLabel="Balance"
              disableTokenSelect={inputDisabled}
            />
          </Stack>
        </Card>
      ) : null}
      {/* Transfer claimable hooligans not being used */}
      {transferrable.gt(0) ? (
        <Card {...sharedCardProps}>
          <Stack gap={1} p={1}>
            <Typography variant="body1" color="text.tertiary">
              You&apos;re using fewer than your total Claimable Hooligans in this
              transaction. Where would you like to send the remainder?
            </Typography>
            <Stack gap={1}>
              {toModeOptions.map((opt) => {
                const isSelected = opt.key === destination;
                return (
                  <SelectionItem
                    key={opt.key.toString()}
                    title={
                      <Typography
                        variant="body1"
                        component="span"
                        color={isSelected ? 'text.primary' : 'text.secondary'}
                      >
                        <Row gap={0.5}>
                          {opt.icon}
                          <Typography variant="inherit" color="inherit">
                            {opt.name} Balance
                            <HelpOutlineIcon
                              sx={{
                                color: 'text.secondary',
                                display: 'inline',
                                mb: 0.5,
                                fontSize: '11px',
                              }}
                            />
                          </Typography>
                        </Row>
                      </Typography>
                    }
                    selected={isSelected}
                    onClick={() => handleSetDestination(opt.key)}
                    checkIcon="top-right"
                    backgroundOnHover={false}
                    gap={0}
                  >
                    <Stack alignItems="flex-start">
                      <Typography
                        variant="bodySmall"
                        color={isSelected ? 'text.primary' : 'text.secondary'}
                      >
                        {opt.content}
                      </Typography>
                    </Stack>
                  </SelectionItem>
                );
              })}
            </Stack>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
