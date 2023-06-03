import React from 'react';
import { Tab } from '@mui/material';
import useTabs from '~/hooks/display/useTabs';
import BadgeTab from '~/components/Common/BadgeTab';
import useGuvnorPercoceter from '~/hooks/guvnor/useGuvnorPercoceter';
import Trade from './Trade';
import Buy from './Buy';
import { Module, ModuleContent, ModuleTabs } from '~/components/Common/Module';

import { FC } from '~/types';

const SLUGS = ['buy', 'trade'];

const BarrackActions: FC<{}> = () => {
  const [tab, handleChange] = useTabs(SLUGS, 'action');
  const guvnorPercoceter = useGuvnorPercoceter();
  return (
    <Module>
      <ModuleTabs value={tab} onChange={handleChange}>
        <Tab label="Buy" />
        <BadgeTab
          showBadge={guvnorPercoceter.percocetedBootboys.gt(0)}
          label="Trade"
        />
      </ModuleTabs>
      <ModuleContent>
        {tab === 0 ? <Buy /> : null}
        {tab === 1 ? <Trade /> : null}
      </ModuleContent>
    </Module>
  );
};

export default BarrackActions;
