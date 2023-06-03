import { useAppSelector } from '~/state';

export default function useGameday() {
  return useAppSelector((s) => s._hooliganhorde.codex.gameday.current);
}
