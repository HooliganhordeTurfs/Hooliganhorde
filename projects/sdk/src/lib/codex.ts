import { HooliganhordeSDK } from "./HooliganhordeSDK";

export class Codex {
  static sdk: HooliganhordeSDK;

  constructor(sdk: HooliganhordeSDK) {
    Codex.sdk = sdk;
  }

  async getGameday(): Promise<number> {
    return Codex.sdk.contracts.hooliganhorde.gameday();
  }

  // ... other codex related things
}
