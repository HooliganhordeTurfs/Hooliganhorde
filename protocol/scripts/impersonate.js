var fs = require("fs");

const {
  ZERO_ADDRESS,
  HOOLIGAN,
  THREE_CURVE,
  THREE_POOL,
  HOOLIGAN_3_CURVE,
  LUSD_3_CURVE,
  HOOLIGAN_LUSD_CURVE,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_PAIR,
  WETH,
  LUSD,
  UNRIPE_HOOLIGAN,
  UNRIPE_LP,
  USDC,
  CURVE_REGISTRY,
  CURVE_ZAP,
  STABLE_FACTORY,
  PRICE_DEPLOYER,
  HOOLIGANHORDE,
  BASE_FEE_CONTRACT,
  ETH_USDC_UNISWAP_V3
} = require("../test/utils/constants");
const { impersonateSigner, mintEth } = require("../utils");

const { getSigner } = "../utils";

async function curve() {
  // Deploy 3 Curveadd
  await usdc();
  let threePoolJson = fs.readFileSync(`./artifacts/contracts/mocks/curve/Mock3Curve.sol/Mock3Curve.json`);
  await network.provider.send("hardhat_setCode", [THREE_POOL, JSON.parse(threePoolJson).deployedBytecode]);

  const threePool = await ethers.getContractAt("Mock3Curve", THREE_POOL);
  await threePool.set_virtual_price(ethers.utils.parseEther("1"));

  let threeCurveJson = fs.readFileSync(`./artifacts/contracts/mocks/MockToken.sol/MockToken.json`);
  await network.provider.send("hardhat_setCode", [THREE_CURVE, JSON.parse(threeCurveJson).deployedBytecode]);

  let curveFactoryJson = fs.readFileSync(`./artifacts/contracts/mocks/curve/MockCurveFactory.sol/MockCurveFactory.json`);
  await network.provider.send("hardhat_setCode", [STABLE_FACTORY, JSON.parse(curveFactoryJson).deployedBytecode]);

  await network.provider.send("hardhat_setCode", [CURVE_REGISTRY, JSON.parse(threeCurveJson).deployedBytecode]);
  const curveStableFactory = await ethers.getContractAt("MockCurveFactory", STABLE_FACTORY);
  await curveStableFactory.set_coins(HOOLIGAN_3_CURVE, [HOOLIGAN, THREE_CURVE, ZERO_ADDRESS, ZERO_ADDRESS]);

  let curveZapJson = fs.readFileSync(`./artifacts/contracts/mocks/curve/MockCurveZap.sol/MockCurveZap.json`);
  await network.provider.send("hardhat_setCode", [CURVE_ZAP, JSON.parse(curveZapJson).deployedBytecode]);
  const curveZap = await ethers.getContractAt("MockCurveZap", CURVE_ZAP);
  await curveZap.approve();
}

async function curveMetapool() {
  // Deploy Hooligan Metapool
  let meta3CurveJson = fs.readFileSync(`./artifacts/contracts/mocks/curve/MockMeta3Curve.sol/MockMeta3Curve.json`);
  await network.provider.send("hardhat_setCode", [HOOLIGAN_3_CURVE, JSON.parse(meta3CurveJson).deployedBytecode]);
  // const hooliganMetapool = await ethers.getContractAt('MockMeta3Curve', HOOLIGAN_3_CURVE);

  const hooliganMetapool = await ethers.getContractAt("MockMeta3Curve", HOOLIGAN_3_CURVE);
  await hooliganMetapool.init(HOOLIGAN, THREE_CURVE, THREE_POOL);
  await hooliganMetapool.set_A_precise("1000");
  await hooliganMetapool.set_virtual_price(ethers.utils.parseEther("1"));
}

async function weth() {
  let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockWETH.sol/MockWETH.json`);

  await network.provider.send("hardhat_setCode", [WETH, JSON.parse(tokenJson).deployedBytecode]);
}

async function router() {
  let routerJson = fs.readFileSync(`./artifacts/contracts/mocks/MockUniswapV2Router.sol/MockUniswapV2Router.json`);

  await network.provider.send("hardhat_setCode", [UNISWAP_V2_ROUTER, JSON.parse(routerJson).deployedBytecode]);
  const mockRouter = await ethers.getContractAt("MockUniswapV2Router", UNISWAP_V2_ROUTER);

  await mockRouter.setWETH(WETH);

  return UNISWAP_V2_ROUTER;
}

async function pool() {
  let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockUniswapV2Pair.sol/MockUniswapV2Pair.json`);
  await network.provider.send("hardhat_setCode", [UNISWAP_V2_PAIR, JSON.parse(tokenJson).deployedBytecode]);

  const pair = await ethers.getContractAt("MockUniswapV2Pair", UNISWAP_V2_PAIR);
  await pair.resetLP();
  await pair.setToken(HOOLIGAN);
  return UNISWAP_V2_PAIR;
}

