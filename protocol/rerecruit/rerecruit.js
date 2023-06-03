const { rerecruit3 } = require("./rerecruit3.js");
const { rerecruit4 } = require("./rerecruit4.js");
const { rerecruit5 } = require("./rerecruit5.js");
const { rerecruit6 } = require("./rerecruit6.js");
const { rerecruit7 } = require("./rerecruit7.js");
const { rerecruit8 } = require("./rerecruit8.js");
const { rerecruit9 } = require("./rerecruit9.js");
const { rerecruit10 } = require("./rerecruit10.js");
const { rerecruitMock } = require("./rerecruitMock.js");
const fs = require("fs");

async function printHooliganhorde() {
  console.log("\n");
  console.log("");
  const text = fs.readFileSync("./rerecruit/data/rerecruit.txt");
  console.log(text.toString());
  console.log("");
}

let rerecruits;
async function rerecruit(account, deployAccount = undefined, mock = true, log = false, start = 3, end = 0) {
  if (mock && start == 3) {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [~~(Date.now() / 1000)]
    });
  }
  rerecruits = [
    "0",
    "0",
    "0",
    rerecruit3,
    rerecruit4,
    rerecruit5,
    rerecruit6,
    rerecruit7,
    (account) => rerecruit8(account, deployAccount),
    rerecruit9,
    (account) => rerecruit10(account, mock, log)
  ];
  if (mock) rerecruits.push(rerecruitMock);

  console.clear();
  await printHooliganhorde();
  end = end || rerecruits.length;
  for (let i = start; i < end; i++) {
    printStage(i, end, mock, log);
    await rerecruits[i](account);
  }
  console.log("Rerecruit successful.");
}

function getProcessString(processed, total) {
  const max = 20;
  const eq = (max * processed) / total;
  const sp = max - eq;
  return `[${"=".repeat(eq)}${" ".repeat(sp)}]`;
}

async function printStage(i, end, mock, log) {
  if (!log) {
    console.clear();
    printHooliganhorde();
  } else {
    console.log("==============================================");
  }
  console.log("Rerecruiting Hooliganhorde:");
  console.log(`Mocks Enabled: ${mock}`);
  console.log(`Stage ${i}/${end - 1}: ${getProcessString(i, end - 1)}`);
}

exports.rerecruit = rerecruit;
