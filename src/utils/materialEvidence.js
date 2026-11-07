export const FINAL_DECISION_STATES = new Set(['approved', 'halal', 'rejected', 'haram']);

export function isFinalDecision(row) {
  return FINAL_DECISION_STATES.has(String(row?.workflow_state || '').trim().toLowerCase());
}

export function materialFieldStyle(material, match) {
  if (!String(material || '').trim()) return {};
  const status = String(match?.status || '').trim().toLowerCase();
  const backgroundColor = status === 'halal' ? '#d4edda' : status === 'haram' ? '#f8d7da' : status === 'doubtful' ? '#fff3cd' : '#ffeeba';
  return { backgroundColor, color: '#000', fontWeight: 700 };
}
