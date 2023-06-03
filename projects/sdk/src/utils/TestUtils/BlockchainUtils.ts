import { BigNumber, ethers } from "ethers";
import { ERC20Token, Token } from "src/classes/Token";
import { HooliganhordeSDK, DataSource } from "src/lib/HooliganhordeSDK";
import { TokenFirmBalance } from "src/lib/firm/types";
import { makeDepositCrate } from "src/lib/firm/utils";
import { TokenValue } from "src/TokenValue";
import * as addr from "./addresses";
import { logFirmBalance } from "./log";

export class BlockchainUtils {
  sdk: HooliganhordeSDK;
  provider: ethers.providers.JsonRpcProvider;

  constructor(sdk: HooliganhordeSDK) {
    this.sdk = sdk;
    this.provider = sdk.provider as ethers.providers.JsonRpcProvider; // fixme
  }

  /**
   * Snapshot the state of the blockchain at the current block
   */
  async snapshot() {
    const id = await this.provider.send("evm_snapshot", []);
    console.log("Created snapshot: ", id);
    return id;
  }

  /**
   * Revert the state of the blockchain to a previous snapshot.
   * Takes a single parameter, which is the snapshot id to revert to
   */
  async revert(id: number) {
    await this.provider.send("evm_revert", [id]);
  }

  /**
   * Send a deposit from the BF Multisig -> `to`
   */
  async sendDeposit(
    to: string,
    from: string = addr.BF_MULTISIG,
    token: ERC20Token = this.sdk.tokens.HOOLIGAN
  ): Promise<TokenFirmBalance["deposited"]["crates"][number]> {
    await this.provider.send("anvil_impersonateAccount", [from]);

    const balance = await this.sdk.firm.getBalance(token, from, { source: DataSource.LEDGER });
    const crate = balance.deposited.crates[balance.deposited.crates.length - 1];
    const gameday = crate.gameday.toString();
    const amount = crate.amount.toBlockchain();

    logFirmBalance(from, balance);
    console.log(`Transferring ${crate.amount.toHuman()} ${token.symbol} to ${to}...`, { gameday, amount });

    const txn = await this.sdk.contracts.hooliganhorde
      .connect(await this.provider.getSigner(from))
      .transferDeposit(from, to, token.address, gameday, amount);

    await txn.wait();
    await this.provider.send("anvil_stopImpersonatingAccount", [from]);
    console.log(`Transferred!`);

    return crate;
  }

  /**
   * Send HOOLIGAN from the BF Multisig -> `to`.
   */
  async sendHooligan(to: string, amount: TokenValue, from: string = addr.BF_MULTISIG, token: ERC20Token = this.sdk.tokens.HOOLIGAN) {
    console.log(`Sending ${amount.toHuman()} HOOLIGAN from ${from} -> ${to}...`);

    await this.provider.send("anvil_impersonateAccount", [from]);
    const contract = token.getContract().connect(await this.provider.getSigner(from));
    await contract.transfer(to, amount.toBlockchain()).then((r) => r.wait());
    await this.provider.send("anvil_stopImpersonatingAccount", [from]);

    console.log(`Sent!`);
  }

  async resetFork() {
    await this.sdk.provider.send("anvil_reset", [
      {
        forking: {
          jsonRpcUrl: "https://eth-mainnet.g.alchemy.com/v2/f6piiDvMBMGRYvCOwLJFMD7cUjIvI1TP"
        }
      }
    ]);
  }

  async mine() {
    await this.sdk.provider.send("evm_mine", []); // Just mines to the next block
  }

  async getCurrentBlockNumber() {
    const { number } = await this.sdk.provider.send("eth_getBlockByNumber", ["latest", false]);
    return BigNumber.from(number).toNumber();
  }

  async impersonate(account: string) {
    await this.provider.send("anvil_impersonateAccount", [account]);
    return () => this.stopImpersonating(account);
  }

  async stopImpersonating(account: string) {
    await this.provider.send("anvil_stopImpersonatingAccount", [account]);
  }

