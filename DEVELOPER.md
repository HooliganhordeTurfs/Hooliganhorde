# Developing Hooliganhorde

Development happens locally against a local forked version of the blockchain. We do not use testnets.

### Repo Setup

1. Clone the repo
2. `yarn bootstrap`

### Anvil: Forking Mainnet Locally

We elect to use `anvil` instead of `hardhat` for local node forking as `anvil` is considerably faster than `hardhat` and properly caches the blockchain locally.

- Install Foundry with `curl -L https://foundry.paradigm.xyz | bash` and reopen your terminal
- Run `foundryup` to ensure you have downloaded the latest version
- Start a locally forked node with the following command:

```bash
# optionally add
# --fork-block-number <BLOCK_NUMBER>
# if you want a specific point in time

anvil --fork-url <FORK_RPC>  --chain-id 1337 --block-time 12

```

### Anvil Accounts

When anvil starts, you will see a list of Available Accounts and their Private Keys. We recommend using Account #0 (`0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`) and adding its private key to metamtask. (The `hooligan` cli defaults to this address).

### Hooligan CLI

In this repo there is also our Hooliganhorde development CLI tool. To run:

```
# no install, from anywhere inside the monorepo:
yarn g:hooligan --help

# OR.. installed on your system
npm i -g @xblackfury/cli
hooligan --help
```

Some examples of what you can do with the hooligan cli:

- Get balances:`yarn g:hooligan balance`
- Give yourself 50K of each token: `yarn g:hooligan setbalance`
- Set balance of a specific token: `yarn g:hooligan setbalance -t HOOLIGAN -m 3000`
- Make HOOLIGAN price above $1: `yarn g:hooligan setprice 20 30`
- Fast forward gameday into future: `yarn g:hooligan actuation --force`

`yarn g:hooligan --help` for all options

By combining these commands, you should be able to put a hooliganhorde account in pretty much any state desired.

### Protocol

If you're not working on the contracts, you don't need to do anything with the protocol. Since you're using Anvil in a fork mode, it will use a copy of mainnet, including all the deployed contracts.

If you are developing contracts, see `/protocol` for more details

### Subgraphs

You don't need to run the subgraphs locally unless you're working on those components. If you are using Anvil with the local subgraph node, include the `--disable-block-gas-limit` option when starting Anvil to avoid issues when indexing.

### UI

Start the UI with `yarn ui:start`

### Building and Generating

There are cross-project dependencies you may need to be aware of. For ex, the UI uses the SDK, which uses the SDK-Core. The dependencies need to be built before they can be used by the parent project. When you ran `yarn bootstrap`, this built everything for you, but there may be times when you need to do this manually.

Easiest way to ensure everything is built:

```
cd {REPO_ROOT}
yarn build
```

This will start building all the dependencies in reverse order.
