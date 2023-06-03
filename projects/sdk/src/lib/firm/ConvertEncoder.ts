import { defaultAbiCoder } from "ethers/lib/utils";

export enum ConvertKind {
  HOOLIGANS_TO_CURVE_LP = 0,
  CURVE_LP_TO_HOOLIGANS = 1,
  UNRIPE_HOOLIGANS_TO_LP = 2,
  UNRIPE_LP_TO_HOOLIGANS = 3
}

export class ConvertEncoder {
  static curveLPToHooligans = (amountLP: string, minHooligans: string, pool: string) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256", "address"], [ConvertKind.CURVE_LP_TO_HOOLIGANS, amountLP, minHooligans, pool]);

  static hooligansToCurveLP = (amountHooligans: string, minLP: string, pool: string) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256", "address"], [ConvertKind.HOOLIGANS_TO_CURVE_LP, amountHooligans, minLP, pool]);

  static unripeLPToHooligans = (amountLP: string, minHooligans: string) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256"], [ConvertKind.UNRIPE_LP_TO_HOOLIGANS, amountLP, minHooligans]);

  static unripeHooligansToLP = (amountHooligans: string, minLP: string) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256"], [ConvertKind.UNRIPE_HOOLIGANS_TO_LP, amountHooligans, minLP]);
}
