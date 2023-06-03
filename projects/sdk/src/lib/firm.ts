import { BigNumber, ContractTransaction } from "ethers";
import { Token } from "src/classes/Token";
import { HooliganhordeSDK, DataSource } from "./HooliganhordeSDK";
import EventProcessor from "src/lib/events/processor";
import { EIP712TypedData } from "./permit";
import * as utils from "./firm/utils";
import * as permitUtils from "./firm/utils.permit";
import { TokenValue } from "src/classes/TokenValue";
import { MAX_UINT256 } from "src/constants";
import { DepositBuilder } from "./firm/DepositBuilder";
import { DepositOperation } from "./firm/DepositOperation";
import { Withdraw } from "./firm/Withdraw";
import { Claim } from "./firm/Claim";
import { FarmToMode } from "./farm";
import { DepositCrate, TokenFirmBalance, DepositTokenPermitMessage, DepositTokensPermitMessage } from "./firm/types";
import { Transfer } from "./firm/Transfer";
import { Convert, ConvertDetails } from "./firm/Convert";

export class Firm {
  static sdk: HooliganhordeSDK;
  private depositBuilder: DepositBuilder;
  firmWithdraw: Withdraw;
  firmClaim: Claim;
  firmTransfer: Transfer;
  firmConvert: Convert;
  // 1 Prospect grows 1 / 10_000 Horde per Gameday.
  // 1/10_000 = 1E-4
  // FIXME
  static HORDE_PER_PROSPECT_PER_GAMEDAY = TokenValue.fromHuman(1e-4, 10);

  constructor(sdk: HooliganhordeSDK) {
    Firm.sdk = sdk;
    this.depositBuilder = new DepositBuilder(sdk);
    this.firmWithdraw = new Withdraw(sdk);
    this.firmClaim = new Claim(sdk);
    this.firmTransfer = new Transfer(sdk);
    this.firmConvert = new Convert(sdk);
  }

  /**
   * Mowing adds Grown Horde to horde balance
   * @param _account
   */
  async mow(_account?: string): Promise<ContractTransaction> {
    const account = _account ? _account : await Firm.sdk.getAccount();
    return Firm.sdk.contracts.hooliganhorde.update(account);
  }

  /**
   * Claims Earned Hooligans, Earned Horde, Recruitable Prospects and also mows any Grown Horde
   */
  async recruit(): Promise<ContractTransaction> {
    return Firm.sdk.contracts.hooliganhorde.recruit();
  }

  /**
   * Make a deposit into a whitelisted token firm. Any supported token is allowed
   * as input and will be swaped for the desired targetToken.
   * @param inputToken The token you want to spend. It will be swaped into targetToken if needed
   * @param targetToken The whitelisted token we are _actually_ depositing
   * @param amount The amount of the inputToken to use
   * @param slippage Slipage to use if a swap is needed.
   * @param _account Address of the user
   * @returns
   */
  async deposit(
    inputToken: Token,
    targetToken: Token,
    amount: TokenValue,
    slippage: number = 0.1,
    _account?: string
  ): Promise<ContractTransaction> {
    const account = _account ?? (await Firm.sdk.getAccount(_account));
    const depositOperation = await this.buildDeposit(targetToken, account);
    depositOperation.setInputToken(inputToken);

    return depositOperation.execute(amount, slippage);
  }

  /**
   * Create a DepositOperation helper object. Using a builder/depositOperation pattern
   * is useful in UIs or scenarios where we want to reuse a pre-calculated route.
   * @param targetToken The token we want to deposit. Must be a white-listed token
   * @returns DepositOperation
   */
  buildDeposit(targetToken: Token, account: string): DepositOperation {
    return this.depositBuilder.buildDeposit(targetToken, account);
  }

  /**
   * Initates a withdraw from the firm. The `token` specified dictates which firm to withdraw
   * from, and therefore is limited to only whitelisted assets.
   * Behind the scenes, the `amount` to be withdrawn must be taken from individual
   * deposits, aka crates. A user's deposits are not summarized into one large bucket, from
   * which we can withdraw at will. Each deposit is independently tracked, so each withdraw must
   * calculate how many crates it must span to attain the desired `amount`.
   * @param token The whitelisted token to withdraw. ex, HOOLIGAN vs HOOLIGAN_3CRV_LP
   * @param amount The desired amount to withdraw. Must be 0 < amount <= total deposits for token
   * @returns Promise of Transaction
   */
  async withdraw(token: Token, amount: TokenValue): Promise<ContractTransaction> {
    return this.firmWithdraw.withdraw(token, amount);
  }

