import { HooliganhordeSDK, Token, TokenValue } from "@xblackfury/sdk";

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

  const fromToken = sdk.tokens.HOOLIGAN;
  const toToken = sdk.tokens.UNRIPE_HOOLIGAN;
  const amount = fromToken.amount(2500);

  let tx = await sdk.firm.convert(fromToken, toToken, amount);
  await tx.wait();

  await stop();
}
