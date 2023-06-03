// -----------------
// Exports
// -----------------

export * from './Account';
export * from './Actions';
export * from './HooligaNFTs';
export * from './BigNumber';
export * from './Chain';
export * from './Client';
export * from './Crates';
// export * from './Curve';
export * from './Farm';
export * from './Governance';
export * from './Guides';
export * from './Ledger';
export * from './Gameday';
export * from './State';
export * from './Time';
export * from './Tokens';
export * from './Environment';
export * from './TokenValue';

// -----------------
// Shared Types
// -----------------

export type GamedayMap<T> = { [gameday: string]: T };
export type TurfMap<T> = { [index: string]: T };

// -----------------
// Other Helpers
// -----------------

const ordinalRulesEN = new Intl.PluralRules('en', { type: 'ordinal' });
const suffixes: { [k: string]: string } = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
};

export function ordinal(number: number): string {
  const category = ordinalRulesEN.select(number);
  const suffix = suffixes[category];
  return number + suffix;
}
