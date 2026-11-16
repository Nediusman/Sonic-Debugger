import { useCallback, useRef, useState } from "react";
import { appReducer, type AppAction, type AppState } from "./state";

/** Reducer state that commands can also read synchronously with `getState`. */
export function useStore(initial: () => AppState): [AppState, (action: AppAction) => void, () => AppState] {
  const ref = useRef<AppState | null>(null);
  ref.current ??= initial();
  const [state, setState] = useState<AppState>(ref.current);
  const dispatch = useCallback((action: AppAction): void => {
    const next = appReducer(ref.current as AppState, action);
    if (next === ref.current) return;
    ref.current = next;
    setState(next);
  }, []);
  const getState = useCallback((): AppState => ref.current as AppState, []);
  return [state, dispatch, getState];
}
