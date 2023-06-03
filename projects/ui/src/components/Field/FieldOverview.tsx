import React, { useEffect } from 'react';
import { Card, Stack } from '@mui/material';

import { HooliganhordePalette } from '~/components/App/muiTheme';
import EmbeddedCard from '~/components/Common/EmbeddedCard';

import { useAppSelector } from '~/state';

import Intensity from '~/components/Analytics/Field/Intensity';
import FieldConditionsHeader from '~/components/Field/FieldConditionsHeader';
import FieldStats from '~/components/Field/FieldStats';
import MorningIntensity from '~/components/Field/Chart';
import FieldInfo from '~/components/Field/FieldInfo';
import useToggle from '~/hooks/display/useToggle';

const CHART_HEIGHT = '200px';

const getSx = (isMorning: boolean) => ({
  borderColor: isMorning ? HooliganhordePalette.mediumYellow : undefined,
  background: isMorning ? HooliganhordePalette.lightYellow : undefined,
});

const FieldOverview: React.FC<{}> = () => {
  const [open, show, hide] = useToggle();

  const morning = useAppSelector((s) => s._hooliganhorde.codex.morning);
  const isMorning = morning.isMorning;

  const toggle = () => {
    if (isMorning) return;
    open && hide();
    !open && show();
  };

  useEffect(() => {
    if (isMorning && open) {
      hide();
    }
  }, [hide, isMorning, open]);

  return (
    <Card sx={getSx(isMorning || open)}>
      <Stack gap={2} p={2} boxSizing="border-box">
        <FieldConditionsHeader toggled={open} toggleMorning={toggle} />
        <EmbeddedCard>
          <Stack gap={2} p={2}>
            {isMorning || open ? (
              <MorningIntensity show={open} height={CHART_HEIGHT} />
            ) : (
              <Intensity height={CHART_HEIGHT} statsRowFullWidth />
            )}
            <FieldStats />
          </Stack>
        </EmbeddedCard>
        <FieldInfo />
      </Stack>
    </Card>
  );
};

export default FieldOverview;
