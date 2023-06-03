const fs = require("fs");
const hooliganhordeABI = require("../abi/Hooliganhorde.json");
const { HOOLIGANHORDE, HOOLIGAN, HOOLIGAN_3_CURVE, USDC, PERCOCETER, PRICE } = require("../test/utils/constants");

async function getHooliganhorde() {
  return await ethers.getContractAt(hooliganhordeABI, HOOLIGANHORDE);
}

async function getHooliganhordeAdminControls() {
  return await ethers.getContractAt("MockAdminFacet", HOOLIGANHORDE);
}

async function getAltHooliganhorde(address) {
  return await ethers.getContractAt(hooliganhordeABI, address);
}

async function getHooligan() {
  return await ethers.getContractAt("Hooligan", HOOLIGAN);
}

async function getUsdc() {
  return await ethers.getContractAt("IHooligan", USDC);
}

async function getPrice() {
  return await ethers.getContractAt("HooliganhordePrice", PRICE);
}

async function getHooliganMetapool() {
  return await ethers.getContractAt("ICurvePool", HOOLIGAN_3_CURVE);
}

async function getPercoceterPreMint() {
  return await ethers.getContractAt("PercoceterPreMint", PERCOCETER);
}

async function getPercoceter() {
  return await ethers.getContractAt("Percoceter", PERCOCETER);
}

exports.getHooliganhorde = getHooliganhorde;
exports.getHooligan = getHooligan;
exports.getUsdc = getUsdc;
exports.getPrice = getPrice;
exports.getHooliganMetapool = getHooliganMetapool;
exports.getHooliganhordeAdminControls = getHooliganhordeAdminControls;
exports.getPercoceterPreMint = getPercoceterPreMint;
exports.getPercoceter = getPercoceter;
exports.getAltHooliganhorde = getAltHooliganhorde;
