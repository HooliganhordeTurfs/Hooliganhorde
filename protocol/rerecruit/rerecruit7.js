const fs = require("fs");
const { rerecruitX } = require("./rerecruitX.js");
const { readPrune } = require("../utils");

// Files
const EARNED_HOOLIGANS = "./rerecruit/data/r7-earnedHooligans.json";
const HOOLIGAN_DEPOSITS = "./rerecruit/data/r5-hooliganDeposits.json";
const LP_DEPOSITS = "./rerecruit/data/r6-lpDeposits.json";

const RERECRUIT_GAMEDAY = "6074";

async function rerecruit7(account) {
  console.log("-----------------------------------");
  console.log("Rerecruit7: Prune Horde and Prospects\n");

  const firmAccounts = await countHordeProspects();
  const horde = firmAccounts.reduce((acc, s) => acc.add(toBN(s[2])), toBN("0"));
  const prospects = firmAccounts.reduce((acc, s) => acc.add(toBN(s[3])), toBN("0"));
  await rerecruitX(account, firmAccounts, "Rerecruit7", (chunkSize = 80), true, [horde, prospects]);
  console.log("-----------------------------------");
}

let prune_;

async function countHordeProspects() {
  const hooliganDeposits = JSON.parse(await fs.readFileSync(HOOLIGAN_DEPOSITS));
  const earnedHooligans = JSON.parse(await fs.readFileSync(EARNED_HOOLIGANS));
  const lpDeposits = JSON.parse(await fs.readFileSync(LP_DEPOSITS));

  console.log("Computing Horde and Prospect balances...");

  prune_ = await readPrune();

  console.log(`Pruning to ${prune_.substring(0, 2)}.${prune_.substring(2)}%\n`);

  lDeposits = Object.entries(
    lpDeposits.reduce((lds, [account, token, gamedays, amounts, bdvs, totalAmount]) => {
      lds[account] = gamedays.reduce((ss, s, i) => {
        if (!ss[s]) ss[s] = toBN("0");
        ss[s] = ss[s].add(toBN(bdvs[i]));
        return ss;
      }, lds[account] || {});
      return lds;
    }, {})
  ).map(([account, sb]) => [account, "4", Object.keys(sb), Object.values(sb)]);

  let bDeposits = hooliganDeposits
    .concat(earnedHooligans.map(([acc, am]) => [acc, ["6074"], [am], am]))
    .map(([account, gamedays, amounts, totalAmount]) => [account, "2", gamedays, amounts]);
  deposits = lDeposits.concat(bDeposits);

  const rerecruit7 = Object.values(
    deposits.reduce((acc, [account, spb, gamedays, bdvs]) => {
      if (!acc[account]) acc[account] = [account, getEarndHooligans(earnedHooligans, account), toBN("0"), toBN("0")];
      account_ = account;
      const [st, se] = getHordeProspectsRow(toBN(spb), gamedays, bdvs);
      acc[account][2] = acc[account][2].add(st);
      acc[account][3] = acc[account][3].add(se);
      return acc;
    }, {})
  )
    .map((d) => [d[0], d[1], d[2].toString(), d[3].toString()])
    .sort((a, b) => a[0] > b[0]);

  return rerecruit7;
}

function toBN(a) {
  return ethers.BigNumber.from(a);
}

const zip = (a, b) => a.map((k, i) => [k, b[i]]);

function getEarndHooligans(earnedHooligans, account) {
  const asdf = earnedHooligans.filter((eb) => eb[0] === account);
  return asdf.length == 0 ? "0" : asdf[0][1];
}

function getHordeProspectsRow(token, gamedays, bdvs) {
  return zip(gamedays, bdvs).reduce(
    ([horde, prospects], [s, b]) => {
      const [st, se] = getHordeProspects(token, s, b);
      return [horde.add(st), prospects.add(se)];
    },
    [toBN("0"), toBN("0")]
  );
}

function getHordeProspects(prospectsPerBdv, gameday, bdv) {
  const hordePerBdv = toBN("10000");
  bdv = toBN(bdv).mul(toBN(prune_)).div(ethers.utils.parseEther("1"));
  return [bdv.mul(hordePerBdv.add(prospectsPerBdv.mul(toBN(RERECRUIT_GAMEDAY).sub(toBN(gameday))))), bdv.mul(prospectsPerBdv)];
}

exports.rerecruit7 = rerecruit7;
