import React from 'react';
import BigNumber from 'bignumber.js';
import { Box } from '@mui/material';
import logo from '~/img/tokens/hooligan-logo.svg';
import { Token } from '~/classes';
import useFirmTokenToFiat from '~/hooks/hooliganhorde/useFirmTokenToFiat';
import useSetting from '~/hooks/app/useSetting';
import usePrice from '~/hooks/hooliganhorde/usePrice';
import { displayBN, displayFullBN } from '~/util';
import { ZERO_BN } from '~/constants';
import Row from '~/components/Common/Row';

import { FC } from '~/types';

const Fiat: FC<{
  /* The USD value of `amount`. If provided, we don't try to derive via `firmTokenToFiat`. */
  value?: BigNumber;
  token?: Token;
  amount: BigNumber | undefined;
  allowNegative?: boolean;
  chop?: boolean;
  truncate?: boolean;
}> = ({
  value: _value,
  token,
  amount,
  allowNegative = false,
  chop = true,
  truncate = false,
}) => {
  const [denomination] = useSetting('denomination');
  const price = usePrice();
  const firmTokenToFiat = useFirmTokenToFiat();
  const value = _value
    ? // value override provided (in USD terms)
      denomination === 'usd'
      ? _value
      : _value.div(price)
    : // derive value from token amount
    amount && token
    ? firmTokenToFiat(token, amount, denomination, chop)
    : ZERO_BN;
  const displayValue = truncate
    ? displayBN(value, allowNegative)
    : displayFullBN(value, 2, 2);
  return (
    <Row
      display="inline-flex"
      sx={{ verticalAlign: 'top', position: 'relative' }}
    >
      {denomination === 'bdv' ? (
        <>
          <Box
            component="img"
            src={logo}
            alt="HOOLIGAN"
            sx={{
              height: '1em',
              marginRight: '0.25em',
              display: 'inline',
              position: 'relative',
              top: 0,
              left: 0,
            }}
          />
          <span>{displayValue}</span>
        </>
      ) : (
        <>
          <span>$</span>
          <span>{displayValue}</span>
        </>
      )}
    </Row>
  );
};

export default Fiat;
