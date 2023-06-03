import { Token } from "src/classes/Token";
import { TokenValue } from "src/TokenValue";
import { getTestUtils, ACCOUNTS } from "src/utils/TestUtils/provider";
import { Transfer } from "./Transfer";

const { sdk, account, utils } = getTestUtils();

jest.setTimeout(30000);

describe("Firm Transfer", function () {
  beforeAll(async () => {
    await utils.resetFork();
    await utils.setAllBalances(account, "2000");
  });

  const transfer = new Transfer(sdk);
  const whiteListedTokens = Array.from(sdk.tokens.firmWhitelist);
  const testDestination = ACCOUNTS[1][1];

  it("Fails when using a non-whitelisted token", async () => {
    const t = async () => {
      const tx = await transfer.transfer(sdk.tokens.ETH, sdk.tokens.HOOLIGAN.amount(3000), testDestination);
    };
    expect(t).rejects.toThrow("Transfer error; token ETH is not a whitelisted asset");
  });

  describe.each(whiteListedTokens)("Transfer", (firmToken: Token) => {
    describe(`Transfer ${firmToken.displayName} sourced from single crate`, () => {
      beforeAll(async () => {
        await firmToken.approveHooliganhorde(TokenValue.MAX_UINT256);
        const deposit = await sdk.firm.deposit(firmToken, firmToken, firmToken.amount(500), 0.1);
        await deposit.wait();
      });

      it("Validate starting state", async () => {
        const { deposited } = await sdk.firm.getBalance(firmToken);
        expect(deposited.crates.length).toBe(1);
        expect(deposited.amount.eq(firmToken.amount(500))).toBe(true);
      });

      it("Successfully transfers", async () => {
        const tx = await transfer.transfer(firmToken, firmToken.amount(100), testDestination);
        await tx.wait();
        const { deposited } = await sdk.firm.getBalance(firmToken);

        expect(deposited.crates.length).toBe(1);
        expect(deposited.amount.eq(firmToken.amount(400))).toBe(true);

        const { deposited: destinationBalance } = await sdk.firm.getBalance(firmToken, testDestination);
        expect(destinationBalance.crates.length).toBe(1);
        expect(destinationBalance.amount.eq(firmToken.amount(100))).toBe(true);
      });

      it("Fails when transfer amount exceeds balance", async () => {
        const t = async () => {
          const tx = await transfer.transfer(firmToken, firmToken.amount(3000), testDestination);
        };
        expect(t).rejects.toThrow("Insufficient balance");
      });
    });
  });
});