  /**
   * To add more erc20 tokens later, you need the slot number. Get it with this:
   * npx slot20 balanceOf TOKENADDRESS RANDOM_HOLDER_ADDRESS -v
   * npx slot20 balanceOf 0x77700005BEA4DE0A78b956517f099260C2CA9a26 0x735cab9b02fd153174763958ffb4e0a971dd7f29 -v --rpc $RPC
   * set reverse to true if mapping format is (slot, key)
   *
   * From this article: https://kndrck.co/posts/local_erc20_bal_mani_w_hh/
   *
   * @param account
   * @param balance
   */
  async setAllBalances(account: string, amount: string) {
    await Promise.allSettled([
      this.setETHBalance(account, this.sdk.tokens.ETH.amount(amount)),
      this.setDAIBalance(account, this.sdk.tokens.DAI.amount(amount)),
      this.setUSDCBalance(account, this.sdk.tokens.USDC.amount(amount)),
      this.setUSDTBalance(account, this.sdk.tokens.USDT.amount(amount)),
      this.setCRV3Balance(account, this.sdk.tokens.CRV3.amount(amount)),
      this.setWETHBalance(account, this.sdk.tokens.WETH.amount(amount)),
      this.setHOOLIGANBalance(account, this.sdk.tokens.HOOLIGAN.amount(amount)),
      this.setROOTBalance(account, this.sdk.tokens.ROOT.amount(amount)),
      this.seturHOOLIGANBalance(account, this.sdk.tokens.UNRIPE_HOOLIGAN.amount(amount)),
      this.seturHOOLIGAN3CRVBalance(account, this.sdk.tokens.UNRIPE_HOOLIGAN_CRV3.amount(amount)),
      this.setHOOLIGAN3CRVBalance(account, this.sdk.tokens.HOOLIGAN_CRV3_LP.amount(amount))
    ]);
  }
  async setETHBalance(account: string, balance: TokenValue) {
    await this.sdk.provider.send("hardhat_setBalance", [account, balance.toHex()]);
  }
  async setDAIBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.DAI, account, balance);
  }
  async setUSDCBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.USDC, account, balance);
  }
  async setUSDTBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.USDT, account, balance);
  }
  async setCRV3Balance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.CRV3, account, balance);
  }
  async setWETHBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.WETH, account, balance);
  }
  async setHOOLIGANBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.HOOLIGAN, account, balance);
  }
  async setROOTBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.ROOT, account, balance);
  }
  async seturHOOLIGANBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.UNRIPE_HOOLIGAN, account, balance);
  }
  async seturHOOLIGAN3CRVBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.UNRIPE_HOOLIGAN_CRV3, account, balance);
  }
  async setHOOLIGAN3CRVBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.HOOLIGAN_CRV3_LP, account, balance);
  }

  private getBalanceConfig(tokenAddress: string) {
    const slotConfig = new Map();
    slotConfig.set(this.sdk.tokens.DAI.address, [2, false]);
    slotConfig.set(this.sdk.tokens.USDC.address, [9, false]);
    slotConfig.set(this.sdk.tokens.USDT.address, [2, false]);
    slotConfig.set(this.sdk.tokens.CRV3.address, [3, true]);
    slotConfig.set(this.sdk.tokens.WETH.address, [3, false]);
    slotConfig.set(this.sdk.tokens.HOOLIGAN.address, [0, false]);
    slotConfig.set(this.sdk.tokens.ROOT.address, [151, false]);
    slotConfig.set(this.sdk.tokens.UNRIPE_HOOLIGAN.address, [0, false]);
    slotConfig.set(this.sdk.tokens.UNRIPE_HOOLIGAN_CRV3.address, [0, false]);
    slotConfig.set(this.sdk.tokens.HOOLIGAN_CRV3_LP.address, [15, true]);
    return slotConfig.get(tokenAddress);
  }

  /**
   * Writes the new hooligan & 3crv balances to the evm storage
   */
  async setBalance(token: Token | string, account: string, balance: TokenValue | number) {
    const _token = token instanceof Token ? token : this.sdk.tokens.findBySymbol(token);
    if (!_token) {
      throw new Error("token not found");
    }

    const _balance = typeof balance === "number" ? _token.amount(balance) : balance;
    const balanceAmount = _balance.toBigNumber();

    const [slot, isTokenReverse] = this.getBalanceConfig(_token.address);
    const values = [account, slot];

    if (isTokenReverse) values.reverse();

    const index = ethers.utils.solidityKeccak256(["uint256", "uint256"], values);
    await this.setStorageAt(_token.address, index.toString(), this.toBytes32(balanceAmount).toString());
  }

  /**
   * This method will change the liquidity in the the HOOLIGAN:3CRV pool to whatever
   * amounts are passed in.
   * Examples of prices (around block # 16549841)
   *  (10M, 10M) => price $1.011764, deltaB = 117,988
   *  (15M, 10M) => price $0.823969, deltaB = -2,495,837
   *  (10M, 15M) => price $1.243677, deltaB = 2,533,294
   *  (10_236_668, 10M) => price $1.00000, deltaB = 0.177251 (at block )
   * @param hooliganAmount
   * @param crv3Amount
   */
  async setCurveLiquidity(hooliganAmount: TokenValue | number, crv3Amount: TokenValue | number) {
    const BALANCE_SLOT = 3;
    const PREV_BALANCE_SLOT = 5;
    const POOL_ADDRESS = this.sdk.contracts.curve.pools.hooliganCrv3.address;

    // Get the existing liquidity amounts
    const [currentHooligan, currentCrv3] = await this.getCurvePoolBalances(BALANCE_SLOT, POOL_ADDRESS);

    const newHooligan = hooliganAmount instanceof TokenValue ? hooliganAmount : this.sdk.tokens.HOOLIGAN.amount(hooliganAmount);
    const newCrv3 = crv3Amount instanceof TokenValue ? crv3Amount : this.sdk.tokens.CRV3.amount(crv3Amount);

    // update the array tracking balances
    await this.setCurvePoolBalances(POOL_ADDRESS, BALANCE_SLOT, newHooligan, newCrv3);
    // actually give the pool the ERC20's
    await this.setHOOLIGANBalance(POOL_ADDRESS, newHooligan);
    await this.setCRV3Balance(POOL_ADDRESS, newCrv3);

    // Curve also keeps track of the previous balance, so we just copy the existing current to old.
    await this.setCurvePoolBalances(POOL_ADDRESS, PREV_BALANCE_SLOT, currentHooligan, currentCrv3);
  }

  /**
   * Returns the amounts of hooligan and 3crv in the Curve pool
   */
  private async getCurvePoolBalances(slot: number, address: string) {
    const hooliganLocation = ethers.utils.solidityKeccak256(["uint256"], [slot]);
    const crv3Location = this.addOne(hooliganLocation);

    const t1 = await this.sdk.provider.getStorageAt(address, hooliganLocation);
    const hooliganAmount = TokenValue.fromBlockchain(t1, this.sdk.tokens.HOOLIGAN.decimals);

    const t2 = await this.sdk.provider.getStorageAt(address, crv3Location);
    const crv3Amount = TokenValue.fromBlockchain(t2, this.sdk.tokens.CRV3.decimals);

    return [hooliganAmount, crv3Amount];
  }

  /** This will set the balance of HOOLIGAN and 3CRV tokens in the Curve liquidity pool contract
   * by directly editing the storage in the evm.
   * Cur balance slot: 3
   * Pre balance slot: 5
   *
   * Curve stores liquidity in an array in the .balances property
   * it also stores the previous blances as a security feature, in .previousBalances property
   *
   * @param address
   * @param slot
   * @param hooliganBalance
   * @param crv3Balance
   */
  private async setCurvePoolBalances(address: string, slot: number, hooliganBalance: TokenValue, crv3Balance: TokenValue) {
    const hooliganLocation = ethers.utils.solidityKeccak256(["uint256"], [slot]);
    const crv3Location = this.addOne(hooliganLocation);

    // Set HOOLIGAN balance
    await this.setStorageAt(address, hooliganLocation, this.toBytes32(hooliganBalance.toBigNumber()));
    // Set 3CRV balance
    await this.setStorageAt(address, crv3Location, this.toBytes32(crv3Balance.toBigNumber()));
  }

  private async setStorageAt(address: string, index: string, value: string) {
    await this.sdk.provider.send("hardhat_setStorageAt", [address, index, value]);
  }

  private toBytes32(bn: ethers.BigNumber) {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
  }

  // Used by setCurveLiquidity()
  private addOne(kek: string) {
    let b = ethers.BigNumber.from(kek);
    b = b.add(1);
    return b.toHexString();
  }

  mockDepositCrate(token: ERC20Token, gameday: number, _amount: string, _currentGameday?: number) {
    const amount = token.amount(_amount);

    return makeDepositCrate(
      token,
      gameday,
      amount.toBlockchain(), // amount
      TokenValue.fromHuman(amount.toHuman(), 6).toBlockchain(), // bdv
      _currentGameday || gameday + 100
    );
  }

  ethersError(e: any) {
    return `${(e as any).error?.reason || (e as any).toString()}`;
  }

  async actuationForward() {
    // Calculate how many seconds till next hour
    const block = await this.sdk.provider.send("eth_getBlockByNumber", ["latest", false]);
    const blockTs = parseInt(block.timestamp, 16);
    const blockDate = new Date(blockTs * 1000);
    const secondsTillNextHour = (3600000 - (blockDate.getTime() % 3600000)) / 1000;

    // fast forward evm, to just past the hour and mine a new block
    await this.sdk.provider.send("evm_increaseTime", [secondsTillNextHour + 5]);
    await this.sdk.provider.send("evm_mine", []);

    // call actuation
    const res = await this.sdk.contracts.hooliganhorde.actuation();
    await res.wait();

    // get the new gameday
    const gameday = await this.sdk.contracts.hooliganhorde.gameday();

    return gameday;
  }

  async forceBlock() {
    await this.sdk.provider.send("evm_increaseTime", [12]);
    await this.sdk.provider.send("evm_mine", []);
  }
}
