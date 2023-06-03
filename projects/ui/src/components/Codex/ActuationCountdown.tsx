import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '~/state';

import { FC } from '~/types';

const ActuationCountdown: FC<{}> = () => {
  const remaining = useSelector<
    AppState,
    AppState['_hooliganhorde']['codex']['actuation']['remaining']
  >((state) => state._hooliganhorde.codex.actuation.remaining);

  return <>in {remaining.toFormat('mm:ss')}</>;
};

export default ActuationCountdown;
