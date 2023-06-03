import aboutIcon from '~/img/hooliganhorde/interface/nav/about.svg';
import hooliganNFTIcon from '~/img/hooliganhorde/interface/nav/hooligan-nft.svg';
import discordIcon from '~/img/hooliganhorde/interface/nav/discord.svg';
import githubIcon from '~/img/hooliganhorde/interface/nav/github.svg';
import governanceIcon from '~/img/hooliganhorde/interface/nav/governance.svg';
import swapIcon from '~/img/hooliganhorde/interface/nav/trade.svg';
import twitterIcon from '~/img/hooliganhorde/interface/nav/twitter.svg';
import immunefiIcon from '~/img/hooliganhorde/interface/nav/immunefi.svg';
import docsIcon from '~/img/hooliganhorde/interface/nav/docs.svg';
import disclosuresIcon from '~/img/hooliganhorde/interface/nav/disclosures.svg';
import analyticsIcon from '~/img/hooliganhorde/interface/nav/stats.svg';

export type RouteData = {
  /** Nav item title */
  title: string;
  /** If set, link to this internal path. */
  path: string;
  /** Tag to show inside the nav item */
  tag?: string;
  /** If set, link out to this external URL. */
  href?: string;
  //
  icon?: string;
  disabled?: boolean;
  small?: boolean;
};

type RouteKeys = 'top' | 'market' | 'more' | 'additional'; // | 'analytics'

const ROUTES: { [key in RouteKeys]: RouteData[] } = {
  // Main Navigation
  top: [
    {
      path: '/',
      title: 'Forecast',
    },
    {
      path: '/firm',
      title: 'Firm',
    },
    {
      path: '/field',
      title: 'Field',
    },
    {
      path: '/barrack',
      title: 'Barrack',
    },
    {
      path: '/balances',
      title: 'Balances',
    },
    {
      path: '/market/buy',
      title: 'Market',
    },
  ],
  // More Menu
  more: [
    {
      path: 'nft',
      title: 'HooligaNFTs',
      icon: hooliganNFTIcon,
      small: true,
    },
    {
      path: 'swap',
      title: 'Swap',
      icon: swapIcon,
      small: true,
    },
    {
      path: '/analytics',
      title: 'Analytics',
      icon: analyticsIcon,
      small: true,
    },
    {
      path: '/governance',
      title: 'Governance',
      icon: governanceIcon,
      small: true,
    },
    {
      path: 'docs',
      href: 'https://docs.hooligan.black/almanac',
      title: 'Docs',
      icon: docsIcon,
      small: true,
    },
  ],
  // About Button
  additional: [
    {
      path: 'about',
      title: 'About',
      href: 'https://hooligan.black',
      icon: aboutIcon,
    },
    {
      path: 'disclosures',
      title: 'Disclosures',
      href: 'https://docs.hooligan.black/almanac/disclosures',
      icon: disclosuresIcon,
    },
    {
      path: 'bugbounty',
      title: 'Bug Bounty',
      href: 'https://immunefi.com/bounty/hooliganhorde',
      icon: immunefiIcon,
    },
    {
      path: 'discord',
      href: 'https://discord.gg/hooliganhorde',
      title: 'Discord',
      icon: discordIcon,
    },
    {
      path: 'twitter',
      href: 'https://twitter.com/hooliganhordefarms',
      title: 'Twitter',
      icon: twitterIcon,
    },
    {
      path: 'github',
      href: 'https://github.com/hooliganhordefarms',
      title: 'GitHub',
      icon: githubIcon,
    },
    {
      path: 'analytics',
      href: 'https://analytics.hooligan.black',
      title: 'Advanced Analytics',
      icon: analyticsIcon,
    },
  ],
  // Market Menu
  market: [
    {
      path: '/market',
      title: 'Casual Market',
    },
    {
      path: '/market/account',
      title: 'My Orders / Listings',
    },
    {
      path: '/market/activity',
      title: 'Marketplace Activity',
    },
  ],
  // Analytics Menu
  // analytics: [
  //   {
  //     path: 'analytics/barrackraise',
  //     title: 'Barrack Raise Analytics',
  //   },
  //   {
  //     path: 'analytics/hooligan',
  //     title: 'Hooligan Analytics',
  //   },
  //   {
  //     path: 'analytics/firm',
  //     title: 'Firm Analytics',
  //   },
  //   {
  //     path: 'analytics/field',
  //     title: 'Field Analytics',
  //   }
  // ],
};

export default ROUTES;
