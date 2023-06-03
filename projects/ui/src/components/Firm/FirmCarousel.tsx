import React from 'react';
import { Stack, styled, Typography } from '@mui/material';
import { ERC20Token } from '~/classes/Token';
import {
  HOOLIGAN,
  HOOLIGAN_CRV3_LP,
  UNRIPE_HOOLIGAN,
  UNRIPE_HOOLIGAN_CRV3,
} from '~/constants/tokens';
import earnHooligansImg from '~/img/hooliganhorde/firm/edu/earnHooligansImg.png';
import depositHooliganImg from '~/img/hooliganhorde/firm/edu/depositHooliganImg.svg';
import depositHooligan3crvImg from '~/img/hooliganhorde/firm/edu/depositHooligan3crvImg.svg';
import depositUrHooligan3crvImg from '~/img/hooliganhorde/firm/edu/depositUrHooligan3crvImg.svg';
import depositUrHooliganImg from '~/img/hooliganhorde/firm/edu/depositUrHooliganImg.svg';
import earnHordeAndProspectsImg from '~/img/hooliganhorde/firm/edu/earnHordeAndProspectsImg.svg';
import { HooliganhordePalette } from '~/components/App/muiTheme';
import Carousel from '~/components/Common/Carousel/Carousel';
import EmbeddedCard from '~/components/Common/EmbeddedCard';

import { FC } from '~/types';

const depositCardContentByToken = {
  [HOOLIGAN[1].address]: {
    img: depositHooliganImg,
  },
  [HOOLIGAN_CRV3_LP[1].address]: {
    img: depositHooligan3crvImg,
  },
  [UNRIPE_HOOLIGAN[1].address]: {
    img: depositUrHooliganImg,
  },
  [UNRIPE_HOOLIGAN_CRV3[1].address]: {
    img: depositUrHooligan3crvImg,
  },
};

const useCardContentWithToken = (token: ERC20Token) => [
  {
    title: `Deposit ${token.name}`,
    texts: [
      `Use the form to Deposit ${token.symbol} into the Firm.`,
      `Hooliganhorde allows you to use ${
        token.isUnripe
          ? token.symbol
          : token.symbol === 'HOOLIGAN'
          ? 'HOOLIGAN or ETH'
          : 'HOOLIGAN, ETH, 3CRV, DAI, USDC, or USDT'
      } from your wallet or Farm balance to Deposit ${
        token.symbol
      } into the Firm.${
        token.isUnripe
          ? ''
          : ` If you aren't using ${token.symbol}, the UI will swap${
              token.isLP
                ? ', add liquidity, and Deposit the LP token'
                : ' and Deposit'
            } for you in one transaction.`
      }`,
    ],
    imageSrc: depositCardContentByToken[token.address]?.img || depositHooliganImg,
  },
  {
    title: 'Receive Horde and Prospects for your Deposit',
    texts: [
      'Horde entitles holders to participate in Hooliganhorde governance and earn a portion of Hooligan mints.',
      'Prospects yield 1/10000 new Horde every Gameday.',
    ],
    imageSrc: earnHordeAndProspectsImg,
  },
  {
    title: 'Earn Hooligans',
    texts: [
      'Every Gameday that Hooligans are minted, receive a share of the new Hooligans based on your percentage ownership of Horde.',
      'You can claim your Firm Rewards on the main Firm page.',
    ],
    imageSrc: earnHooligansImg, // Made this one a PNG because it contains 4 HooligaNFTs which are too big when base64 encoded in an SVG.
  },
];

const ImageWrapper = styled(Stack)(({ theme }) => ({
  justifyContent: 'flex-end',
  alignItems: 'center',
  background: HooliganhordePalette.blue,
  width: '100%',
  height: '300px',
  [theme.breakpoints.down('md')]: { height: '250px !important' },
}));

const InfoContent = styled(Stack)(({ theme }) => ({
  width: '100%',
  padding: '20px',
  background: HooliganhordePalette.white,
  [theme.breakpoints.up('md')]: {
    // borderLeft: `${theme.palette.} 1px solid`,
    borderLeft: '1px solid white',
    maxWidth: '40%',
  },
  [theme.breakpoints.down('md')]: {
    borderTop: '1px solid white',
  },
  [theme.breakpoints.between('sm', 'md')]: {
    height: '200px',
  },
  [theme.breakpoints.down('sm')]: {
    height: '285px',
  },
}));

const CarouselCard = styled(EmbeddedCard)(({ theme }) => ({
  // heights are defined here otherwise layout jumps occur during animation
  overflow: 'hidden',
  [theme.breakpoints.up('md')]: { height: '300px' },
  [theme.breakpoints.between('sm', 'md')]: { height: '450px' },
  [theme.breakpoints.down('sm')]: { height: '535px' },
}));

const FirmCarousel: FC<{ token: ERC20Token }> = ({ token }) => {
  const content = useCardContentWithToken(token);

  return (
    <CarouselCard>
      <Carousel total={content.length}>
        <Stack direction={{ xs: 'column', md: 'row' }}>
          <Carousel.Elements
            elements={content.map(({ imageSrc }, i) => (
              <ImageWrapper key={`${i}-img`}>
                <img
                  src={imageSrc}
                  alt=""
                  css={{ objectFit: 'cover', height: '100%' }}
                />
              </ImageWrapper>
            ))}
          />
          <InfoContent>
            <Stack sx={{ pb: '20px' }}>
              <Carousel.Elements
                duration={300}
                disableSlide
                elements={content.map(({ title, texts }, k) => (
                  <React.Fragment key={`${k}-info`}>
                    <Typography color="text.primary">{title}</Typography>
                    <Stack sx={{ whiteSpace: 'pre-wrap' }}>
                      {texts.map((text, i) => (
                        <Typography
                          variant="bodySmall"
                          color="text.secondary"
                          key={i}
                        >
                          {`${text}\n\n`}
                        </Typography>
                      ))}
                    </Stack>
                  </React.Fragment>
                ))}
              />
            </Stack>
          </InfoContent>
        </Stack>
        <Carousel.Pagination
          sx={{
            position: 'absolute',
            bottom: '15px',
            right: '20px',
            width: 'calc(100% - 42px)',
            // don't use mui bp here b/c breakpoints don't pass
            '@media(min-width: 800px)': { width: 'calc(40% - 42px)' },
          }}
        />
      </Carousel>
    </CarouselCard>
  );
};

export default FirmCarousel;
