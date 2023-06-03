const fs = require("fs");
const { rerecruitX } = require("./rerecruitX.js");

// Files
const LP_DEPOSITS = "./rerecruit/data/r6-lpDeposits.json";

async function rerecruit6(account) {
  console.log("-----------------------------------");
  console.log("Rerecruit6: Migrate LP Deposits\n");

  const lpDeposits = JSON.parse(await fs.readFileSync(LP_DEPOSITS));
  await rerecruitX(account, lpDeposits, "Rerecruit6", (chunkSize = 110), (init2 = true)); // 110
  console.log("-----------------------------------");
}
exports.rerecruit6 = rerecruit6;
