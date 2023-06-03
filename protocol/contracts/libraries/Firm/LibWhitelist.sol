/*
 SPDX-License-Identifier: MIT
*/

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../C.sol";
import "../LibAppStorage.sol";

/**
 * @author Publius
 * @title LibWhitelist handles the whitelisting of different tokens.
 **/

interface IBS {
    function lusdToBDV(uint256 amount) external view returns (uint256);

    function curveToBDV(uint256 amount) external view returns (uint256);

    function hooliganToBDV(uint256 amount) external pure returns (uint256);

    function unripeHooliganToBDV(uint256 amount) external view returns (uint256);

    function unripeLPToBDV(uint256 amount) external view returns (uint256);
}

library LibWhitelist {

    event WhitelistToken(
        address indexed token,
        bytes4 selector,
        uint256 prospects,
        uint256 horde
    );

    event DewhitelistToken(address indexed token);

    uint32 private constant HOOLIGAN_3CRV_HORDE = 10000;
    uint32 private constant HOOLIGAN_3CRV_PROSPECTS = 4;

    uint32 private constant HOOLIGAN_HORDE = 10000;
    uint32 private constant HOOLIGAN_PROSPECTS = 2;

    function whitelistPools() internal {
        whitelistHooligan3Crv();
        whitelistHooligan();
        whitelistUnripeHooligan();
        whitelistUnripeLP();
    }

    function whitelistHooligan3Crv() internal {
        whitelistToken(
            C.CURVE_HOOLIGAN_METAPOOL,
            IBS.curveToBDV.selector,
            HOOLIGAN_3CRV_HORDE,
            HOOLIGAN_3CRV_PROSPECTS
        );
    }

    function whitelistHooligan() internal {
        whitelistToken(
            C.HOOLIGAN,
            IBS.hooliganToBDV.selector,
            HOOLIGAN_HORDE,
            HOOLIGAN_PROSPECTS
        );
    }

    function whitelistUnripeHooligan() internal {
        whitelistToken(
            C.UNRIPE_HOOLIGAN,
            IBS.unripeHooliganToBDV.selector,
            HOOLIGAN_HORDE,
            HOOLIGAN_PROSPECTS
        );
    }

    function whitelistUnripeLP() internal {
        whitelistToken(
            C.UNRIPE_LP,
            IBS.unripeLPToBDV.selector,
            HOOLIGAN_3CRV_HORDE,
            HOOLIGAN_3CRV_PROSPECTS
        );
    }

    function dewhitelistToken(address token) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        delete s.ss[token];
        emit DewhitelistToken(token);
    }

    function whitelistToken(
        address token,
        bytes4 selector,
        uint32 horde,
        uint32 prospects
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.ss[token].selector = selector;
        s.ss[token].horde = horde;
        s.ss[token].prospects = prospects;

        emit WhitelistToken(token, selector, horde, prospects);
    }
}
