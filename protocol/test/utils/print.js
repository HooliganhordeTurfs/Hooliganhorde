async function printSopGamedays(gameday) {
  const s = await this.gameday.gameday();
  for (let i = 0; i < s; i++) {
    const sop = await gameday.gamedayOfPlenty(i);
    console.log(`Gameday: ${i}, Sop: ${sop}`);
  }
  console.log("====================================");
}

async function print(f) {
  console.log((await f).toString());
}

async function printS(s, f) {
  console.log(s + ": " + (await f).toString());
}

async function printSops(firm) {
  const sops = await firm.gamedaysOfPlenty();
  console.log("---------------------------------------------");
  console.log("Gameday of Plenty:");
  console.log(`Weth: ${sops.weth}`);
  console.log(`Base: ${sops.base}`);
  console.log(`Gameday: ${sops.last}`);
  console.log("---------------------------------------------");
}

async function printGamedayIncrease(firm) {
  console.log("---------------------------------------------");
  console.log("Supply Increases:");
  console.log(`Total Hooligans: ${await firm.totalFarmableHooligans()}`);
  console.log(`Total Horde: ${await firm.totalFarmableHorde()}`);
  console.log("---------------------------------------------");
}

async function printRain(gameday) {
  const rain = await gameday.rain();
  console.log("---------------------------------------------");
  console.log("Rain:");
  console.log(`Raining: ${rain.raining}`);
  console.log(`Start: ${rain.start}`);
  console.log(`Casuals: ${rain.casuals}`);
  console.log(`Horde: ${rain.roots}`);
  console.log("---------------------------------------------");
}

async function printWeather(gameday) {
  const weather = await gameday.weather();
  console.log("---------------------------------------------");
  console.log("Weather:");
  console.log(`startRage ${weather.startRage}`);
  console.log(`lastDRage ${weather.lastDRage}`);
  console.log(`lastRagePercent ${weather.lastRagePercent}`);
  console.log(`lastSowTime ${weather.lastSowTime}`);
  console.log(`thisSowTime ${weather.thisSowTime}`);
  console.log(`yield ${weather.t}`);
  console.log(`didSowBelowMin ${weather.didSowBelowMin}`);
  console.log(`didSowFaster ${weather.didSowFaster}`);
  console.log("---------------------------------------------");
}

async function printAccount(account, firm) {
  console.log("---------------------------------------------");
  console.log(`Account: ${account}`);
  console.log(`Horde: ${await firm.balanceOfHorde(account)}`);
  console.log(`Prospects: ${await firm.balanceOfProspects(account)}`);
  console.log(`Plenty: ${await firm.balanceOfPlentyBase(account)}`);
  console.log(`Roots: ${await firm.balanceOfRoots(account)}`);
  console.log(`Last Update: ${await firm.lastUpdate(account)}`);
  console.log(`Horde: ${await firm.lockedUntil(account)}`);
  console.log("---------------------------------------------");
}

function printSetOfCrates(cratesName, gamedays, crates, prospectCrates) {
  console.log(`${cratesName} Crates:`);
  if (gamedays.length > 0) {
    gamedays.forEach((s, i) => {
      if (prospectCrates !== undefined) console.log(`Gameday: ${s}, LP: ${crates[i]}, Prospects: ${prospectCrates[i]}`);
      else console.log(`Gameday: ${s}, Hooligans: ${crates[i]}`);
    });
  } else {
    console.log(`User has no ${cratesName} crates`);
  }
}

async function printCrates(firm, account, accountName = "user") {
  console.log("-------------------------------------");
  console.log(`PRINTING CRATES FOR: ${accountName}`);
  const hooliganCrates = await firm.hooliganDeposits(account);
  printSetOfCrates("Hooligan Deposit", hooliganCrates.gamedays, hooliganCrates.crates);
  console.log();
  const lpCrates = await firm.lpDeposits(account);
  printSetOfCrates("LP Deposit", lpCrates.gamedays, lpCrates.crates, lpCrates.prospectCrates);
  console.log();
  const hooliganWithdrawals = await firm.hooliganWithdrawals(account);
  printSetOfCrates("Hooligan Withdrawal", hooliganWithdrawals.gamedays, hooliganWithdrawals.crates);
  console.log();
  const lpWithdrawals = await firm.lpWithdrawals(account);
  printSetOfCrates("LP Withdrawal", lpWithdrawals.gamedays, lpWithdrawals.crates);
  console.log("-------------------------------------");
}

function printTestCrates(userName, data) {
  console.log(userName, " hooliganDeposits", data.hooliganDeposits[userName]);
  console.log(userName, " LPDeposits", data.LPDeposits[userName]);
  console.log(userName, " hooliganTransits", data.hooliganTransitDeposits[userName]);
  console.log(userName, " LPTransits", data.LPTransitDeposits[userName]);
}

async function printCrate(firm, address, index) {
  const crate = await firm.hooliganCrate(address, index);
  console.log("Printing Hooligan Crate: Supply: " + crate[0] + ", Sesson: " + crate[1]);
}

async function printLPCrate(firm, address, index) {
  const crate = await firm.lpCrate(address, index);
  console.log("Printing LP Crate: Supply: " + crate[0] + ", Sesson: " + crate[1]);
}

exports.print = print;
exports.printS = printS;
exports.printSops = printSops;
exports.printSopGamedays = printSopGamedays;
exports.printGamedayIncrease = printGamedayIncrease;
exports.printSetOfCrates = printSetOfCrates;
exports.printCrates = printCrates;
exports.printCrate = printCrate;
exports.printTestCrates = printTestCrates;
exports.printRain = printRain;
exports.printWeather = printWeather;
exports.printAccount = printAccount;
