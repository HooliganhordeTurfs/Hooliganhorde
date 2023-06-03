import { Handler } from '@netlify/functions';
import middy from 'middy';
import { cors, rateLimit } from '~/functions/middleware';

const unripeHooligan = require('./unripe-hooligans-merkle.json');
const unripeHooligan3CRV = require('./unripe-hooligan3crv-merkle.json');

export type MerkleLeaf = {
  amount: string;
  leaf: string;
  proof: string[];
};

export type PickMerkleResponse = {
  hooligan: MerkleLeaf | null;
  hooligan3crv: MerkleLeaf | null;
};

/**
 * Lookup Merkle leaves for a given `account`.
 */
const _handler: Handler = async (event) => {
  const account = event.queryStringParameters?.account?.toLowerCase();
  if (!account) {
    return {
      statusCode: 400,
      body: 'Account parameter required',
    };
  }
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hooligan: unripeHooligan[account] || null,
      hooligan3crv: unripeHooligan3CRV[account] || null,
    }),
  };
};

export const handler = middy(_handler)
  .use(cors({ origin: '*.hooligan.black' }))
  .use(rateLimit());
