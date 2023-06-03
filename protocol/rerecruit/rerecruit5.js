const fs = require("fs");
const { rerecruitX } = require("./rerecruitX.js");

// Files
const HOOLIGAN_DEPOSITS = "./rerecruit/data/r5-hooliganDeposits.json";

async function rerecruit5(account) {
  console.log("-----------------------------------");
  console.log("Rerecruit5: Migrate Hooligan Deposits\n");
  const hooliganDeposits = JSON.parse(await fs.readFileSync(HOOLIGAN_DEPOSITS));
  await rerecruitX(account, hooliganDeposits, "Rerecruit5", (chunkSize = 180)); // 180
  console.log("-----------------------------------");
}
exports.rerecruit5 = rerecruit5;
