import React, { createContext, useMemo } from 'react';
import { HooliganhordeSDK } from '@xblackfury/sdk';
import { useSigner } from '~/hooks/ledger/useSigner';

// Ethereum Images
import ethIconCircled from '~/img/tokens/eth-logo-circled.svg';
import wEthIconCircled from '~/img/tokens/weth-logo-circled.svg';

// Hooligan Images
// import hooliganLogoUrl from '~/img/tokens/hooligan-logo.svg';
import hooliganCircleLogo from '~/img/tokens/hooligan-logo-circled.svg';
import hooliganCrv3LpLogo from '~/img/tokens/hooligan-crv3-logo.svg';

// Hooliganhorde Token Logos
import hordeLogo from '~/img/hooliganhorde/horde-icon-winter.svg';
import prospectLogo from '~/img/hooliganhorde/prospect-icon-winter.svg';
import casualsLogo from '~/img/hooliganhorde/casual-icon-winter.svg';
import bootboyLogo from '~/img/hooliganhorde/bootboy-icon-winter.svg';
import tradableBootboyLogo from '~/img/hooliganhorde/tradable-bootboy-icon.svg';
import hooliganEthLpLogo from '~/img/tokens/hooligan-eth-lp-logo.svg';

// ERC-20 Token Images
import crv3Logo from '~/img/tokens/crv3-logo.png';
import daiLogo from '~/img/tokens/dai-logo.svg';
import usdcLogo from '~/img/tokens/usdc-logo.svg';
import usdtLogo from '~/img/tokens/usdt-logo.svg';
import lusdLogo from '~/img/tokens/lusd-logo.svg';
import unripeHooliganLogo from '~/img/tokens/unripe-hooligan-logo-circled.svg';
import unripeHooliganCrv3Logo from '~/img/tokens/unripe-lp-logo-circled.svg';

const IS_DEVELOPMENT_ENV = process.env.NODE_ENV !== 'production';

const useHooliganhordeSdkContext = () => {
  const { data: signer } = useSigner();

  const sdk = useMemo(() => {
    const _sdk = new HooliganhordeSDK({
      signer: signer ?? undefined,
      DEBUG: IS_DEVELOPMENT_ENV,
    });

    _sdk.tokens.ETH.setMetadata({ logo: ethIconCircled });
    _sdk.tokens.WETH.setMetadata({ logo: wEthIconCircled });

    _sdk.tokens.HOOLIGAN.setMetadata({ logo: hooliganCircleLogo });
    _sdk.tokens.HOOLIGAN_CRV3_LP.setMetadata({ logo: hooliganCrv3LpLogo });
    _sdk.tokens.UNRIPE_HOOLIGAN.setMetadata({ logo: unripeHooliganLogo });
    _sdk.tokens.UNRIPE_HOOLIGAN_CRV3.setMetadata({ logo: unripeHooliganCrv3Logo });

    _sdk.tokens.HORDE.setMetadata({ logo: hordeLogo });
    _sdk.tokens.PROSPECTS.setMetadata({ logo: prospectLogo });
    _sdk.tokens.CASUALS.setMetadata({ logo: casualsLogo });
    _sdk.tokens.BOOTBOYS.setMetadata({ logo: bootboyLogo });
    _sdk.tokens.TRADEABLE_BOOTBOYS.setMetadata({ logo: tradableBootboyLogo });

    _sdk.tokens.HOOLIGAN_ETH_UNIV2_LP.setMetadata({ logo: hooliganEthLpLogo });

    _sdk.tokens.CRV3.setMetadata({ logo: crv3Logo });
    _sdk.tokens.DAI.setMetadata({ logo: daiLogo });
    _sdk.tokens.USDC.setMetadata({ logo: usdcLogo });
    _sdk.tokens.USDT.setMetadata({ logo: usdtLogo });
    _sdk.tokens.LUSD.setMetadata({ logo: lusdLogo });

    return _sdk;
  }, [signer]);

  return sdk;
};

export const HooliganhordeSDKContext = createContext<
  ReturnType<typeof useHooliganhordeSdkContext> | undefined
>(undefined);

function HooliganhordeSDKProvider({ children }: { children: React.ReactNode }) {
  // use the same instance of the sdk across the app
  const sdk = useHooliganhordeSdkContext();

  return (
    <HooliganhordeSDKContext.Provider value={sdk}>
      {children}
    </HooliganhordeSDKContext.Provider>
  );
}

export default React.memo(HooliganhordeSDKProvider);
