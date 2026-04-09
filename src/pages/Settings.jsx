import { useEffect, useState } from 'react';
import { Shield, Users, Settings as SettingsIcon, Database, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/UI/Loaders';
import { TRANSITIONS } from '../utils/workflow';
import * as frappe from '../api/frappe';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();

  if (!isAdmin()) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <AlertCircle size={48} color="#d1d5db" style={{ margin: '0 auto 16px', display: 'block' }} />
        <h3>Access Restricted</h3>
        <p className="text-sm text-gray mt-2">Only administrators can access settings.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2>Settings</h2>
        <p className="text-sm text-gray mt-1">System configuration and administration</p>
      </div>

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 40, height: 40, background: '#e0e7ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#4338ca" />
            </div>
            <h3>Role Permissions</h3>
          </div>
          <RolePermissionsTable />
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 40, height: 40, background: '#dcfce7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} color="#16a34a" />
            </div>
            <h3>Frappe Connection</h3>
          </div>
          <FrappeConnectionInfo user={user} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 40, height: 40, background: '#fef3c7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon size={20} color="#d97706" />
          </div>
          <h3>Workflow States Reference</h3>
        </div>
        <WorkflowReference />
      </div>
    </div>
  );
}

function RolePermissionsTable() {
  const PERMS = [
    { role: 'Client',               create: true,  read: true,  write: true,   delete: false, export: true,  description: 'Submit & track own queries' },
    { role: 'Evaluation',           create: true,  read: true,  write: true,   delete: false, export: true,  description: 'Review & forward queries' },
    { role: 'SB User',              create: true,  read: true,  write: true,   delete: false, export: true,  description: 'Final review & decision' },
    { role: 'Certificate Manager',  create: false, read: true,  write: false,  delete: false, export: true,  description: 'View approved/certified queries' },
    { role: 'Admin',                create: true,  read: true,  write: true,   delete: true,  export: true,  description: 'Full admin access' },
    { role: 'System Manager',       create: true,  read: true,  write: true,   delete: true,  export: true,  description: 'System-level full access' },
  ];
  const Check = ({ v }) => <span style={{ color: v ? '#16a34a' : '#d1d5db', fontWeight: 700 }}>{v ? '✓' : '✗'}</span>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Role</th><th>Create</th><th>Read</th><th>Write</th><th>Delete</th><th>Export</th></tr>
        </thead>
        <tbody>
          {PERMS.map(p => (
            <tr key={p.role}>
              <td><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.role}</div><div className="text-xs text-gray">{p.description}</div></td>
              <td><Check v={p.create} /></td>
              <td><Check v={p.read} /></td>
              <td><Check v={p.write} /></td>
              <td><Check v={p.delete} /></td>
              <td><Check v={p.export} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FrappeConnectionInfo({ user }) {
  const site = window.location.origin || 'eval.portal';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { label: 'Connected Site', value: site },
        { label: 'Logged In As',   value: user?.name },
        { label: 'Display Name',   value: user?.full_name },
        { label: 'Roles',          value: (user?.roles || []).join(', ') },
        { label: 'API Base',       value: '/api/resource/' },
      ].map(item => (
        <div key={item.label} className="flex justify-between" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
          <span className="text-sm text-gray">{item.label}</span>
          <span className="text-sm font-semibold truncate" style={{ maxWidth: '65%' }}>{item.value || '—'}</span>
        </div>
      ))}
    </div>
  );
}

function WorkflowReference() {
  const roleColors = { Client: '#22c55e', Evaluation: '#3b82f6', 'SB User': '#8b5cf6', Admin: '#f59e0b' };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>From State</th><th>Action</th><th>To State</th><th>Allowed Role</th></tr>
        </thead>
        <tbody>
          {TRANSITIONS.map((t, i) => (
            <tr key={i}>
              <td className="text-sm" style={{ color: '#64748b' }}>{t.from}</td>
              <td><span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.action}</span></td>
              <td className="text-sm" style={{ color: '#1e293b', fontWeight: 500 }}>{t.to}</td>
              <td>
                {t.roles.map(r => (
                  <span key={r} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: `${roleColors[r] || '#e5e7eb'}22`, color: roleColors[r] || '#374151', fontSize: '0.75rem', fontWeight: 600, marginRight: 4 }}>{r}</span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
