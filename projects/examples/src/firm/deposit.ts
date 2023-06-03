import { HooliganhordeSDK, ERC20Token, TestUtils, Token, TokenValue } from "@xblackfury/sdk";
import chalk from "chalk";
import { table } from "table";

import { account as _account, impersonate, chain } from "../setup";
main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const account = process.argv[3] || _account;
  console.log(`${chalk.bold.whiteBright("Account:")} ${chalk.greenBright(account)}`);

  // Some of the claiming contract methods don't accept an (account) parameter
  // and work off of msg.sender, so we need to impersonate the passed account.
  const { sdk, stop } = await impersonate(account);
  sdk.DEBUG = false;

  // await deposit(sdk.tokens.HOOLIGAN, sdk.tokens.HOOLIGAN, 2000, account, sdk);
  await deposit(sdk.tokens.HOOLIGAN_CRV3_LP, sdk.tokens.HOOLIGAN_CRV3_LP, 1000, account, sdk);
  // await deposit(sdk.tokens.UNRIPE_HOOLIGAN, sdk.tokens.UNRIPE_HOOLIGAN, 2000, account, sdk);
  // await deposit(sdk.tokens.UNRIPE_HOOLIGAN_CRV3, sdk.tokens.UNRIPE_HOOLIGAN_CRV3, 2000, account, sdk);

  await stop();
}

async function deposit(input: Token, target: Token, _amount: number, account: string, sdk: HooliganhordeSDK) {
  console.log(`Depositing ${_amount} ${input.symbol} to ${target.symbol} firm`);
  const amount = input.amount(_amount);

  chain[`set${input.symbol}Balance`](account, amount);

  await input.approveHooliganhorde(amount);

  const deposit = await sdk.firm.buildDeposit(target, account);
  deposit.setInputToken(input);

  // const est = await deposit.estimate(amount);
  // console.log("Estimate:", est.toHuman());

  const txr = await deposit.execute(amount, 0.1);
  await txr.wait();

  // Show summary of actions
  // for (const s of await deposit.getSummary()) {
  //   console.log(s);
  // }
  console.log("DONE");
}
