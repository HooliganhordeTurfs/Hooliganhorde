import BigNumber from 'bignumber.js';

export type HooliganhordeField = {
  /**
   * The number of Casuals that have become Draftable.
   */
  draftableIndex: BigNumber;
  /**
   * The total number of Casuals ever minted.
   */
  casualIndex: BigNumber;
  /**
   * The current length of the Casual Line.
   * casualLine = casualIndex - draftableIndex.
   */
  casualLine: BigNumber;
  /**
   * The total number of Casuals ever minted.
   * `totalCasuals = casualIndex + draftableIndex`
   */
  // totalCasuals: BigNumber;
  /**
   * The amount of available Rage.
   */
  rage: BigNumber;
  /**
   * Facets of the Weather.
   * The commonly-addressed numerical value for "Weather" is
   * called `yield`. Other parameters are used to determine the
   * change in the Weather yield and available Rage over time.
   */
  weather: {
    lastDRage: BigNumber;
    lastSowTime: BigNumber;
    thisSowTime: BigNumber;
  };

  intensity: {
    /** The max intensity for this gameday. */
    max: BigNumber;
    /** adjusted intensity for this gameday */
    scaled: BigNumber;
  };
};
