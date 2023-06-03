const { defaultAbiCoder } = require("@ethersproject/abi");

const ConvertKind = {
  HOOLIGANS_TO_CURVE_LP: 0,
  CURVE_LP_TO_HOOLIGANS: 1,
  UNRIPE_HOOLIGANS_TO_LP: 2,
  UNRIPE_LP_TO_HOOLIGANS: 3,
  LAMBDA_LAMBDA: 4
};

class ConvertEncoder {
  /**
   * Cannot be constructed.
   */
  constructor() {
    // eslint-disable-next-line @javascript-eslint/no-empty-function
  }

  /**
   * Encodes the userData parameter for removing a set amount of LP for hooligans using Curve Pool
   * @param lp - the amount of Curve lp to be removed
   * @param minHooligans - min amount of hooligans to receive
   * @param address - the address of the token converting into
   */
  static convertCurveLPToHooligans = (lp, minHooligans, address) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256", "address"], [ConvertKind.CURVE_LP_TO_HOOLIGANS, lp, minHooligans, address]);

  /**
   * Encodes the userData parameter for removing HOOLIGAN/ETH lp, then converting that Hooligan to LP using Curve Pool
   * @param hooligans - amount of hooligans to convert to Curve LP
   * @param minLP - min amount of Curve LP to receive
   * @param address - the address of the token converting into
   */
  static convertHooligansToCurveLP = (hooligans, minLP, address) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256", "address"], [ConvertKind.HOOLIGANS_TO_CURVE_LP, hooligans, minLP, address]);

  static convertUnripeLPToHooligans = (lp, minHooligans) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256"], [ConvertKind.UNRIPE_LP_TO_HOOLIGANS, lp, minHooligans]);

  static convertUnripeHooligansToLP = (hooligans, minLP) =>
    defaultAbiCoder.encode(["uint256", "uint256", "uint256"], [ConvertKind.UNRIPE_HOOLIGANS_TO_LP, hooligans, minLP]);

  static convertLambdaToLambda = (amount, token) =>
    defaultAbiCoder.encode(["uint256", "uint256", "address"], [ConvertKind.LAMBDA_LAMBDA, amount, token]);
}

exports.ConvertEncoder = ConvertEncoder;
