import { ethers } from "ethers";
import { HooliganhordeSDK, DataSource } from "src/lib/HooliganhordeSDK";

class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

class NotFoundError extends BaseError {
  constructor(entity?: string, id?: string) {
    const message = `${entity ? `${entity} not found` : `Not found`}${id ? `: ${id}` : ""}`;
    super(message);
  }
}

export class CasualsMarket {
  static sdk: HooliganhordeSDK;

  constructor(sdk: HooliganhordeSDK) {
    CasualsMarket.sdk = sdk;
  }

  /**
   * Get a listing by ID.
   *
   * @param id
   * @param options
   */
  public async getListing(
    id: string,
    options?: {
      source: DataSource.SUBGRAPH;
      validate: boolean;
    }
  ) {
    const [isValid, query] = await Promise.all([
      options?.validate
        ? CasualsMarket.sdk.contracts.hooliganhorde.casualListing(id).then((r) => ethers.BigNumber.from(r).gt(0))
        : Promise.resolve(true),
      CasualsMarket.sdk.queries.getListingByIndex({ index: id })
    ]);

    if (!isValid || !query.casualListings[0]) {
      throw new NotFoundError("Listing", id);
    }

    return query.casualListings[0]; // FIXME: cast
  }

  /**
   * TODO:
   *
   * Casting into final form
   * MarketStatus enum
   *
   * getOrder
   *
   * getListings
   * getOrders
   */
}
