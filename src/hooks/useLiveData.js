import { useCallback, useSyncExternalStore } from 'react';
import { peekLiveDataset, subscribeDataset } from '../api/liveData';

export function useLiveRevision(type) {
  const subscribe = useCallback(listener => subscribeDataset(type, listener), [type]);
  const snapshot = useCallback(() => peekLiveDataset(type)?.revision || 0, [type]);
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

export function useLiveRecord(type, name) {
  const subscribe = useCallback(listener => subscribeDataset(type, listener), [type]);
  const snapshot = useCallback(() => peekLiveDataset(type)?.records?.get(name) || null, [type, name]);
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
