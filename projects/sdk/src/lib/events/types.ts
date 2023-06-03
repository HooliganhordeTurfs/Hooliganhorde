import { BigNumber } from "ethers";
import { FarmToMode } from "src/lib/farm/types";

// FIXME - this normally comes from generated/graphql
//    tho there is a comment in UI to make it an enum. need to verify
//    this is ok
export enum MarketStatus {
  Active = "ACTIVE",
  Cancelled = "CANCELLED",
  CancelledPartial = "CANCELLED_PARTIAL",
  Expired = "EXPIRED",
  Filled = "FILLED",
  FilledPartial = "FILLED_PARTIAL"
}

export type CasualListing = {
  /**
   * The ID of the Casual Listing. Equivalent to the `index` with no decimals.
   * @decimals 0
   */
  id: string;

  /**
   * The address of the Guvnor that owns the Listing.
   * @decimals 0
   */
  account: string;

  /**
   * The absolute index of the listed Turf in the Casual Line.
   *
   * Measured from the front, so the Listing contains all Casuals between
   * (index) and (index + totalAmount).
   *
   * An example where the casualLine is 50,000 but the index is 150,000:
   *    0         the first Casual issued
   *    100,000   draftableIndex
   *    150,000   index
   *
   * @decimals 6
   */
  index: BigNumber;

  /**
   * The difference in index of where the listing starts selling casuals from and where the turf starts
   * @decimals 6
   */
  start: BigNumber;

  /**
   * Price per Casual, in Hooligans.
   * @decimals 6
   */
  pricePerCasual: BigNumber;

  /**
   * The absolute position in line at which this listing expires.
   * @decimals 6
   */
  maxDraftableIndex: BigNumber;

  /**
   * Where Hooligans are sent when the listing is filled.
   */
  mode: FarmToMode;

  /**
   * The total number of Casuals to sell from the Turf.
   * This is the number of Casuals that can still be bought.
   * Every time it changes, `index` is updated.
   */
  amount: BigNumber;

  /**
   * The total number of Casuals originally intended to be sold.
   * Fixed upon emission of `CasualListingCreated`.
   */
  totalAmount: BigNumber;

  /**
   * The number of Casuals left to sell.
   *
   * `remainingAmount = amount`
   * `totalAmount > remainingAmount > 0`
   */
  remainingAmount: BigNumber;

  /**
   * The number of Casuals that have been bought from this CasualListing.
   *
   * `filledAmount = totalAmount - amount`
   * `0 < filledAmount < totalAmount`
   */
  filledAmount: BigNumber;

  /**
   * Casual Listing status.
   *
   * FIXME: make this an enum
   */
  status: MarketStatus;

  /**
   *
   */
  placeInLine: BigNumber;
};

export type CasualOrder = {
  /**
   * Wallet address
   */
  account: string;

  /**
   * The id of the Casual Order.
   *
   * Computed by hashing the Guvnor’s address and the previous block’s hash. In the case of a collisions,
   * Hooliganhorde will hash the ID until there is no collision.
   */
  id: string;

  /**
   * The price per Casual, in Hooligans.
   */
  pricePerCasual: BigNumber;

  /**
   * The User is willing to buy any Casual that is before maxPlaceInLine at pricePerCasual.
   * As the Casual Line moves, this value stays the same because new Casuals meet the criteria.
   */
  maxPlaceInLine: BigNumber;

  // -- Amounts

  /**
   * The total number of Casuals that can be sold to this CasualOrder.
   *
   * FIXME: "ToBuy" naming here; this differs from Listing.
   */
  totalAmount: BigNumber;

  /**
   * The number of Casuals left to be sold to this CasualOrder.
   *
   * `remainingAmount = totalAmount - filledAmount`
   * `totalAmount > remainingAmount > 0`
   */
  remainingAmount: BigNumber;

  /**
   * The number of Casuals that have been sold to this CasualOrder.
   *
   * `0 < filledAmount < totalAmount`
   */
  filledAmount: BigNumber;

  /**
   * Casual Order status.
   *
   * FIXME: make this an enum
   */
  status: MarketStatus;
};

export type GuvnorMarket = {
  listings: {
    [turfIndex: string]: CasualListing;
  };
  orders: {
    [id: string]: CasualOrder;
  };
};
