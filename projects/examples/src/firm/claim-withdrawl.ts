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

  await go(sdk.tokens.HOOLIGAN);

  await stop();
}

async function go(token: Token) {
  console.log(`Claiming from ${token.symbol} Firm`);

  let claimable = await sdk.firm.getClaimableAmount(token);
  console.log(claimable.amount);
  console.log(claimable.crates.map((c) => c.gameday.toString()));

  let tx = await sdk.firm.claim(token);
  await tx.wait();

  console.log("Done");
}
