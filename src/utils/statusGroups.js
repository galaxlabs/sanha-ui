export function getSummaryStatus(status) {
  if (status === 'Halal') return 'Approved';
  if (status === 'Haram') return 'Rejected';
  return status || 'Draft';
}

export function countBySummaryStatus(rows) {
  const counts = {};
  rows.forEach(row => {
    const status = getSummaryStatus(row.workflow_state);
    counts[status] = (counts[status] || 0) + 1;
  });
  return counts;
}
