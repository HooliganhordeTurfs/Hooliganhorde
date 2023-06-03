import React, { ReactElement, useMemo } from 'react';
import {
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  List,
  Box,
  useMediaQuery,
} from '@mui/material';
import BigNumber from 'bignumber.js';
import { useTheme } from '@mui/material/styles';
import { HOOLIGAN, CASUALS } from '~/constants/tokens';
import useGuvnorListingsLedger from '~/hooks/guvnor/useGuvnorListingsLedger';
import { FontSize, IconSize } from '~/components/App/muiTheme';
import { displayBN, displayFullBN, toStringBaseUnitBN, TurfMap } from '~/util';
import casualIcon from '~/img/hooliganhorde/casual-icon.svg';
import Row from '~/components/Common/Row';

import { FC } from '~/types';
import { TurfFragment } from '.';
import SelectionItem from '../SelectionItem';
import { CasualListing } from '~/state/guvnor/market';

export interface TurfSelectProps {
  /** A guvnor's turfs */
  turfs: TurfMap<BigNumber> | null;
  /** The hooliganhorde draftable index */
  draftableIndex: BigNumber;
  /** Custom function to set the selected turf index */
  handleTurfSelect: any;
  /** index of the selected turf */
  selected?: TurfFragment[] | string | TurfFragment | null;
  /** use multi select version? **/
  multiSelect?: boolean | undefined;
}

interface IRowContent {
  isMobile: boolean | null;
  index: string;
  draftableIndex: BigNumber;
  listing: CasualListing | null;
  turfs: TurfMap<BigNumber>;
}

function RowContent({isMobile, index, draftableIndex, listing, turfs}: IRowContent): ReactElement {
  return (
    <Row justifyContent="space-between" sx={{ width: '100%' }}>
    <Row justifyContent="center">
      <ListItemIcon sx={{ pr: 1 }}>
        <Box
          component="img"
          src={casualIcon}
          alt=""
          sx={{
            width: IconSize.tokenSelect,
            height: IconSize.tokenSelect,
          }}
        />
      </ListItemIcon>
      <ListItemText
        primary="CASUALS"
        primaryTypographyProps={{ color: 'text.primary', display: 'flex' }}
        secondary={
          <>
            {isMobile ? '@' : 'Place in Line:'}{' '}
            {displayBN(new BigNumber(index).minus(draftableIndex))}
            {listing ? <>&nbsp;&middot; Currently listed</> : null}
          </>
        }
        sx={{ my: 0 }}
      />
    </Row>
    {turfs[index] ? (
      <Typography variant="bodyLarge" sx={{ color: 'text.primary' }}>
        {displayFullBN(turfs[index], CASUALS.displayDecimals)}
      </Typography>
    ) : null}
  </Row>
  );
}

const TurfSelect: FC<TurfSelectProps> = ({
  turfs,
  draftableIndex,
  handleTurfSelect,
  selected,
  multiSelect,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const guvnorListings = useGuvnorListingsLedger();
  const orderedTurfKeys = useMemo(() => {
    if (!turfs) return null;
    /// float sorting is good enough here
    return Object.keys(turfs).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [turfs]);
  if (!turfs || !orderedTurfKeys) return null;

  ///
  let numAlreadyListed = 0;
  const items = orderedTurfKeys.map((index) => {
    const id = toStringBaseUnitBN(index, HOOLIGAN[1].decimals);
    const listing = guvnorListings[id];
    let isSelected: boolean;
    if (Array.isArray(selected)) {
      selected!.findIndex((item) => item.index == index) > -1
        ? (isSelected = true)
        : (isSelected = false);
    } else {
      selected ? (isSelected = true) : (isSelected = false);
    }
    if (listing) numAlreadyListed += 1;
    if (multiSelect) {
    return (
      <SelectionItem
        selected={isSelected}
        checkIcon="left"
        onClick={() => handleTurfSelect(index)}
        sx={{
          // ListItem is used elsewhere so we define here
          // instead of in muiTheme.ts
          '& .MuiListItemText-primary': {
            fontSize: FontSize['1xl'],
            lineHeight: '1.875rem',
          },
          '& .MuiListItemText-secondary': {
            fontSize: FontSize.base,
            lineHeight: '1.25rem',
            // color: HooliganhordePalette.lightGrey
          },
          mb: 1,
          '&:last-child': {mb: 0}
        }}
        >
          <RowContent
          isMobile={isMobile}
          index={index}
          draftableIndex={draftableIndex}
          listing={listing}
          turfs={turfs}
          />
      </SelectionItem>
    );
    } else {
    return (
      <ListItem
      key={index}
      color="primary"
      selected={isSelected}
      disablePadding
      onClick={() => handleTurfSelect(index)}
      sx={{
        // ListItem is used elsewhere so we define here
        // instead of in muiTheme.ts
        '& .MuiListItemText-primary': {
          fontSize: FontSize['1xl'],
          lineHeight: '1.875rem',
        },
        '& .MuiListItemText-secondary': {
          fontSize: FontSize.base,
          lineHeight: '1.25rem',
          // color: HooliganhordePalette.lightGrey
        },
      }}
    >
      <ListItemButton disableRipple>
        <RowContent
        isMobile={isMobile}
        index={index}
        draftableIndex={draftableIndex}
        listing={listing}
        turfs={turfs}
        />
      </ListItemButton>
    </ListItem>
    );
    }
  });

  return (
    <>
      {numAlreadyListed > 0 ? (
        <Box px={1}>
          <Typography color="text.secondary" fontSize="bodySmall">
            {/* * Currently listed on the Market. */}
            {/* FIXME: contextual message */}
          </Typography>
        </Box>
      ) : null}
      <List sx={{ p: 0 }}>{items}</List>
    </>
  );
};

export default TurfSelect;