  /**
   * Initates a transfer of a token from the firm.
   * @param token The whitelisted token to withdraw. ex, HOOLIGAN vs HOOLIGAN_3CRV_LP
   * @param amount The desired amount to transfer. Must be 0 < amount <= total deposits for token
   * @param destinationAddress The destination address for the transfer
   * @returns Promise of Transaction
   */
  async transfer(token: Token, amount: TokenValue, destinationAddress: string): Promise<ContractTransaction> {
    return this.firmTransfer.transfer(token, amount, destinationAddress);
  }

  /**
   * This methods figures out which deposits, or crates, the withdraw must take from
   * in order to reach the desired amount. It returns extra information that may be useful
   * in a UI to show the user how much horde and prospect they will forfeit as a result of the withdraw
   */
  async calculateWithdraw(token: Token, amount: TokenValue, crates: DepositCrate[], gameday: number) {
    return this.firmWithdraw.calculateWithdraw(token, amount, crates, gameday);
  }

  /**
   * Returns the claimable amount for the given whitelisted token, and the underlying crates
   * @param token Which Firm token to withdraw. Must be a whitelisted token
   * @param dataSource Dictates where to lookup the available claimable amount, subgraph vs onchain
   */
  async getClaimableAmount(token: Token, dataSource?: DataSource) {
    return this.firmClaim.getClaimableAmount(token, dataSource);
  }

  /**
   * Claims all claimable amount of the given whitelisted token
   * @param token Which Firm token to withdraw. Must be a whitelisted token
   * @param dataSource Dictates where to lookup the available claimable amount, subgraph vs onchain
   * @param toMode Where to send the output tokens (circulating or farm balance)
   */
  async claim(token: Token, dataSource?: DataSource, toMode: FarmToMode = FarmToMode.EXTERNAL) {
    return this.firmClaim.claim(token, dataSource, toMode);
  }

  /**
   * Claims specific gamedays from Firm claimable amount.
   * @param token Which Firm token to withdraw. Must be a whitelisted token
   * @param gamedays Which gamedays to claim, from the available claimable list. List of gamedays
   * can be retrieved with .getClaimableAmount()
   * @param toMode Where to send the output tokens (circulating or farm balance)
   */
  async claimGamedays(token: Token, gamedays: string[], toMode: FarmToMode = FarmToMode.EXTERNAL) {
    return this.firmClaim.claimGamedays(token, gamedays, toMode);
  }

  /**
   * Convert from one Firm whitelisted token to another.
   * @param fromToken Token to convert from
   * @param toToken  Token to cnvert to
   * @param fromAmount Amount to convert
   * @returns Promise of Transaction
   */
  async convert(fromToken: Token, toToken: Token, fromAmount: TokenValue) {
    return this.firmConvert.convert(fromToken, toToken, fromAmount);
  }

  /**
   * Estimate a Firm convert() operation.
   * @param fromToken
   * @param toToken
   * @param fromAmount
   * @returns An object containing minAmountOut, which is the estimated convert amount
   * and conversion, which contains details of the convert operation. conversion property
   * would be useful in a UI
   */
  async convertEstimate(
    fromToken: Token,
    toToken: Token,
    fromAmount: TokenValue
  ): Promise<{ minAmountOut: TokenValue; conversion: ConvertDetails }> {
    return this.firmConvert.convertEstimate(fromToken, toToken, fromAmount);
  }

