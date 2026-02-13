import { useCallback, useState } from 'react';

type ViewMode = 'list' | 'grid';

const DEFAULT_VIEW: ViewMode = 'list';

function getStoredView(key: string): ViewMode {
  if (globalThis.window === undefined) return DEFAULT_VIEW;
  const stored = localStorage.getItem(key);
  return stored === 'list' || stored === 'grid' ? stored : DEFAULT_VIEW;
}

export function usePersistedView(storageKey: string): readonly [ViewMode, (v: ViewMode) => void] {
  const [currentView, setCurrentView] = useState<ViewMode>(() => getStoredView(storageKey));

  const persistView = useCallback(
    (v: ViewMode) => {
      setCurrentView(v);
      localStorage.setItem(storageKey, v);
    },
    [storageKey],
  );

  return [currentView, persistView] as const;
}
