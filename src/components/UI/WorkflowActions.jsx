import { getAvailableActions, getActionButtonClass } from '../../utils/workflow';

export default function WorkflowActions({ workflowState, roles, onAction, loading }) {
  const actions = getAvailableActions(workflowState, roles);
  if (!actions.length) return null;

  return (
    <div className="wf-actions">
      {actions.map(t => (
        <button
          key={t.action}
          className={getActionButtonClass(t.action)}
          onClick={() => onAction(t.action)}
          disabled={loading}
        >
          {t.action}
        </button>
      ))}
    </div>
  );
}