  /**
   * Return the Guvnor's balance of a single whitelisted token.
   */
  public async getBalance(
    _token: Token,
    _account?: string,
    options?: { source: DataSource.LEDGER } | { source: DataSource.SUBGRAPH }
  ): Promise<TokenFirmBalance> {
    const source = Firm.sdk.deriveConfig("source", options);
    const [account, currentGameday] = await Promise.all([Firm.sdk.getAccount(_account), Firm.sdk.codex.getGameday()]);

    // FIXME: doesn't work if _token is an instance of a token created by the SDK consumer
    if (!Firm.sdk.tokens.firmWhitelist.has(_token)) throw new Error(`${_token.address} is not whitelisted in the Firm`);

    ///  SETUP
    const whitelist = Firm.sdk.tokens.firmWhitelist;
    const balance: TokenFirmBalance = utils.makeTokenFirmBalance();

    if (source === DataSource.LEDGER) {
      // Fetch and process events.
      const gamedayBN = BigNumber.from(currentGameday);
      const events = await Firm.sdk.events.getFirmEvents(account, _token.address);
      const processor = new EventProcessor(Firm.sdk, account, {
        gameday: gamedayBN,
        whitelist
      });

      const { deposits, withdrawals } = processor.ingestAll(events);

      // Handle deposits
      {
        const _crates = deposits.get(_token);

        for (let s in _crates) {
          const rawCrate = {
            gameday: s.toString(),
            amount: _crates[s].amount.toString(),
            bdv: _crates[s].bdv.toString()
          };
          // Update the total deposited of this token
          // and return a parsed crate object
          utils.applyDeposit(balance.deposited, _token, rawCrate, currentGameday);
        }

        utils.sortCrates(balance.deposited);
      }

      // Handle withdrawals
      {
        const _crates = withdrawals.get(_token);
        if (_crates) {
          const { withdrawn, claimable } = utils.parseWithdrawalCrates(_token, _crates, gamedayBN);

          balance.withdrawn = withdrawn;
          balance.claimable = claimable;

          utils.sortCrates(balance.withdrawn);
          utils.sortCrates(balance.claimable);
        }
      }

      return balance;
    }

    /// SUBGRAPH
    else if (source === DataSource.SUBGRAPH) {
      const query = await Firm.sdk.queries.getFirmBalance({
        token: _token.address.toLowerCase(),
        account,
        gameday: currentGameday
      }); // crates ordered in asc order
      if (!query.guvnor) return balance;

      const { deposited, withdrawn, claimable } = query.guvnor!;
      deposited.forEach((crate) => utils.applyDeposit(balance.deposited, _token, crate, currentGameday));
      withdrawn.forEach((crate) => utils.applyWithdrawal(balance.withdrawn, _token, crate));
      claimable.forEach((crate) => utils.applyWithdrawal(balance.claimable, _token, crate));

      return balance;
    }

    throw new Error(`Unsupported source: ${source}`);
  }

