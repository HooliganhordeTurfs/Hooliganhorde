require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-tracer");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();
require("hardhat-preprocessor");

const fs = require("fs");
const { upgradeWithNewFacets } = require("./scripts/diamond");
const {
  impersonateSigner,
  mintUsdc,
  mintHooligans,
  getHooliganMetapool,
  getUsdc,
  getHooligan,
  getHooliganhordeAdminControls,
  impersonateHooliganhordeOwner,
  mintEth
} = require("./utils");
const { EXTERNAL, INTERNAL, INTERNAL_EXTERNAL, INTERNAL_TOLERANT } = require("./test/utils/balances.js");
const { HOOLIGANHORDE, PUBLIUS, HOOLIGAN_3_CURVE } = require("./test/utils/constants.js");
const { to6 } = require("./test/utils/helpers.js");
const { rerecruit } = require("./rerecruit/rerecruit.js");
const { task } = require("hardhat/config");

//////////////////////// UTILITIES ////////////////////////

function getRemappings() {
  return fs
    .readFileSync("remappings.txt", "utf8")
    .split("\n")
    .filter(Boolean) // remove empty lines
    .map((line) => line.trim().split("="));
}

//////////////////////// TASKS ////////////////////////

task("buyHooligans")
  .addParam("amount", "The amount of USDC to buy with")
  .setAction(async (args) => {
    await mintUsdc(PUBLIUS, args.amount);
    const signer = await impersonateSigner(PUBLIUS);
    await (await getUsdc()).connect(signer).approve(HOOLIGAN_3_CURVE, ethers.constants.MaxUint256);
    await (await getHooliganMetapool()).connect(signer).exchange_underlying("2", "0", args.amount, "0");
  });

task("sellHooligans")
  .addParam("amount", "The amount of Hooligans to sell")
  .setAction(async (args) => {
    await mintHooligans(PUBLIUS, args.amount);
    const signer = await impersonateSigner(PUBLIUS);
    await (await getHooligan()).connect(signer).approve(HOOLIGAN_3_CURVE, ethers.constants.MaxUint256);
    await (
      await getHooliganMetapool()
    )
      .connect(signer)
      .connect(await impersonateSigner(PUBLIUS))
      .exchange_underlying("0", "2", args.amount, "0");
  });

task("ripen")
  .addParam("amount", "The amount of Casuals to ripen")
  .setAction(async (args) => {
    const hooliganhordeAdmin = await getHooliganhordeAdminControls();
    await hooliganhordeAdmin.ripen(args.amount);
  });

task("percocete")
  .addParam("amount", "The amount of Hooligans to percocete")
  .setAction(async (args) => {
    const hooliganhordeAdmin = await getHooliganhordeAdminControls();
    await hooliganhordeAdmin.percocete(args.amount);
  });

task("rewardFirm")
  .addParam("amount", "The amount of Hooligans to distribute to Firm")
  .setAction(async (args) => {
    const hooliganhordeAdmin = await getHooliganhordeAdminControls();
    await hooliganhordeAdmin.rewardFirm(args.amount);
  });

task("actuation", async function () {
  const hooliganhordeAdmin = await getHooliganhordeAdminControls();
  await hooliganhordeAdmin.forceActuation();
});

task("rerecruit", async () => {
  const account = await impersonateSigner(PUBLIUS);
  await rerecruit(account);
});

task("diamondABI", "Generates ABI file for diamond, includes all ABIs of facets", async () => {
  const basePath = "/contracts/hooliganhorde/";
  const modules = ["barrack", "diamond", "farm", "field", "market", "firm", "codex"];

  // Load files across all modules
  const paths = [];
  modules.forEach((m) => {
    const filesInModule = fs.readdirSync(`.${basePath}${m}`);
    paths.push(...filesInModule.map((f) => [m, f]));
  });

  // Build ABI
  let abi = [];
  for (var [module, file] of paths) {
    // We're only interested in facets
    if (file.includes("Facet")) {
      let jsonFile;

      // A Facet can be packaged in two formats:
      //  1. XYZFacet.sol
      //  2. XYZFacet/XYZFacet.sol
      // By convention, a folder ending with "Facet" will also contain a .sol file with the same name.
      if (!file.includes(".sol")) {
        // This is a directory
        jsonFile = `${file}.json`;
        file = `${file}/${file}.sol`;
      } else {
        // This is a file
        jsonFile = file.replace("sol", "json");
      }

      const loc = `./artifacts${basePath}${module}/${file}/${jsonFile}`;
      console.log(`ADD:  `, module, file, "=>", loc);

      const json = JSON.parse(fs.readFileSync(loc));
      abi.push(...json.abi);
    } else {
      console.log(`SKIP: `, module, file);
    }
  }

  fs.writeFileSync("./abi/Hooliganhorde.json", JSON.stringify(abi.filter((item, pos) => abi.map((a) => a.name).indexOf(item.name) == pos)));

  console.log("ABI written to abi/Hooliganhorde.json");
});

task("marketplace", async function () {
  const owner = await impersonateHooliganhordeOwner();
  await mintEth(owner.address);
  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: ["MarketplaceFacet"],
    bip: false,
    verbose: false,
    account: owner
  });
});

task("bip34", async function () {
  const owner = await impersonateHooliganhordeOwner();
  await mintEth(owner.address);
  await upgradeWithNewFacets({
    diamondAddress: HOOLIGANHORDE,
    facetNames: [
      "FieldFacet", // Add Morning Auction
      "GamedayFacet", // Add ERC-20 permit function
      "FundraiserFacet" // update fundraiser with new rage spec
      // 'MockAdminFacet' // Add MockAdmin for testing purposes
    ],
    initFacetName: "InitBipActuationImprovements",
    initArgs: [],
    bip: false,
    verbose: true,
    account: owner
  });
});

//////////////////////// CONFIGURATION ////////////////////////

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
      forking: process.env.FORKING_RPC
        ? {
            url: process.env.FORKING_RPC,
            blockNumber: parseInt(process.env.BLOCK_NUMBER) || undefined
          }
        : undefined,
      allowUnlimitedContractSize: true
    },
    localhost: {
      chainId: 1337,
      url: "http://127.0.0.1:8545/",
      timeout: 100000
    },
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_RPC || "",
      timeout: 100000
    },
    custom: {
      chainId: 133137,
      url: "<CUSTOM_URL>",
      timeout: 100000
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      }
    ],
    overrides: {
      "@uniswap/v3-core/contracts/libraries/TickBitmap.sol": {
        version: "0.7.6",
        settings: {}
      }
    }
  },
  gasReporter: {
    enabled: true
  },
  mocha: {
    timeout: 100000000
  },
  // The following is pulled from this Foundry guide:
  // https://book.getfoundry.sh/config/hardhat#instructions
  preprocess: {
    eachLine: (hre) => ({
      transform: (line) => {
        if (line.match(/^\s*import /i)) {
          for (const [from, to] of getRemappings()) {
            if (line.includes(from)) {
              line = line.replace(from, to);
              break;
            }
          }
        }
        return line;
      }
    })
  },
  paths: {
    sources: "./contracts",
    cache: "./cache"
  }
};
