// Ethereum Images
import ethIconCircledUrl from '~/img/tokens/eth-logo-circled.svg';
import wEthIconCircledUrl from '~/img/tokens/weth-logo-circled.svg';

// Hooligan Images
// import hooliganLogoUrl from '~/img/tokens/hooligan-logo.svg';
import hooliganCircleLogoUrl from '~/img/tokens/hooligan-logo-circled.svg';
import hooliganCrv3LpLogoUrl from '~/img/tokens/hooligan-crv3-logo.svg';

// Hooliganhorde Token Logos
import hordeLogo from '~/img/hooliganhorde/horde-icon-winter.svg';
import prospectLogo from '~/img/hooliganhorde/prospect-icon-winter.svg';
import casualsLogo from '~/img/hooliganhorde/casual-icon-winter.svg';
import bootboyLogo from '~/img/hooliganhorde/bootboy-icon-winter.svg';
import tradableBootboyLogo from '~/img/hooliganhorde/tradable-bootboy-icon.svg';
import hooliganEthLpLogoUrl from '~/img/tokens/hooligan-eth-lp-logo.svg';
import hooliganLusdLogoUrl from '~/img/tokens/hooligan-lusd-logo.svg';

// ERC-20 Token Images
import crv3LogoUrl from '~/img/tokens/crv3-logo.png';
import daiLogoUrl from '~/img/tokens/dai-logo.svg';
import usdcLogoUrl from '~/img/tokens/usdc-logo.svg';
import usdtLogoUrl from '~/img/tokens/usdt-logo.svg';
import lusdLogoUrl from '~/img/tokens/lusd-logo.svg';
import unripeHooliganLogoUrl from '~/img/tokens/unripe-hooligan-logo-circled.svg';
import unripeHooliganCrv3LogoUrl from '~/img/tokens/unripe-lp-logo-circled.svg';

// Other imports
import { ERC20Token, NativeToken, HooliganhordeToken } from '~/classes/Token';
import { SupportedChainId } from './chains';
import { ChainConstant } from '.';
import {
  HOOLIGAN_CRV3_ADDRESSES,
  CRV3_ADDRESSES,
  DAI_ADDRESSES,
  LUSD_ADDRESSES,
  USDC_ADDRESSES,
  USDT_ADDRESSES,
  UNRIPE_HOOLIGAN_ADDRESSES,
  UNRIPE_HOOLIGAN_CRV3_ADDRESSES,
  HOOLIGAN_ADDRESSES,
} from './addresses';
import { HooliganhordePalette } from '~/components/App/muiTheme';

// ----------------------------------------
// Types + Utilities
// ----------------------------------------

// const multiChain = (
//   addressByChainId: ChainConstant<string>,
//   token:  BaseClassConstructor<Token>,
//   params: ConstructorParameters<typeof Token>,
// ) => {
//   const result : { [key: number]: Token }= {};
//   return Object.keys(addressByChainId).reduce<{ [key: number]: Token }>((prev, chainId) => {
//     prev[curr as number] = addressByChainId[curr]
//     return prev;
//   }, {});
// }

// ----------------------------------------
// Native Tokens
// ----------------------------------------

export const ETH_DECIMALS = 18;
export const ETH = {
  [SupportedChainId.MAINNET]: new NativeToken(
    SupportedChainId.MAINNET,
    'ETH',
    ETH_DECIMALS,
    {
      name: 'Ether',
      symbol: 'ETH',
      logo: ethIconCircledUrl,
      displayDecimals: 4,
    }
  ),
};

// ----------------------------------------
// Hooliganhorde Internal Tokens (not ERC20)
// ----------------------------------------

export const HORDE = new HooliganhordeToken(SupportedChainId.MAINNET, '', 10, {
  name: 'Horde',
  symbol: 'HORDE',
  logo: hordeLogo,
});

export const PROSPECTS = new HooliganhordeToken(SupportedChainId.MAINNET, '', 6, {
  name: 'Prospects',
  symbol: 'PROSPECT',
  logo: prospectLogo,
});

export const CASUALS = new HooliganhordeToken(SupportedChainId.MAINNET, '', 6, {
  name: 'Casuals',
  symbol: 'CASUALS',
  logo: casualsLogo,
});

export const BOOTBOYS = new HooliganhordeToken(SupportedChainId.MAINNET, '', 6, {
  name: 'Bootboys',
  symbol: 'BOOTBOY',
  logo: bootboyLogo,
});

export const TRADEABLE_BOOTBOYS = new HooliganhordeToken(
  SupportedChainId.MAINNET,
  '',
  6,
  {
    name: 'Tradable Bootboys',
    symbol: 'rBOOTBOY',
    logo: tradableBootboyLogo,
  }
);

// ----------------------------------------
// ERC20 Tokens
// ----------------------------------------

export const WETH = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    18,
    {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      logo: wEthIconCircledUrl,
    }
  ),
};

