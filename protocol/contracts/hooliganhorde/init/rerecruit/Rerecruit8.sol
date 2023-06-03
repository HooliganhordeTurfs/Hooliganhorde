/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../AppStorage.sol";
import "../../../C.sol";
import "../../../tokens/ERC20/HooliganhordeERC20.sol";
import "../../../libraries/Firm/LibWhitelist.sol";
/**
 * @author Publius
 * @title Rerecruit8 Deploys the Hooligan, Unripe Hooligan and Unripe Hooligan:3Crv Tokens. It also
 * deploys the Hooligan:3Crv Pool, initializes the Unripe tokens and adds all 4 tokens to the Firm Whitelist
 * ------------------------------------------------------------------------------------
 **/

interface OldCurveFactory {
    function deploy_metapool(
        address _base_pool,
        string memory _name,
        string memory _symbol,
        address _coin,
        uint256 _A,
        uint256 _fee
    ) external returns (address);
}

interface NewCurveFactory {
    function add_existing_metapools(
        address[10] memory _pools
    ) external returns (bool);
}

contract Rerecruit8 {

    AppStorage internal s;

    event AddUnripeToken(
        address indexed unripeToken,
        address indexed underlyingToken,
        bytes32 merkleRoot
    );

    // Hooligan Token
    bytes32 constant HOOLIGAN_SALT = 0x3230353630323135343731000000000000000000000000000000000000000000;
    uint256 constant INITIAL_LP = 100e6; // 100 Hooligans
    string constant NAME = "Hooligan";
    string constant SYMBOL = "HOOLIGAN";

    //Hooligan 3Crv Pool
    OldCurveFactory constant OLD_FACTORY = OldCurveFactory(0x0959158b6040D32d04c301A72CBFD6b39E21c9AE);
    address constant BASEPOOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    uint256 constant A = 1;
    uint256 constant FEE = 	4000000;
    NewCurveFactory constant NEW_FACTORY = NewCurveFactory(0xB9fC157394Af804a3578134A6585C0dc9cc990d4);
    uint256 constant MIN_LP_OUT = 200e6;

    bytes32 constant UNRIPE_HOOLIGAN_SALT = 0x3236313439353338320000000000000000000000000000000000000000000000;
    uint256 constant NON_DEPOSITED_UNRIPE_HOOLIGANS = 18_602_856_267_146;
    uint256 constant DEPOSITED_UNRIPE_HOOLIGANS = 20_920_949_043_068;
    uint256 constant EARNED_UNRIPE_HOOLIGANS = 11_294_952_663_176;

    bytes32 constant UNRIPE_HOOLIGAN3CRV_SALT = 0x3131313133343838393900000000000000000000000000000000000000000000;
    uint256 constant NON_DEPOSITED_UNRIPE_HOOLIGAN3CRV = 4_239_601_332_428;
    uint256 constant DEPOSITED_UNRIPE_HOOLIGAN3CRV = 140_873_906_070_854;

    bytes32 constant UNRIPE_HOOLIGAN_MERKLE_ROOT = 0x4387a1240f0b31c891fabe2eb6dabe6089dd3eba0a8730f7da6d6d3580e8880a;
    bytes32 constant UNRIPE_LP_MERKLE_ROOT = 0xbcad44f78fd24cc53104883e6c8badbc8dbd1c60283c85d3a584f9215f2cb086;

    using SafeMath for uint256;

    function init() external {
        HooliganhordeERC20 hooligan = new HooliganhordeERC20{salt: HOOLIGAN_SALT}(address(this), NAME, SYMBOL);
        hooligan.mint(address(this), INITIAL_LP);
        address metapool = OLD_FACTORY.deploy_metapool(BASEPOOL, NAME, SYMBOL, address(hooligan), A, FEE);
        require(NEW_FACTORY.add_existing_metapools([metapool, address(0), address(0), address(0), address(0), address(0), address(0), address(0), address(0), address(0)]));

        hooligan.approve(C.CURVE_HOOLIGAN_METAPOOL, type(uint256).max);
        hooligan.approve(C.curveZapAddress(), type(uint256).max);
        C.usdc().approve(C.curveZapAddress(), type(uint256).max);
        C.usdc().transferFrom(msg.sender, address(this), INITIAL_LP);

        uint256 newLP = C.curveZap().add_liquidity(
            metapool,
            [INITIAL_LP, 0, INITIAL_LP, 0],
            0
        );

        IERC20(metapool).transfer(msg.sender, newLP);

        HooliganhordeERC20 ub = new HooliganhordeERC20{salt: UNRIPE_HOOLIGAN_SALT}(address(this), "Unripe Hooligan", "urHOOLIGAN");
        ub.mint(address(this), NON_DEPOSITED_UNRIPE_HOOLIGANS + DEPOSITED_UNRIPE_HOOLIGANS + EARNED_UNRIPE_HOOLIGANS);
        s.firmBalances[address(ub)].deposited = DEPOSITED_UNRIPE_HOOLIGANS + EARNED_UNRIPE_HOOLIGANS;
        addUnripeToken(address(ub), address(hooligan), UNRIPE_HOOLIGAN_MERKLE_ROOT);

        HooliganhordeERC20 ub3 = new HooliganhordeERC20{salt: UNRIPE_HOOLIGAN3CRV_SALT}(address(this), "Unripe HOOLIGAN3CRV", "urHOOLIGAN3CRV");
        ub3.mint(address(this), NON_DEPOSITED_UNRIPE_HOOLIGAN3CRV + DEPOSITED_UNRIPE_HOOLIGAN3CRV);
        s.firmBalances[address(ub3)].deposited = DEPOSITED_UNRIPE_HOOLIGAN3CRV;
        addUnripeToken(address(ub3), metapool, UNRIPE_LP_MERKLE_ROOT);

        LibWhitelist.whitelistPools();
        LibWhitelist.dewhitelistToken(C.unripeLPPool1());
        LibWhitelist.dewhitelistToken(C.unripeLPPool2());
    }

    function addUnripeToken(
        address unripeToken,
        address underlyingToken,
        bytes32 root
    ) private {
        s.u[unripeToken].underlyingToken = underlyingToken;
        s.u[unripeToken].merkleRoot = root;
        emit AddUnripeToken(unripeToken, underlyingToken, root);
    }
}