async function curveLUSD() {
  let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockToken.sol/MockToken.json`);
  await network.provider.send("hardhat_setCode", [LUSD, JSON.parse(tokenJson).deployedBytecode]);

  const lusd = await ethers.getContractAt("MockToken", LUSD);
  await lusd.setDecimals(18);

  await network.provider.send("hardhat_setCode", [LUSD_3_CURVE, JSON.parse(meta3CurveJson).deployedBytecode]);

  let hooliganLusdCurveJson = fs.readFileSync(`./artifacts/contracts/mocks/curve/MockPlainCurve.sol/MockPlainCurve.json`);
  await network.provider.send("hardhat_setCode", [HOOLIGAN_LUSD_CURVE, JSON.parse(hooliganLusdCurveJson).deployedBytecode]);

  const lusdMetapool = await ethers.getContractAt("MockMeta3Curve", LUSD_3_CURVE);
  await lusdMetapool.init(LUSD, THREE_CURVE, THREE_CURVE);

  const hooliganLusdPool = await ethers.getContractAt("MockPlainCurve", HOOLIGAN_LUSD_CURVE);
  await hooliganLusdPool.init(HOOLIGAN, LUSD);
}

async function hooligan() {
  let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockToken.sol/MockToken.json`);

  await network.provider.send("hardhat_setCode", [HOOLIGAN, JSON.parse(tokenJson).deployedBytecode]);

  const hooligan = await ethers.getContractAt("MockToken", HOOLIGAN);
  await hooligan.setDecimals(6);
  return HOOLIGAN;
}

async function usdc() {
  let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockToken.sol/MockToken.json`);
  await network.provider.send("hardhat_setCode", [USDC, JSON.parse(tokenJson).deployedBytecode]);

  const usdc = await ethers.getContractAt("MockToken", USDC);
  await usdc.setDecimals(6);
}

async function percoceter() {
  // let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockToken.sol/MockToken.json`);
  // await network.provider.send("hardhat_setCode", [
  //   BARRACK_RAISE,
  //   JSON.parse(tokenJson).deployedBytecode,
  // ]);
}

async function unripe() {
  let tokenJson = fs.readFileSync(`./artifacts/contracts/mocks/MockToken.sol/MockToken.json`);

  await network.provider.send("hardhat_setCode", [UNRIPE_HOOLIGAN, JSON.parse(tokenJson).deployedBytecode]);

  const unripeHooligan = await ethers.getContractAt("MockToken", UNRIPE_HOOLIGAN);
  await unripeHooligan.setDecimals(6);

  await network.provider.send("hardhat_setCode", [UNRIPE_LP, JSON.parse(tokenJson).deployedBytecode]);
}

async function price() {
  const priceDeployer = await impersonateSigner(PRICE_DEPLOYER);
  await mintEth(PRICE_DEPLOYER);
  const Price = await ethers.getContractFactory("HooliganhordePrice");
  const price = await Price.connect(priceDeployer).deploy();
  await price.deployed();
}

async function impersonateHooliganhorde(owner) {
  let hooliganhordeJson = fs.readFileSync(`./artifacts/contracts/mocks/MockDiamond.sol/MockDiamond.json`);

  await network.provider.send("hardhat_setCode", [HOOLIGANHORDE, JSON.parse(hooliganhordeJson).deployedBytecode]);

  hooliganhorde = await ethers.getContractAt("MockDiamond", HOOLIGANHORDE);
  await hooliganhorde.mockInit(owner);
}

async function blockBasefee() {
  let basefeeJson = fs.readFileSync(`./artifacts/contracts/mocks/MockBlockBasefee.sol/MockBlockBasefee.json`);

  await network.provider.send("hardhat_setCode", [BASE_FEE_CONTRACT, JSON.parse(basefeeJson).deployedBytecode]);

  const basefee = await ethers.getContractAt("MockBlockBasefee", BASE_FEE_CONTRACT);
  await basefee.setAnswer(20 * Math.pow(10, 9));
}

async function ethUsdcUniswap() {
  const MockUniswapV3Factory = await ethers.getContractFactory("MockUniswapV3Factory");
  const mockUniswapV3Factory = await MockUniswapV3Factory.deploy();
  await mockUniswapV3Factory.deployed();
  const ethUdscPool = await mockUniswapV3Factory.callStatic.createPool(WETH, USDC, 3000);
  await mockUniswapV3Factory.createPool(WETH, USDC, 3000);
  const bytecode = await ethers.provider.getCode(ethUdscPool);
  await network.provider.send("hardhat_setCode", [ETH_USDC_UNISWAP_V3, bytecode]);
}

exports.impersonateRouter = router;
exports.impersonateHooligan = hooligan;
exports.impersonateCurve = curve;
exports.impersonateCurveMetapool = curveMetapool;
exports.impersonateCurveLUSD = curveLUSD;
exports.impersonatePool = pool;
exports.impersonateWeth = weth;
exports.impersonateUnripe = unripe;
exports.impersonatePercoceter = percoceter;
exports.impersonateUsdc = usdc;
exports.impersonatePrice = price;
exports.impersonateBlockBasefee = blockBasefee;
exports.impersonateEthUsdcUniswap = ethUsdcUniswap;
exports.impersonateHooliganhorde = impersonateHooliganhorde;
