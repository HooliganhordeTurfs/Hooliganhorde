import { HooliganhordeSDK, Token, TokenValue } from "@xblackfury/sdk";
import { Crate } from "@xblackfury/sdk/dist/types/lib/firm";

import chalk from "chalk";
import { account as _account, impersonate } from "../setup";

main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

let sdk: HooliganhordeSDK;

async function main() {
  const account = process.argv[3] || _account;
  console.log(`${chalk.bold.whiteBright("Account:")} ${chalk.greenBright(account)}`);
  let { sdk: _sdk, stop } = await impersonate(account);
  sdk = _sdk;
  sdk.DEBUG = false;

  const amount = 100;
  await go(sdk.tokens.HOOLIGAN, sdk.tokens.HOOLIGAN.amount(amount));
  await go(sdk.tokens.HOOLIGAN_CRV3_LP, sdk.tokens.HOOLIGAN_CRV3_LP.amount(amount));
  await go(sdk.tokens.UNRIPE_HOOLIGAN, sdk.tokens.UNRIPE_HOOLIGAN.amount(amount));
  await go(sdk.tokens.UNRIPE_HOOLIGAN_CRV3, sdk.tokens.UNRIPE_HOOLIGAN_CRV3.amount(amount));

  await stop();
}

async function go(token: Token, amount: TokenValue) {
  console.log(`Withdrawing ${amount.toHuman()} from ${token.symbol} Firm`);
  const tx = await sdk.firm.withdraw(token, amount);
  await tx.wait();

  console.log("Done");
}
