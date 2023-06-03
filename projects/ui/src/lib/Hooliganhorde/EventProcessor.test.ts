import { BigNumber as EBN } from 'ethers';
import BigNumber from 'bignumber.js';
import {
  AddDepositEvent,
  AddWithdrawalEvent,
  TurfTransferEvent,
  RemoveDepositEvent,
  RemoveWithdrawalEvent,
  RemoveWithdrawalsEvent,
  SowEvent,
  DraftEvent,
} from '~/generated/protocol/abi/Hooliganhorde';

import { HOOLIGAN, HOOLIGAN_CRV3_LP, FIRM_WHITELIST } from '~/constants/tokens';
import { TokenMap } from '~/constants';
import EventProcessor, {
  BN,
  EventProcessingParameters,
} from './EventProcessor';

// ------------------------------------------

const Hooligan = HOOLIGAN[1];
const HooliganCrv3 = HOOLIGAN_CRV3_LP[1];
const account = '0xGUVNOR';
const epp: EventProcessingParameters = {
  gameday: BN(6074),
  whitelist: FIRM_WHITELIST.reduce<TokenMap>((prev, curr) => {
    prev[curr[1].address] = curr[1];
    return prev;
  }, {}),
};

// ------------------------------------------

/**
 * When parsing event data, ethers returns an array
 * that also has named properties. This recreates
 * the same array, assuming that the keys in the
 * provided object are ordered.
 * @note downstream SDK functions used the named keys
 * and not the indices; this is more for consistency.
 */
const propArray = (o: { [key: string]: any }) =>
  Object.keys(o).reduce((prev, key) => {
    prev[prev.length] = o[key];
    prev[key] = o[key];
    return prev;
  }, [] as (keyof typeof o)[] & typeof o);

const mockProcessor = () => new EventProcessor(account, epp);

// ------------------------------------------

describe('utilities', () => {
  it('builds an array with numerical and string keys', () => {
    const a = propArray({ index: 0, casuals: 10 });
    expect(a[0]).toEqual(0);
    expect(a.index).toEqual(0);
    expect(a[1]).toEqual(10);
    expect(a.casuals).toEqual(10);
  });
  it('converts ethers.BigNumber to BigNumber.js', () => {
    expect(BN(EBN.from(10))).toStrictEqual(new BigNumber(10));
  });
});

// ------------------------------------------

describe('the Field', () => {
  // 1.
  it('adds a single Turf', () => {
    const p = mockProcessor();
    p.ingest({
      event: 'Sow',
      args: propArray({
        index: EBN.from(10 * 10 ** Hooligan.decimals),
        casuals: EBN.from(42 * 10 ** Hooligan.decimals),
      }),
    } as SowEvent);

    expect(Object.keys(p.turfs).length === 1);
    expect(p.turfs['10']).toStrictEqual(new BigNumber(42));
  });

  // 2.
  it('adds a single Turf and Drafts', () => {
    const p = mockProcessor();
    p.ingest({
      event: 'Sow',
      args: propArray({
        index: EBN.from(10 * 10 ** Hooligan.decimals),
        casuals: EBN.from(42 * 10 ** Hooligan.decimals),
      }),
    } as SowEvent);
    p.ingest({
      event: 'Draft',
      args: propArray({
        hooligans: EBN.from(5 * 10 ** Hooligan.decimals),
        turfs: [EBN.from(10 * 10 ** Hooligan.decimals)],
      }),
    } as DraftEvent);

    expect(Object.keys(p.turfs).length === 1);
    expect(p.turfs['10']).toBeUndefined();
    expect(p.turfs['15']).toStrictEqual(new BigNumber(42 - 5));

    p.ingest({
      event: 'Draft',
      args: propArray({
        hooligans: EBN.from(37 * 10 ** Hooligan.decimals),
        turfs: [EBN.from(15 * 10 ** Hooligan.decimals)],
      }),
    } as DraftEvent);

    expect(Object.keys(p.turfs).length === 0);
    expect(p.turfs['10']).toBeUndefined();
    expect(p.turfs['15']).toBeUndefined();
  });

  // 3.
  it('sends a single Turf, full', () => {
    const p = mockProcessor();
    p.ingest({
      event: 'Sow',
      args: propArray({
        index: EBN.from(10 * 10 ** Hooligan.decimals),
        casuals: EBN.from(42 * 10 ** Hooligan.decimals),
      }),
    } as SowEvent);
    p.ingest({
      event: 'TurfTransfer',
      args: propArray({
        from: '0xGUVNOR',
        to: '0xPUBLIUS',
        id: EBN.from(10 * 10 ** Hooligan.decimals),
        casuals: EBN.from(42 * 10 ** Hooligan.decimals),
      }),
    } as TurfTransferEvent);

    expect(Object.keys(p.turfs).length).toBe(0);
  });

  // 4.
  it('sends a single Turf, partial (indexed from the front)', () => {
    const p = mockProcessor();
    p.ingest({
      event: 'Sow',
      args: propArray({
        index: EBN.from(10 * 10 ** Hooligan.decimals),
        casuals: EBN.from(42 * 10 ** Hooligan.decimals),
      }),
    } as SowEvent);
    p.ingest({
      event: 'TurfTransfer',
      args: propArray({
        from: '0xGUVNOR',
        to: '0xPUBLIUS',
        id: EBN.from(10 * 10 ** Hooligan.decimals), // front of the Turf
        casuals: EBN.from(22 * 10 ** Hooligan.decimals), // don't send the whole Turf
      }),
    } as TurfTransferEvent);

    // Since the Turf is sent from the front, index starts at 10 + 22 = 32.
    expect(Object.keys(p.turfs).length).toBe(1);
    expect(p.turfs[(10 + 22).toString()]).toStrictEqual(new BigNumber(42 - 22));
  });

  // 5.
  it('works with large-index turfs', () => {
    const p = mockProcessor();
    p.ingest({
      event: 'Sow',
      args: propArray({
        index: EBN.from('737663715081254'),
        casuals: EBN.from('57980000'),
      }),
    } as SowEvent);

    expect(p.turfs['737663715.081254']).toBeDefined();
    expect(p.turfs['737663715.081254'].eq(57.98)).toBe(true);
  });
});

