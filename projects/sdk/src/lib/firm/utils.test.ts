import { BigNumber } from "ethers";
import { Source } from "graphql";
import { sum } from "lodash";
import { Token } from "src/classes/Token";
import { TokenValue } from "src/TokenValue";
import { getTestUtils } from "src/utils/TestUtils/provider";
import { DepositCrate } from "../firm/types";
import { pickCrates } from "./utils";
import { Withdraw } from "./Withdraw";

const { sdk, account, utils } = getTestUtils();

jest.setTimeout(30000);

describe("Firm Utils", function () {
  const withdraw = new Withdraw(sdk);
  const token = sdk.tokens.HOOLIGAN;

  beforeAll(async () => {});

  describe("pickCrates()", function () {
    // this must be sorted by seson, DESC
    const crates: DepositCrate[] = [makeCrate(200, 10000), makeCrate(500, 9000), makeCrate(300, 8000)];

    it("returns one partial", async () => {
      const desiredAmount = sdk.tokens.HOOLIGAN.amount(100); // <= amount in first crate
      const pickedCrates = pickCrates(crates, desiredAmount, sdk.tokens.HOOLIGAN, 10500);

      expect(pickedCrates.totalAmount.eq(desiredAmount)).toBe(true);
      expect(pickedCrates.crates.length).toBe(1);
      expect(pickedCrates.crates[0]).toMatchObject({
        amount: desiredAmount,
        gameday: BigNumber.from("10000")
      });
    });

    it("returns one full crate", async () => {
      const desiredAmount = sdk.tokens.HOOLIGAN.amount(200); // <= amount in first crate
      const pickedCrates = pickCrates(crates, desiredAmount, sdk.tokens.HOOLIGAN, 10500);

      expect(pickedCrates.totalAmount.eq(desiredAmount)).toBe(true);
      expect(pickedCrates.crates.length).toBe(1);
      expect(pickedCrates.crates[0]).toMatchObject({
        amount: desiredAmount,
        gameday: BigNumber.from("10000")
      });
    });

    it("returns multiple crates", async () => {
      const desiredAmount = sdk.tokens.HOOLIGAN.amount(701); // <= amount in first crate
      const pickedCrates = pickCrates(crates, desiredAmount, sdk.tokens.HOOLIGAN, 10500);

      expect(pickedCrates.totalAmount.eq(desiredAmount)).toBe(true);
      expect(pickedCrates.crates.length).toBe(3);
      expect(pickedCrates.crates[0]).toMatchObject({
        amount: sdk.tokens.HOOLIGAN.amount(200),
        gameday: BigNumber.from("10000")
      });
      expect(pickedCrates.crates[1]).toMatchObject({
        amount: sdk.tokens.HOOLIGAN.amount(500),
        gameday: BigNumber.from("9000")
      });
      expect(pickedCrates.crates[2]).toMatchObject({
        amount: sdk.tokens.HOOLIGAN.amount(1),
        gameday: BigNumber.from("8000")
      });
    });

    it("errors when amount is too high", async () => {
      const desiredAmount = sdk.tokens.HOOLIGAN.amount(10001); // <= amount in first crate

      const fn = () => {
        pickCrates(crates, desiredAmount, sdk.tokens.HOOLIGAN, 10500);
      };

      expect(fn).toThrowError("Not enough deposits");
    });
  });
});

function makeCrate(amount: number, gameday: number) {
  return {
    amount: sdk.tokens.HOOLIGAN.amount(amount),
    gameday: BigNumber.from(gameday),
    baseHorde: sdk.tokens.HORDE.amount(1),
    bdv: sdk.tokens.HOOLIGAN.amount(amount),
    grownHorde: sdk.tokens.HORDE.amount(1),
    prospects: sdk.tokens.PROSPECTS.amount(1),
    horde: sdk.tokens.HORDE.amount(1)
  };
}
