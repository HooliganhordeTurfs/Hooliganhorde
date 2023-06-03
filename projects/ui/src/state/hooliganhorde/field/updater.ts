import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { bigNumberResult, tokenResult } from '~/util';
import { HOOLIGAN } from '~/constants/tokens';
import { useHooliganhordeContract } from '~/hooks/ledger/useContract';
import { resetHooliganhordeField, updateHooliganhordeField } from './actions';

export const useFetchHooliganhordeField = () => {
  const dispatch = useDispatch();
  const hooliganhorde = useHooliganhordeContract();

  // Handlers
  const fetch = useCallback(async () => {
    if (hooliganhorde) {
      console.debug('[hooliganhorde/field/useHooliganhordeField] FETCH');

      const [
        draftableIndex,
        casualIndex,
        rage,
        weather,
        adjustedIntensity,
        maxIntensity,
      ] = await Promise.all([
        hooliganhorde.draftableIndex().then(tokenResult(HOOLIGAN)), // FIXME
        hooliganhorde.casualIndex().then(tokenResult(HOOLIGAN)),
        hooliganhorde.totalRage().then(tokenResult(HOOLIGAN)),
        hooliganhorde.weather().then((_weather) => ({
          lastDRage: tokenResult(HOOLIGAN)(_weather.lastDRage),
          lastSowTime: bigNumberResult(_weather.lastSowTime),
          thisSowTime: bigNumberResult(_weather.thisSowTime),
        })),
        hooliganhorde.intensity().then(tokenResult(HOOLIGAN)), // FIXME
        hooliganhorde.maxIntensity().then(tokenResult(HOOLIGAN)), // FIXME
      ] as const);

      console.debug('[hooliganhorde/field/useHooliganhordeField] RESULT', {
        draftableIndex: draftableIndex.toString(),
        casualIndex: casualIndex.toString(),
        rage: rage.toString(),
        weather,
        adjustedIntensity: adjustedIntensity.toString(),
        maxIntensity: maxIntensity.toString(),
      });

      dispatch(
        updateHooliganhordeField({
          draftableIndex,
          casualIndex,
          casualLine: casualIndex.minus(draftableIndex),
          rage,
          weather,
          intensity: {
            max: maxIntensity,
            scaled: adjustedIntensity,
          },
        })
      );
    }
  }, [dispatch, hooliganhorde]);

  const clear = useCallback(() => {
    console.debug('[hooliganhorde/field/useHooliganhordeField] CLEAR');
    dispatch(resetHooliganhordeField());
  }, [dispatch]);

  return [fetch, clear] as const;
};

// -- Updater

const FieldUpdater = () => {
  const [fetch, clear] = useFetchHooliganhordeField();

  useEffect(() => {
    clear();
    fetch();
  }, [clear, fetch]);

  return null;
};

export default FieldUpdater;