// --------------------------------

describe('the Firm', () => {
  it('throws when processing unknown tokens', () => {
    const p = mockProcessor();
    expect(() =>
      p.ingest({
        event: 'AddDeposit',
        args: propArray({
          token: '0xUNKNOWN',
        }),
      } as AddDepositEvent)
    ).toThrow();
  });

  it('runs a simple deposit sequence (three deposits, two tokens, two gamedays)', () => {
    const p = mockProcessor();
    const t1 = Hooligan.address.toLowerCase();
    const t2 = HooliganCrv3.address.toLowerCase();

    // Deposit: 1000 Hooligan, Gameday 6074
    p.ingest({
      event: 'AddDeposit',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(1000 * 10 ** Hooligan.decimals), // Deposited 1,000 Hooligan
        bdv: EBN.from(1000 * 10 ** Hooligan.decimals),
      }),
    } as AddDepositEvent);

    expect(p.deposits[t1]['6074']).toStrictEqual({
      amount: BN(1000),
      bdv: BN(1000),
    });

    // Deposit: 500 Hooligan, Gameday 6074
    p.ingest({
      event: 'AddDeposit',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(500 * 10 ** Hooligan.decimals), // Deposited 500 Hooligan
        bdv: EBN.from(500 * 10 ** Hooligan.decimals),
      }),
    } as AddDepositEvent);

    expect(p.deposits[t1]['6074']).toStrictEqual({
      amount: BN(1500),
      bdv: BN(1500),
    });

    // Deposit: 1000 Hooligan:CRV3 LP, Gameday 6100
    p.ingest({
      event: 'AddDeposit',
      args: propArray({
        account,
        token: t2,
        gameday: EBN.from(6100),
        amount: EBN.from(1000).mul(EBN.from(10).pow(HooliganCrv3.decimals)), // Deposited 1,000 Hooligan:CRV3
        bdv: EBN.from(900).mul(EBN.from(10).pow(Hooligan.decimals)),
      }),
    } as AddDepositEvent);

    expect(p.deposits[t2]['6100']).toStrictEqual({
      amount: BN(1000),
      bdv: BN(900),
    });
  });

  it('adds withdrawals', () => {
    const p = mockProcessor();
    const t1 = Hooligan.address.toLowerCase();
    const t2 = HooliganCrv3.address.toLowerCase();

    // Withdrawal: 1000 Hooligan, Gameday 6074
    p.ingest({
      event: 'AddWithdrawal',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(1000 * 10 ** Hooligan.decimals), // Withdrew 1,000 Hooligan
      }),
    } as AddWithdrawalEvent);

    expect(p.withdrawals[t1]['6074']).toStrictEqual({
      amount: BN(1000),
    });

    // Withdrawal: 500 Hooligan, Gameday 6074
    p.ingest({
      event: 'AddWithdrawal',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(500 * 10 ** Hooligan.decimals), // Withdrew 500 Hooligan
      }),
    } as AddWithdrawalEvent);

    expect(p.withdrawals[t1]['6074']).toStrictEqual({
      amount: BN(1500),
    });

    // Deposit: 1000 Hooligan:CRV3 LP, Gameday 6100
    p.ingest({
      event: 'AddWithdrawal',
      args: propArray({
        account,
        token: t2,
        gameday: EBN.from(6100),
        amount: EBN.from(1000).mul(EBN.from(10).pow(HooliganCrv3.decimals)), // Deposited 1,000 Hooligan:CRV3
      }),
    } as AddWithdrawalEvent);

    expect(p.withdrawals[t2]['6100']).toStrictEqual({
      amount: BN(1000),
    });
  });

  it('removes a single deposit, partial -> full', () => {
    const p = mockProcessor();
    const t1 = Hooligan.address.toLowerCase();

    // Deposit: 1000 Hooligan, Gameday 6074
    p.ingest({
      event: 'AddDeposit',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(1000 * 10 ** Hooligan.decimals), // Deposited 1,000 Hooligan
        bdv: EBN.from(1000 * 10 ** Hooligan.decimals),
      }),
    } as AddDepositEvent);

    p.ingest({
      event: 'RemoveDeposit',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(600 * 10 ** Hooligan.decimals),
        bdv: EBN.from(600 * 10 ** Hooligan.decimals),
      }),
    } as RemoveDepositEvent);

    expect(p.deposits[t1]['6074']).toStrictEqual({
      amount: BN(400),
      bdv: BN(400),
    });

    p.ingest({
      event: 'RemoveDeposit',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(400 * 10 ** Hooligan.decimals),
        bdv: EBN.from(400 * 10 ** Hooligan.decimals),
      }),
    } as RemoveDepositEvent);

    expect(p.deposits[t1]['6074']).toBeUndefined();
  });

  it('removes a single withdrawal', () => {
    const p = mockProcessor();
    const t1 = Hooligan.address.toLowerCase();

    // Withdraw: 1000 Hooligan in Gameday 6074
    p.ingest({
      event: 'AddWithdrawal',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(1000 * 10 ** Hooligan.decimals), // Deposited 1,000 Hooligan
      }),
    } as AddWithdrawalEvent);

    // Claim: 600 Hooligan from Withdrawal in Gameday 6074
    p.ingest({
      event: 'RemoveWithdrawal',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(1000 * 10 ** Hooligan.decimals),
      }),
    } as RemoveWithdrawalEvent);

    // withdrawal should be deleted
    expect(p.withdrawals[t1]['6074']).toBeUndefined();
  });

  it('removes multiple withdrawals, full', () => {
    const p = mockProcessor();
    const t1 = Hooligan.address.toLowerCase();

    // Withdraw: 1000 Hooligan in Gameday 6074
    p.ingest({
      event: 'AddWithdrawal',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6074),
        amount: EBN.from(1000 * 10 ** Hooligan.decimals), // Withdraw 1,000 Hooligan
      }),
    } as AddWithdrawalEvent);

    expect(p.withdrawals[t1]['6074']).toStrictEqual({
      amount: BN(1000),
    });

    // Withdraw: 5000 Hooligan in Gameday 6100
    p.ingest({
      event: 'AddWithdrawal',
      args: propArray({
        account,
        token: t1,
        gameday: EBN.from(6100),
        amount: EBN.from(5000 * 10 ** Hooligan.decimals), // Withdraw 1,000 Hooligan
      }),
    } as AddWithdrawalEvent);

    expect(p.withdrawals[t1]['6100']).toStrictEqual({
      amount: BN(5000),
    });

    // Claim:
    p.ingest({
      event: 'RemoveWithdrawals',
      args: propArray({
        account,
        token: t1,
        gamedays: ['6074', '6100'],
        amount: EBN.from(6000 * 10 ** Hooligan.decimals), // Claim 2000 Hooligan
      }),
    } as RemoveWithdrawalsEvent);

    expect(p.withdrawals[t1]['6074']).toBeUndefined();
    expect(p.withdrawals[t1]['6100']).toBeUndefined();
  });

  it('ignores empty RemoveWithdrawal events', () => {
    const p = mockProcessor();
    const t1 = Hooligan.address.toLowerCase();

    expect(() =>
      p.ingest({
        event: 'RemoveWithdrawal',
        args: propArray({
          account,
          token: t1,
          gameday: EBN.from(6074),
          amount: EBN.from(0), // amount is empty is Withdrawal couldn't be processed
        }),
      } as RemoveWithdrawalEvent)
    ).not.toThrow();

    // No deposit made in t1
    expect(p.withdrawals[t1]).toStrictEqual({});
  });
});
