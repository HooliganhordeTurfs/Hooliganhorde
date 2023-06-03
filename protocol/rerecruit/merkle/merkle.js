const { MerkleTree } = require("merkletreejs");
const csv = require("csv-parser");
const fs = require("fs");
const keccak256 = require("keccak256");
const ethers = require("ethers");

const hooligansName = "./rerecruit/merkle/data/unripe-hooligans.csv";
const hooligansOutput = "./rerecruit/merkle/data/unripe-hooligans-merkle.json";
const hooligansItems = [];
const hooligansLeaves = [];

fs.createReadStream(hooligansName)
  .pipe(csv())
  .on("data", (row) => {
    const item = [row["address"], row["unripeHooligans"]];
    const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], item);
    hooligansItems.push(item);
    hooligansLeaves.push(leaf);
  })
  .on("end", () => {
    const merkleTree = new MerkleTree(hooligansLeaves, keccak256, { sortPairs: true });
    const root = merkleTree.getHexRoot();
    const d = hooligansItems.reduce((acc, [address, unripeHooligans], i) => {
      acc[address] = {
        unripeHooligans: unripeHooligans,
        leaf: hooligansLeaves[i],
        proof: merkleTree.getHexProof(hooligansLeaves[i])
      };
      return acc;
    }, {});
    fs.writeFile(hooligansOutput, JSON.stringify(d, null, 4), (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(hooligansOutput, "has been written with a root hash of:\n", root);
    });
  });

const hooligan3crvName = "./rerecruit/merkle/data/unripe-hooligan3crv.csv";
const hooligan3crvOutput = "./rerecruit/merkle/data/unripe-hooligan3crv-merkle.json";
const hooligan3crvItems = [];
const hooligan3crvLeaves = [];

fs.createReadStream(hooligan3crvName)
  .pipe(csv())
  .on("data", (row) => {
    const item = [row["address"], row["unripeHooligan3crv"]];
    const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], item);
    hooligan3crvItems.push(item);
    hooligan3crvLeaves.push(leaf);
  })
  .on("end", () => {
    const merkleTree = new MerkleTree(hooligan3crvLeaves, keccak256, { sortPairs: true });
    const root = merkleTree.getHexRoot();
    const d = hooligan3crvItems.reduce((acc, [address, unripeHooligans], i) => {
      acc[address] = {
        unripeHooligans: unripeHooligans,
        leaf: hooligan3crvLeaves[i],
        proof: merkleTree.getHexProof(hooligan3crvLeaves[i])
      };
      return acc;
    }, {});
    fs.writeFile(hooligan3crvOutput, JSON.stringify(d, null, 4), (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(hooligan3crvOutput, "has been written with a root hash of:\n", root);
    });
  });