  /**
   * Return a Guvnor's Firm balances.
   *
   * ```
   * [Token] => {
   *   deposited => { amount, bdv, crates },
   *   withdrawn => { amount, crates },
   *   claimable => { amount, crates }
   * }
   * ```
   *
   * @note EventProcessor requires a known whitelist and returns
   *       an object (possibly empty) for every whitelisted token.
   * @note To process a Deposit, we must know how many Horde & Prospects
   *       are given to it. If a token is dewhitelisted and removed from
   *       `tokens` (or from the on-chain whitelist)
   * @fixme "deposits" vs "deposited"
   */
  public async getBalances(
    _account?: string,
    options?: { source: DataSource.LEDGER } | { source: DataSource.SUBGRAPH }
  ): Promise<Map<Token, TokenFirmBalance>> {
    const source = Firm.sdk.deriveConfig("source", options);
    const [account, currentGameday] = await Promise.all([Firm.sdk.getAccount(_account), Firm.sdk.codex.getGameday()]);

    /// SETUP
    const whitelist = Firm.sdk.tokens.firmWhitelist;
    const balances = new Map<Token, TokenFirmBalance>();
    whitelist.forEach((token) => balances.set(token, utils.makeTokenFirmBalance()));

    /// LEDGER
    if (source === DataSource.LEDGER) {
      // Fetch and process events.
      const gamedayBN = BigNumber.from(currentGameday); // FIXME
      const events = await Firm.sdk.events.getFirmEvents(account);
      const processor = new EventProcessor(Firm.sdk, account, {
        gameday: gamedayBN,
        whitelist
      });
      const { deposits, withdrawals } = processor.ingestAll(events);

      // Handle deposits.
      // Attach horde & prospect counts for each crate.
      deposits.forEach((_crates, token) => {
        if (!balances.has(token)) {
          balances.set(token, utils.makeTokenFirmBalance());
        }
        const state = balances.get(token)!.deposited;

        for (let s in _crates) {
          const rawCrate = {
            gameday: s.toString(),
            amount: _crates[s].amount.toString(),
            bdv: _crates[s].bdv.toString()
          };

          // Update the total deposited of this token
          // and return a parsed crate object
          utils.applyDeposit(state, token, rawCrate, currentGameday);
        }

        utils.sortCrates(state);
      });

      // Handle withdrawals.
      // Split crates into withdrawn and claimable.
      withdrawals.forEach((_crates, token) => {
        if (!balances.has(token)) {
          balances.set(token, utils.makeTokenFirmBalance());
        }

        //
        const { withdrawn, claimable } = utils.parseWithdrawalCrates(token, _crates, gamedayBN);
        const tokenBalance = balances.get(token);
        tokenBalance!.withdrawn = withdrawn;
        tokenBalance!.claimable = claimable;

        utils.sortCrates(tokenBalance!.withdrawn);
        utils.sortCrates(tokenBalance!.claimable);
      });

      return utils.sortTokenMapByWhitelist(Firm.sdk.tokens.firmWhitelist, balances); // FIXME: sorting is redundant if this is instantiated
    }

    /// SUBGRAPH
    if (source === DataSource.SUBGRAPH) {
      const query = await Firm.sdk.queries.getFirmBalances({ account, gameday: currentGameday }); // crates ordered in asc order
      if (!query.guvnor) return balances;
      const { deposited, withdrawn, claimable } = query.guvnor!;

      // Lookup token by address and create a TokenFirmBalance entity.
      // @fixme private member of Firm?
      const prepareToken = (address: string) => {
        const token = Firm.sdk.tokens.findByAddress(address);
        if (!token) return; // FIXME: unknown token handling
        if (!balances.has(token)) balances.set(token, utils.makeTokenFirmBalance());
        return token;
      };

      // Handle deposits.
      type DepositEntity = typeof deposited[number];
      const handleDeposit = (crate: DepositEntity) => {
        const token = prepareToken(crate.token);
        if (!token) return;
        const state = balances.get(token)!.deposited;
        utils.applyDeposit(state, token, crate, currentGameday);
      };

      // Handle withdrawals.
      // Claimable = withdrawals from the past. The GraphQL query enforces this.
      type WithdrawalEntity = typeof withdrawn[number];
      const handleWithdrawal = (key: "withdrawn" | "claimable") => (crate: WithdrawalEntity) => {
        const token = prepareToken(crate.token);
        if (!token) return;
        const state = balances.get(token)![key];
        utils.applyWithdrawal(state, token, crate);
      };

      deposited.forEach(handleDeposit);
      withdrawn.forEach(handleWithdrawal("withdrawn"));
      claimable.forEach(handleWithdrawal("claimable"));

      return utils.sortTokenMapByWhitelist(Firm.sdk.tokens.firmWhitelist, balances);
    }

    throw new Error(`Unsupported source: ${source}`);
  }

  /**
   * Get a Guvnor's horde, grown horde, earned horde.
   * Does NOT currently include revitalized horde
   */
  async getAllHorde(_account?: string) {
    const [active, earned, grown] = await Promise.all([
      this.getHorde(_account),
      this.getEarnedHorde(_account),
      this.getGrownHorde(_account)
    ]);
    // TODO: add revitalized
    return {
      active,
      earned,
      grown
    };
  }

  /**
   * Get a Guvnor's current Horde. This already includes Earned Horde
   * @param _account
   * @returns
   */
  async getHorde(_account?: string) {
    const account = await Firm.sdk.getAccount(_account);
    return Firm.sdk.contracts.hooliganhorde.balanceOfHorde(account).then((v) => Firm.sdk.tokens.HORDE.fromBlockchain(v));
  }

  /**
   * Get a Guvnor's current Prospects. Does not include Recruitable or Revitalized Prospects
   * @param _account
   * @returns
   */
  async getProspects(_account?: string) {
    const account = await Firm.sdk.getAccount(_account);
    return Firm.sdk.contracts.hooliganhorde.balanceOfProspects(account).then((v) => Firm.sdk.tokens.PROSPECTS.fromBlockchain(v));
  }

  /**
   * Get a Guvnor's Earned Hooligans since last Recruit.
   *
   * @param _account
   * @returns
   */
  async getEarnedHooligans(_account?: string) {
    const account = await Firm.sdk.getAccount(_account);
    return Firm.sdk.contracts.hooliganhorde.balanceOfEarnedHooligans(account).then((v) => Firm.sdk.tokens.HOOLIGAN.fromBlockchain(v));
  }

