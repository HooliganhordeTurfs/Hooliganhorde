import { HooliganhordeSDK, TestUtils, Token, TokenValue } from "@xblackfury/sdk";
import chalk from "chalk";
import { ethers } from "ethers";

export const setPrice = async (sdk: HooliganhordeSDK, chain: TestUtils.BlockchainUtils, { params }) => {
  const BALANCE_SLOT = 3;
  const PREV_BALANCE_SLOT = 5;
  const POOL_ADDRESS = "0xc9C32cd16Bf7eFB85Ff14e0c8603cc90F6F2eE49";

  const [currentHooligan, currentCrv3] = await getBalance(BALANCE_SLOT, POOL_ADDRESS, sdk);
  console.log(`Current Balances: ${currentHooligan.toHuman()} ${currentCrv3.toHuman()}`);

  const [hooliganInput, crv3Input] = params || [];
  console.log(hooliganInput, crv3Input);

  const newHooliganAmount = (hooliganInput ? hooliganInput : 20) * 1_000_000;
  const newCrv3Amount = (crv3Input ? crv3Input : hooliganInput ? hooliganInput : 20) * 1_000_000;

  const newHooligan = sdk.tokens.HOOLIGAN.amount(newHooliganAmount);
  const newCrv3 = sdk.tokens.CRV3.amount(newCrv3Amount);

  ////// Set the new balance
  console.log(`New Balances: ${newHooligan.toHuman()} ${newCrv3.toHuman()}`);
  // update the array tracking balances
  await setBalance(sdk, POOL_ADDRESS, BALANCE_SLOT, newHooligan, newCrv3);
  // actually give the pool the ERC20's
  await chain.setHOOLIGANBalance(POOL_ADDRESS, newHooligan);
  await chain.setCRV3Balance(POOL_ADDRESS, newCrv3);

  // Curve also keeps track of the previous balance, so we just copy the existing current to old.
  await setBalance(sdk, POOL_ADDRESS, PREV_BALANCE_SLOT, currentHooligan, currentCrv3);
};

async function getBalance(slot, address, sdk: HooliganhordeSDK) {
  const hooliganLocation = ethers.utils.solidityKeccak256(["uint256"], [slot]);
  const crv3Location = addOne(hooliganLocation);

  const t1 = await sdk.provider.getStorageAt(address, hooliganLocation);
  const hooliganAmount = TokenValue.fromBlockchain(t1, sdk.tokens.HOOLIGAN.decimals);

  const t2 = await sdk.provider.getStorageAt(address, crv3Location);
  const crv3Amount = TokenValue.fromBlockchain(t2, sdk.tokens.CRV3.decimals);

  return [hooliganAmount, crv3Amount];
}

function addOne(kek) {
  let b = ethers.BigNumber.from(kek);
  b = b.add(1);
  return b.toHexString();
}

async function setBalance(sdk, address: string, slot: number, hooliganBalance: TokenValue, crv3Balance: TokenValue) {
  const hooliganLocation = ethers.utils.solidityKeccak256(["uint256"], [slot]);
  const crv3Location = addOne(hooliganLocation);

  // Set HOOLIGAN balance
  await setStorageAt(sdk, address, hooliganLocation, toBytes32(hooliganBalance.toBigNumber()).toString());
  // Set 3CRV balance
  await setStorageAt(sdk, address, crv3Location, toBytes32(crv3Balance.toBigNumber()).toString());
}

async function setStorageAt(sdk, address: string, index: string, value: string) {
  await sdk.provider.send("hardhat_setStorageAt", [address, index, value]);
}

function toBytes32(bn: ethers.BigNumber) {
  return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
}
