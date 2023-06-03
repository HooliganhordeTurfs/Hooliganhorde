import React from 'react';

import { Box, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { ToastBar, Toaster } from 'react-hot-toast';
import { Navigate, Route, Routes } from 'react-router-dom';

import NewProposalsDialog from '~/components/Governance/NewProposalsDialog';
import NavBar from '~/components/Nav/NavBar';

import AppUpdater from '~/state/app/updater';
import PoolsUpdater from '~/state/hooligan/pools/updater';
import UnripeUpdater from '~/state/hooligan/unripe/updater';
import BarrackUpdater from '~/state/hooliganhorde/barrack/updater';
import FieldUpdater from '~/state/hooliganhorde/field/updater';
import FirmUpdater from '~/state/hooliganhorde/firm/updater';
import CodexUpdater from '~/state/hooliganhorde/codex/updater';
import GuvnorBalancesUpdater from '~/state/guvnor/balances/updater';
import GuvnorBarrackUpdater from '~/state/guvnor/barrack/updater';
import GuvnorFieldUpdater from '~/state/guvnor/field/updater';
import GuvnorMarketUpdater from '~/state/guvnor/market/updater';
import GuvnorFirmUpdater from '~/state/guvnor/firm/updater';

import AnalyticsPage from '~/pages/analytics';
import BalancesPage from '~/pages/balances';
import Barrack from '~/pages/barrack';
import ChopPage from '~/pages/chop';
import PageNotFound from '~/pages/error/404';
import FieldPage from '~/pages/field';
import ForecastPage from '~/pages/forecast';
import GovernancePage from '~/pages/governance';
import ProposalPage from '~/pages/governance/proposal';
import GuvnorDelegatePage from '~/pages/governance/delegate';
import TransactionHistoryPage from '~/pages/history';
import NFTPage from '~/pages/nft';
import FirmPage from '~/pages/firm';
import FirmTokenPage from '~/pages/firm/token';
import SwapPage from '~/pages/swap';
import GovernanceUpdater from '~/state/hooliganhorde/governance/updater';

import { sgEnvKey } from '~/graph/client';
import useBanner from '~/hooks/app/useBanner';
import useNavHeight from '~/hooks/app/usePageDimensions';

import pageBackground from '~/img/hooliganhorde/interface/bg/spring.png';

import EnforceNetwork from '~/components/App/EnforceNetwork';
import useAccount from '~/hooks/ledger/useAccount';
import './App.css';

import { FC } from '~/types';

import CasualMarketPage from '~/pages/market/casuals';
import CasualMarketBuy from '~/components/Market/CasualsV2/Actions/Buy';
import CasualMarketCreateOrder from '~/components/Market/CasualsV2/Actions/Buy/CreateOrder';
import CasualMarketFillListing from '~/components/Market/CasualsV2/Actions/Buy/FillListing';
import CasualMarketSell from '~/components/Market/CasualsV2/Actions/Sell';
import CasualMarketCreateListing from '~/components/Market/CasualsV2/Actions/Sell/CreateListing';
import CasualMarketFillOrder from '~/components/Market/CasualsV2/Actions/Sell/FillOrder';
import GuvnorDelegationsUpdater from '~/state/guvnor/delegations/updater';
import VotingPowerPage from '~/pages/governance/votingPower';
import MorningUpdater from '~/state/hooliganhorde/codex/morning';
import MorningFieldUpdater from '~/state/hooliganhorde/field/morning';

BigNumber.set({ EXPONENTIAL_AT: [-12, 20] });

const CustomToaster: FC<{ navHeight: number }> = ({ navHeight }) => (
  <Toaster
    containerStyle={{
      top: navHeight + 10,
    }}
    toastOptions={{
      duration: 4000,
      position: 'top-right',
      style: {
        minWidth: 300,
        maxWidth: 400,
        paddingLeft: '16px',
      },
    }}
  >
    {(t) => (
      <ToastBar
        toast={t}
        style={{
          ...t.style,
          fontFamily: 'Futura PT',
          animation: 'none',
          marginRight: t.visible ? 0 : -500,
          transition: 'margin-right 0.4s ease-in-out',
          opacity: 1,
        }}
      />
    )}
  </Toaster>
);

export default function App() {
  const banner = useBanner();
  const navHeight = useNavHeight(!!banner);
  const account = useAccount();
  return (
    <>
      {/* -----------------------
       * Appplication Setup
       * ----------------------- */}
      <AppUpdater />
      {/* -----------------------
       * Hooligan Updaters
       * ----------------------- */}
      <PoolsUpdater />
      <UnripeUpdater />
      {/* -----------------------
       * Hooliganhorde Updaters
       * ----------------------- */}
      <FirmUpdater />
      <FieldUpdater />
      <BarrackUpdater />
      <CodexUpdater />
      <MorningUpdater />
      <MorningFieldUpdater />
      <GovernanceUpdater />
      {/* -----------------------
       * Guvnor Updaters
       * ----------------------- */}
      <GuvnorFirmUpdater />
      <GuvnorFieldUpdater />
      <GuvnorBarrackUpdater />
      <GuvnorBalancesUpdater />
      <GuvnorMarketUpdater />
      <GuvnorDelegationsUpdater />
      {/* -----------------------
       * Routes & Content
       * ----------------------- */}
      <NavBar>{banner}</NavBar>
      <EnforceNetwork />
      <CustomToaster navHeight={navHeight} />
      {account && <NewProposalsDialog />}
      {/* <Leaves /> */}
      {/* <Snowflakes /> */}
      <Box
        sx={{
          bgcolor: 'background.default',
          backgroundImage: `url(${pageBackground})`,
          backgroundAttachment: 'fixed',
          backgroundPosition: 'bottom center',
          backgroundSize: '100%',
          backgroundRepeat: 'no-repeat',
          width: '100%',
          minHeight: `calc(100vh - ${navHeight}px)`,
        }}
      >
        {/* use zIndex to move content over content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Routes>
            <Route index element={<ForecastPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/balances" element={<BalancesPage />} />
            <Route path="/barrack" element={<Barrack />} />
            <Route path="/chop" element={<ChopPage />} />
            <Route path="/field" element={<FieldPage />} />
            <Route path="/governance" element={<GovernancePage />} />
            <Route path="/history" element={<TransactionHistoryPage />} />
            <Route
              path="/market"
              index
              element={<Navigate to="/market/buy" />}
            />
            <Route path="/market" element={<CasualMarketPage />}>
              {/* https://ui.dev/react-router-nested-routes */}
              <Route path="/market/buy" element={<CasualMarketBuy />}>
                <Route index element={<CasualMarketCreateOrder />} />
                <Route
                  path="/market/buy/:listingID"
                  element={<CasualMarketFillListing />}
                />
              </Route>
              <Route path="/market/sell" element={<CasualMarketSell />}>
                <Route index element={<CasualMarketCreateListing />} />
                <Route
                  path="/market/sell/:orderID"
                  element={<CasualMarketFillOrder />}
                />
              </Route>
              <Route
                path="listing/:listingID"
                element={<Navigate to="/market/buy/:listingID" />}
              />
              <Route
                path="order/:orderID"
                element={<Navigate to="/market/sell/:orderID" />}
              />
            </Route>
            {/* DEX CODE (hidden) */}
            {/* <Route path="/market/wells" element={<WellHomePage />} /> */}
            {/* <Route path="/market/wells/:id" element={<WellPage />} /> */}
            <Route path="/nft" element={<NFTPage />} />
            <Route path="/governance/:id" element={<ProposalPage />} />
            <Route
              path="/governance/delegate/:type"
              element={<GuvnorDelegatePage />}
            />
            <Route path="governance/vp/:id" element={<VotingPowerPage />} />
            <Route path="/firm" element={<FirmPage />} />
            <Route path="/firm/:address" element={<FirmTokenPage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/404" element={<PageNotFound />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              right: 0,
              pr: 1,
              pb: 0.4,
              opacity: 0.6,
              display: { xs: 'none', lg: 'block' },
            }}
          >
            <Typography fontSize="small">
              {(import.meta.env.VITE_COMMIT_HASH || '0.0.0').substring(0, 6)}{' '}
              &middot; {sgEnvKey}
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
}