export const HOOLIGAN = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    HOOLIGAN_ADDRESSES,
    6,
    {
      name: 'Hooligan',
      symbol: 'HOOLIGAN',
      logo: hooliganCircleLogoUrl,
      color: HooliganhordePalette.logoGreen,
    },
    {
      horde: 1,
      prospects: 2,
    }
  ),
};

// CRV3 + Underlying Stables
const crv3Meta = {
  name: '3CRV',
  symbol: '3CRV',
  logo: crv3LogoUrl,
  isLP: true,
};
export const CRV3 = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    CRV3_ADDRESSES,
    18,
    crv3Meta
  ),
};

export const DAI = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    DAI_ADDRESSES,
    18,
    {
      name: 'Dai',
      symbol: 'DAI',
      logo: daiLogoUrl,
    }
  ),
};

const usdcMeta = {
  name: 'USD Coin',
  symbol: 'USDC',
  logo: usdcLogoUrl,
};
export const USDC = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    USDC_ADDRESSES,
    6,
    usdcMeta
  ),
};

export const USDT = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    USDT_ADDRESSES,
    6,
    {
      name: 'Tether',
      symbol: 'USDT',
      logo: usdtLogoUrl,
    }
  ),
};

// Other
const lusdMeta = {
  name: 'LUSD',
  symbol: 'LUSD',
  logo: lusdLogoUrl,
};
export const LUSD = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    LUSD_ADDRESSES,
    18,
    lusdMeta
  ),
};

// TEMP
// Keep the old HOOLIGAN_ETH and HOOLIGAN_LUSD tokens to let
// the Pick dialog properly display pickable assets.
export const HOOLIGAN_ETH_UNIV2_LP = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    '0x87898263B6C5BABe34b4ec53F22d98430b91e371',
    18,
    {
      name: 'HOOLIGAN:ETH LP',
      symbol: 'HOOLIGAN:ETH',
      logo: hooliganEthLpLogoUrl,
      displayDecimals: 9,
      isLP: true,
    },
    {
      horde: 1,
      prospects: 4,
    }
  ),
};
export const HOOLIGAN_LUSD_LP = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    '0xD652c40fBb3f06d6B58Cb9aa9CFF063eE63d465D',
    18,
    {
      name: 'HOOLIGAN:LUSD LP',
      symbol: 'HOOLIGAN:LUSD',
      logo: hooliganLusdLogoUrl,
      isLP: true,
    },
    {
      horde: 1,
      prospects: 3,
    }
  ),
};

// ----------------------------------------
// ERC20 Tokens - LP
// ----------------------------------------

export const HOOLIGAN_CRV3_LP = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    HOOLIGAN_CRV3_ADDRESSES,
    18,
    {
      name: 'HOOLIGAN:3CRV LP',
      symbol: 'HOOLIGAN3CRV',
      logo: hooliganCrv3LpLogoUrl,
      isLP: true,
      color: '#DFB385',
    },
    {
      horde: 1,
      prospects: 4,
    }
  ),
};

// ----------------------------------------
// ERC20 Tokens - Unripe
// ----------------------------------------

export const UNRIPE_HOOLIGAN = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    UNRIPE_HOOLIGAN_ADDRESSES,
    6,
    {
      name: 'Unripe Hooligan',
      symbol: 'urHOOLIGAN',
      logo: unripeHooliganLogoUrl,
      displayDecimals: 2,
      color: '#ECBCB3',
      isUnripe: true,
    },
    {
      horde: 1,
      prospects: 2,
    }
  ),
};

export const UNRIPE_HOOLIGAN_CRV3 = {
  [SupportedChainId.MAINNET]: new ERC20Token(
    SupportedChainId.MAINNET,
    UNRIPE_HOOLIGAN_CRV3_ADDRESSES,
    6,
    {
      name: 'Unripe HOOLIGAN:3CRV LP',
      symbol: 'urHOOLIGAN3CRV',
      logo: unripeHooliganCrv3LogoUrl,
      displayDecimals: 2,
      color: HooliganhordePalette.lightBlue,
      isUnripe: true,
    },
    {
      horde: 1,
      prospects: 4,
    }
  ),
};

// ----------------------------------------
// Token Lists
// ----------------------------------------

export const UNRIPE_TOKENS: ChainConstant<ERC20Token>[] = [
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
];
export const UNRIPE_UNDERLYING_TOKENS: ChainConstant<ERC20Token>[] = [
  HOOLIGAN,
  HOOLIGAN_CRV3_LP,
];

// Show these tokens as whitelisted in the Firm.
export const FIRM_WHITELIST: ChainConstant<ERC20Token>[] = [
  HOOLIGAN,
  HOOLIGAN_CRV3_LP,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
];

// All supported ERC20 tokens.
export const ERC20_TOKENS: ChainConstant<ERC20Token>[] = [
  // Whitelisted Firm tokens
  ...FIRM_WHITELIST,
  // Commonly-used tokens
  WETH,
  CRV3,
  DAI,
  USDC,
  USDT,
];

// Assets underlying 3CRV (accessible when depositing/removing liquidity)
export const CRV3_UNDERLYING: ChainConstant<ERC20Token>[] = [DAI, USDC, USDT];
