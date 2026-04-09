/* Workflow state → styling and metadata */
export const STATE_META = {
  'Draft':                  { badge: 'badge-gray',    cssClass: 'state-draft',         label: 'Draft',                 color: '#94a3b8' },
  'Submitted':              { badge: 'badge-success',  cssClass: 'state-submitted',      label: 'Submitted',             color: '#22c55e' },
  'Submitted to SB':        { badge: 'badge-info',     cssClass: 'state-submitted-sb',   label: 'Submitted to SB',       color: '#3b82f6' },
  'Under Review':           { badge: 'badge-primary',  cssClass: 'state-under-review',   label: 'Under Review',          color: '#6366f1' },
  'Returned':               { badge: 'badge-warning',  cssClass: 'state-returned',       label: 'Returned',              color: '#f59e0b' },
  'Returned To Evaluation': { badge: 'badge-warning',  cssClass: 'state-returned-eval',  label: 'Returned To Eval',      color: '#f97316' },
  'Hold':                   { badge: 'badge-info',     cssClass: 'state-hold',           label: 'Hold',                  color: '#06b6d4' },
  'Approved':               { badge: 'badge-success',  cssClass: 'state-approved',       label: 'Approved',              color: '#16a34a' },
  'Halal':                  { badge: 'badge-success',  cssClass: 'state-halal',          label: 'Halal',                 color: '#059669' },
  'Haram':                  { badge: 'badge-danger',   cssClass: 'state-haram',          label: 'Haram',                 color: '#dc2626' },
  'Doubtful':               { badge: 'badge-warning',  cssClass: 'state-doubtful',       label: 'Doubtful',              color: '#d97706' },
  'Rejected':               { badge: 'badge-danger',   cssClass: 'state-rejected',       label: 'Rejected',              color: '#ef4444' },
  'Delisted':               { badge: 'badge-gray',    cssClass: 'state-delisted',        label: 'Delisted',              color: '#64748b' },
};

/* Transitions per role */
export const TRANSITIONS = [
  // Client
  { from: 'Draft',                  action: 'Submit',         to: 'Submitted',              roles: ['Client'] },
  { from: 'Returned',               action: 'Submit',         to: 'Submitted to SB',        roles: ['Client'] },
  { from: 'Halal',                  action: 'Delist',         to: 'Delisted',               roles: ['Client'] },
  { from: 'Haram',                  action: 'Delist',         to: 'Delisted',               roles: ['Client'] },
  { from: 'Approved',               action: 'Delist',         to: 'Delisted',               roles: ['Client'] },
  { from: 'Doubtful',               action: 'Delist',         to: 'Delisted',               roles: ['Client'] },
  { from: 'Rejected',               action: 'Delist',         to: 'Delisted',               roles: ['Client'] },
  { from: 'Delisted',               action: 'List',           to: 'Submitted',              roles: ['Client'] },
  // Evaluation
  { from: 'Submitted',              action: 'Forward',        to: 'Submitted to SB',        roles: ['Evaluation'] },
  { from: 'Submitted',              action: 'Return',         to: 'Draft',                  roles: ['Evaluation'] },
  { from: 'Returned To Evaluation', action: 'Forward',        to: 'Submitted to SB',        roles: ['Evaluation'] },
  // SB User
  { from: 'Submitted to SB',        action: 'Review',         to: 'Under Review',           roles: ['SB User'] },
  { from: 'Under Review',           action: 'Approve',        to: 'Approved',               roles: ['SB User'] },
  { from: 'Under Review',           action: 'Return',         to: 'Returned',               roles: ['SB User'] },
  { from: 'Under Review',           action: 'Reject',         to: 'Rejected',               roles: ['SB User'] },
  { from: 'Under Review',           action: 'Hold',           to: 'Hold',                   roles: ['SB User'] },
  { from: 'Under Review',           action: 'Return to Eval', to: 'Returned To Evaluation', roles: ['SB User'] },
  { from: 'Under Review',           action: 'Halal',          to: 'Halal',                  roles: ['SB User'] },
  { from: 'Under Review',           action: 'Haram',          to: 'Haram',                  roles: ['SB User'] },
  { from: 'Under Review',           action: 'Doubtful',       to: 'Doubtful',               roles: ['SB User'] },
  { from: 'Hold',                   action: 'Approve',        to: 'Approved',               roles: ['SB User'] },
  { from: 'Hold',                   action: 'Reject',         to: 'Rejected',               roles: ['SB User'] },
  // Admin can revert finals
  { from: 'Halal',                  action: 'Review',         to: 'Under Review',           roles: ['Admin'] },
  { from: 'Haram',                  action: 'Review',         to: 'Under Review',           roles: ['Admin'] },
  { from: 'Approved',               action: 'Review',         to: 'Under Review',           roles: ['Admin'] },
  { from: 'Doubtful',               action: 'Review',         to: 'Under Review',           roles: ['Admin'] },
  { from: 'Rejected',               action: 'Review',         to: 'Under Review',           roles: ['Admin'] },
  { from: 'Returned',               action: 'Return to Eval', to: 'Returned To Evaluation', roles: ['Admin'] },
];

export function getAvailableActions(workflowState, roles = []) {
  return TRANSITIONS.filter(t =>
    t.from === workflowState &&
    t.roles.some(r => roles.includes(r))
  );
}

export function getActionButtonClass(action) {
  const danger  = ['Reject', 'Haram', 'Delist'];
  const warning = ['Return', 'Return to Eval', 'Hold', 'Doubtful'];
  const success = ['Approve', 'Halal', 'Submit', 'List', 'Forward'];
  const info    = ['Review'];
  if (danger.includes(action))  return 'btn btn-danger btn-sm';
  if (warning.includes(action)) return 'btn btn-warning btn-sm';
  if (success.includes(action)) return 'btn btn-primary btn-sm';
  if (info.includes(action))    return 'btn btn-secondary btn-sm';
  return 'btn btn-outline btn-sm';
}

export default STATE_META;
