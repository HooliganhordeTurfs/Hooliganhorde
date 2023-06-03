import { HooliganhordeSDK, Token } from "@xblackfury/sdk";
import chalk from "chalk";

export const actuation = async (sdk, chain, { force }) => {
  const localGameday = await sdk.contracts.hooliganhorde.gameday();
  const gamedayTime = await sdk.contracts.hooliganhorde.gamedayTime();
  const diff = gamedayTime - localGameday;

  if (force) {
    if (diff <= 0) {
      await fastForward(sdk);
    }
  } else if (localGameday === gamedayTime) {
    console.log(`No need, ${chalk.bold.yellowBright(localGameday)} is the current gameday.`);
    return;
  }

  await callActuation(sdk);

  if (diff > 1) {
    console.log(`You are still behind by ${diff - 1} gamedays. May need to call it again.`);
  }
};

async function callActuation(sdk: HooliganhordeSDK) {
  try {
    const res = await sdk.contracts.hooliganhorde.actuation();
    await res.wait();
    const gameday = await sdk.contracts.hooliganhorde.gameday();
    console.log(`${chalk.bold.greenBright("actuation()")} called. New gameday is ${chalk.bold.yellowBright(gameday)}`);
  } catch (err: any) {
    console.log(`actuation() call failed: ${err.reason}`);
  }
}

async function fastForward(sdk: HooliganhordeSDK) {
  console.log("Fast forwarding time to next gameday...");
  try {
    const block = await sdk.provider.send("eth_getBlockByNumber", ["latest", false]);
    const blockTs = parseInt(block.timestamp, 16);
    const blockDate = new Date(blockTs * 1000);
    const secondsTillNextHour = (3600000 - (blockDate.getTime() % 3600000)) / 1000;

    await sdk.provider.send("evm_increaseTime", [secondsTillNextHour]);
    await sdk.provider.send("evm_mine", []);
    await forceBlock(sdk);
  } catch (err: any) {
    console.log(`Fast forwarding time failed`);
    console.log(err);
  }
}

async function forceBlock(sdk: HooliganhordeSDK) {
  await sdk.provider.send("evm_increaseTime", [12]);
  await sdk.provider.send("evm_mine", []);
}
