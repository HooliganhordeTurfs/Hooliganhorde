import { useMemo } from 'react';
import { useProvider } from 'wagmi';
import Farm from '~/lib/Hooliganhorde/Farm';

const useFarm = () => {
  const provider = useProvider();
  return useMemo(() => new Farm(provider), [provider]);
};

export default useFarm;
