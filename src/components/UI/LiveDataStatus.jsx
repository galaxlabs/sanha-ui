import { useSyncExternalStore } from 'react';
import { RefreshCw } from 'lucide-react';
import { getLiveStatus, refreshActiveDatasets, subscribeLiveStatus } from '../../api/liveData';

export default function LiveDataStatus() {
  const status = useSyncExternalStore(subscribeLiveStatus, getLiveStatus, getLiveStatus);
  return <button type="button" onClick={refreshActiveDatasets} title={status.error || `Updates checked automatically every 10 seconds${status.checkedAt ? `; last checked ${new Date(status.checkedAt).toLocaleTimeString()}` : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', color: status.error ? '#b45309' : 'var(--brand-700)', fontSize: 11, cursor: 'pointer', padding: 0 }}><RefreshCw size={11} /> {status.label}{status.syncing ? ' · syncing' : ''}{status.checkedAt && !status.syncing ? ` · ${new Date(status.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</button>;
}