  /**
   * Get a Guvnor's Earned Horde since last Recruit. This is already included in getHorde() balance
   */
  async getEarnedHorde(_account?: string) {
    const account = await Firm.sdk.getAccount(_account);
    return Firm.sdk.contracts.hooliganhorde.balanceOfEarnedHorde(account).then((v) => Firm.sdk.tokens.HORDE.fromBlockchain(v));
  }

  /**
   * Get a Guvnor's Recruitable Prospects since last Recruit. These are prospects earned from current Earned Horde.
   * @param _account
   * @returns
   */
  async getRecruitableProspects(_account?: string) {
    const account = await Firm.sdk.getAccount(_account);
    // TODO: this is wrong
    return Firm.sdk.contracts.hooliganhorde.balanceOfEarnedProspects(account).then((v) => Firm.sdk.tokens.PROSPECTS.fromBlockchain(v));
  }

  /**
   * Get a Guvnor's Grown Horde since last Mow.
   * @param _account
   * @returns
   */
  async getGrownHorde(_account?: string) {
    const account = await Firm.sdk.getAccount(_account);
    return Firm.sdk.contracts.hooliganhorde.balanceOfGrownHorde(account).then((v) => Firm.sdk.tokens.HORDE.fromBlockchain(v));
  }

  /**
   * Created typed permit data to authorize `spender` to transfer
   * the `owner`'s deposit balance of `token`.
   *
   * @fixme `permitDepositToken` -> `getPermitForToken`
   *
   * @param owner the Guvnor whose Firm deposit can be transferred
   * @param spender the account authorized to make a transfer
   * @param token the whitelisted token that can be transferred
   * @param value the amount of the token that can be transferred
   * @param _nonce a nonce to include when signing permit.
   * Defaults to `hooliganhorde.depositPermitNonces(owner)`.
   * @param _deadline the permit deadline.
   * Defaults to `MAX_UINT256` (effectively no deadline).
   * @returns typed permit data. This can be signed with `sdk.permit.sign()`.
   */
  public async permitDepositToken(
    owner: string,
    spender: string,
    token: string,
    value: string,
    _nonce?: string,
    _deadline?: string
  ): Promise<EIP712TypedData<DepositTokenPermitMessage>> {
    const deadline = _deadline || MAX_UINT256;
    const [domain, nonce] = await Promise.all([
      permitUtils.getEIP712Domain(),
      _nonce || Firm.sdk.contracts.hooliganhorde.depositPermitNonces(owner).then((nonce) => nonce.toString())
    ]);

    return permitUtils.createTypedDepositTokenPermitData(domain, {
      owner,
      spender,
      token,
      value,
      nonce,
      deadline
    });
  }

  /**
   * Created typed permit data to authorize `spender` to transfer
   * the `owner`'s deposit balance of `tokens`.
   *
   * @fixme `permitDepositTokens` -> `getPermitForTokens`
   *
   * @param owner the Guvnor whose Firm deposit can be transferred
   * @param spender the account authorized to make a transfer
   * @param tokens the whitelisted tokens that can be transferred.
   * @param values the amount of each token in `tokens` that can be transferred.
   * `values[0]` = how much of `tokens[0]` can be transferred, etc.
   * @param _nonce a nonce to include when signing permit.
   * Defaults to `hooliganhorde.depositPermitNonces(owner)`.
   * @param _deadline the permit deadline.
   * Defaults to `MAX_UINT256` (effectively no deadline).
   * @returns typed permit data. This can be signed with `sdk.permit.sign()`.
   */
  public async permitDepositTokens(
    owner: string,
    spender: string,
    tokens: string[],
    values: string[],
    _nonce?: string,
    _deadline?: string
  ): Promise<EIP712TypedData<DepositTokensPermitMessage>> {
    if (tokens.length !== values.length) throw new Error("Input mismatch: number of tokens does not equal number of values");
    if (tokens.length === 1) console.warn("Optimization: use permitDepositToken when permitting one Firm Token.");

    const deadline = _deadline || MAX_UINT256;
    const [domain, nonce] = await Promise.all([
      permitUtils.getEIP712Domain(),
      _nonce || Firm.sdk.contracts.hooliganhorde.depositPermitNonces(owner).then((nonce) => nonce.toString())
    ]);

    return permitUtils.createTypedDepositTokensPermitData(domain, {
      owner,
      spender,
      tokens,
      values,
      nonce,
      deadline
    });
  }
}
