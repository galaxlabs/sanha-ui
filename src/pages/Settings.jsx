import { useEffect, useRef, useState } from 'react';
import {
  Shield, Users, Settings as SettingsIcon, Database,
  Upload, Image, Key, Lock, Eye, EyeOff, Check, X,
  RefreshCw, Save, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TRANSITIONS } from '../utils/workflow';
import {
  uploadLogoFile, savePortalLogoUrl, getPortalLogoUrl,
  adminSetPassword, updatePassword, listUsers,
} from '../api/frappe';
import { useToast } from '../contexts/ToastContext';

/* ── collapsible section card ── */
function SectionCard({ icon: Icon, iconBg, iconColor, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: open ? 20 : 0 }}>
        <div style={{ width: 40, height: 40, background: iconBg, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} color={iconColor} />
        </div>
        <h3 style={{ flex: 1, margin: 0 }}>{title}</h3>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>
      {open && children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();

  if (!isAdmin()) {
    return (
      <div>
        <div className="mb-4">
          <h2>Settings</h2>
          <p className="text-sm text-gray mt-1">Your account settings</p>
        </div>
        <SectionCard icon={Key} iconBg="#e0e7ff" iconColor="#4338ca" title="Change Password">
          <ChangePasswordForm selfUser={user?.name} addToast={addToast} adminMode={false} />
        </SectionCard>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2>Settings</h2>
        <p className="text-sm text-gray mt-1">System configuration and administration</p>
      </div>

      <SectionCard icon={Image} iconBg="#fce7f3" iconColor="#be185d" title="Portal Logo">
        <LogoPanel addToast={addToast} />
      </SectionCard>

      <SectionCard icon={Key} iconBg="#e0e7ff" iconColor="#4338ca" title="Change My Password">
        <ChangePasswordForm selfUser={user?.name} addToast={addToast} adminMode={false} />
      </SectionCard>

      <SectionCard icon={Users} iconBg="#dcfce7" iconColor="#16a34a" title="User Management" defaultOpen={false}>
        <UserManagementPanel addToast={addToast} />
      </SectionCard>

      <SectionCard icon={Shield} iconBg="#fef3c7" iconColor="#d97706" title="Role Permissions" defaultOpen={false}>
        <RolePermissionsTable />
      </SectionCard>

      <SectionCard icon={Database} iconBg="#f0fdf4" iconColor="#16a34a" title="System Info" defaultOpen={false}>
        <FrappeConnectionInfo user={user} />
      </SectionCard>

      <SectionCard icon={SettingsIcon} iconBg="#f3f4f6" iconColor="#6b7280" title="Workflow Reference" defaultOpen={false}>
        <WorkflowReference />
      </SectionCard>
    </div>
  );
}

/* ── Logo Panel ── */
function LogoPanel({ addToast }) {
  const [current, setCurrent] = useState(() => getPortalLogoUrl());
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const handlePick = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { addToast("Please select an image file", "error"); return; }
    if (f.size > 2 * 1024 * 1024) { addToast("Image must be under 2 MB", "error"); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const uploaded = await uploadLogoFile(file);
      const url = uploaded?.file_url || uploaded;
      savePortalLogoUrl(url);
      setCurrent(url);
      setPreview(null);
      setFile(null);
      window.dispatchEvent(new CustomEvent("portal-logo-updated", { detail: { url } }));
      addToast("Logo updated successfully", "success");
    } catch (err) {
      addToast(err.message || "Upload failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    savePortalLogoUrl(null);
    setCurrent(null); setPreview(null); setFile(null);
    window.dispatchEvent(new CustomEvent("portal-logo-updated", { detail: { url: null } }));
    addToast("Logo removed", "success");
  };

  return (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div
        style={{
          width: 200, height: 120, border: "2px dashed var(--border-base)", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          background: "var(--surface-bg)", cursor: "pointer", flexShrink: 0,
        }}
        onClick={() => inputRef.current?.click()}
      >
        {(preview || current) ? (
          <img src={preview || current} alt="Logo"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <Upload size={28} style={{ margin: "0 auto 6px", display: "block" }} />
            <div style={{ fontSize: "0.78rem" }}>Click to upload</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*"
          style={{ display: "none" }} onChange={handlePick} />
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
          Upload your organisation logo. It will appear in the sidebar and print headers.
          Recommended: PNG/SVG, transparent background, max 2 MB.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>
            <Upload size={14} /> {current || preview ? "Replace Logo" : "Choose File"}
          </button>
          {(file || preview) && (
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? <><RefreshCw size={13} className="spin" /> Uploading…</> : <><Save size={13} /> Save Logo</>}
            </button>
          )}
          {current && !preview && (
            <button className="btn btn-sm"
              onClick={handleRemove}
              style={{ border: "1px solid #fca5a5", color: "#b91c1c", background: "#fff1f2" }}>
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
        {current && (
          <div style={{ marginTop: 10, fontSize: "0.72rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
            Current: <span style={{ color: "var(--brand-600)" }}>{current}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Change Password Form ── */
function ChangePasswordForm({ selfUser, addToast, adminMode = false, targetUser = null, onDone }) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const subject = targetUser || selfUser;
  const pwdMatch = newPwd && confirm && newPwd === confirm;
  const pwdStrong = newPwd.length >= 8;

  const handleSave = async () => {
    if (newPwd !== confirm) { addToast("Passwords do not match", "error"); return; }
    if (!pwdStrong) { addToast("Password must be at least 8 characters", "error"); return; }
    if (!adminMode && !oldPwd) { addToast("Enter your current password", "error"); return; }
    setSaving(true);
    try {
      if (adminMode) {
        await adminSetPassword(subject, newPwd);
      } else {
        await updatePassword(oldPwd, newPwd);
      }
      addToast("Password updated successfully", "success");
      setOldPwd(""); setNewPwd(""); setConfirm("");
      onDone?.();
    } catch (err) {
      addToast(err.message || "Failed to update password", "error");
    } finally {
      setSaving(false);
    }
  };

  const PwdInput = ({ label, val, setVal, show, setShow, placeholder, extra }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "9px 40px 9px 12px", borderRadius: 8,
            border: "1px solid " + (extra || "var(--border-base)"),
            fontSize: "0.875rem", background: "var(--surface-bg)",
            color: "var(--text-primary)", boxSizing: "border-box",
          }}
        />
        <button type="button" onClick={() => setShow(v => !v)}
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 400 }}>
      {adminMode && subject && (
        <div style={{ marginBottom: 14, padding: "8px 12px", background: "#fefce8", borderRadius: 8,
          fontSize: "0.8rem", color: "#92400e", border: "1px solid #fde68a" }}>
          Setting password for: <strong>{subject}</strong>
        </div>
      )}

      {!adminMode && (
        <PwdInput label="Current Password" val={oldPwd} setVal={setOldPwd}
          show={showOld} setShow={setShowOld} placeholder="Your current password" />
      )}

      <PwdInput label="New Password" val={newPwd} setVal={setNewPwd}
        show={showNew} setShow={setShowNew} placeholder="At least 8 characters" />

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>
          Confirm New Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showNew ? "text" : "password"}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            style={{
              width: "100%", padding: "9px 40px 9px 12px", borderRadius: 8,
              border: "1px solid " + (confirm ? (pwdMatch ? "#86efac" : "#fca5a5") : "var(--border-base)"),
              fontSize: "0.875rem", background: "var(--surface-bg)",
              color: "var(--text-primary)", boxSizing: "border-box",
            }}
          />
          {confirm && (
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              color: pwdMatch ? "#16a34a" : "#dc2626" }}>
              {pwdMatch ? <Check size={16} /> : <X size={16} />}
            </span>
          )}
        </div>
      </div>

      {newPwd && (
        <div style={{ marginBottom: 12, fontSize: "0.75rem", color: pwdStrong ? "#16a34a" : "#d97706" }}>
          {pwdStrong ? "✓ Password meets minimum length" : "⚠ Password too short (min 8 chars)"}
        </div>
      )}

      <button
        className="btn btn-primary btn-sm"
        onClick={handleSave}
        disabled={saving || !newPwd || !pwdMatch || !pwdStrong || (!adminMode && !oldPwd)}
      >
        {saving
          ? <><RefreshCw size={13} className="spin" /> Updating…</>
          : <><Lock size={13} /> Update Password</>}
      </button>
    </div>
  );
}

/* ── User Management Panel ── */
function UserManagementPanel({ addToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pwdTarget, setPwdTarget] = useState(null);

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => addToast("Failed to load users", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 20, color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading users…</div>
  );

  return (
    <div>
      <div className="table-wrap" style={{ marginBottom: pwdTarget ? 20 : 0 }}>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Last Login</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.name}
                style={{ background: pwdTarget === u.name ? "var(--brand-50,#f0fdf4)" : undefined }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: "linear-gradient(135deg,var(--brand-600),var(--brand-700))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: "0.7rem", flexShrink: 0,
                    }}>
                      {(u.full_name || u.name)[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{u.full_name || u.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{u.name}</td>
                <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                </td>
                <td>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setPwdTarget(pwdTarget === u.name ? null : u.name)}
                    style={{ fontSize: "0.72rem" }}
                  >
                    <Key size={12} /> {pwdTarget === u.name ? "Cancel" : "Set Pwd"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pwdTarget && (
        <div style={{ border: "1px solid var(--border-base)", borderRadius: 12, padding: 20,
          background: "var(--surface-card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Key size={16} color="var(--brand-600)" />
            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>Set Password for {pwdTarget}</h4>
          </div>
          <ChangePasswordForm
            selfUser={pwdTarget}
            addToast={addToast}
            adminMode={true}
            targetUser={pwdTarget}
            onDone={() => setPwdTarget(null)}
          />
        </div>
      )}
    </div>
  );
}

/* ── Role Permissions Table ── */
function RolePermissionsTable() {
  const PERMS = [
    { role: "Client",              create: true,  read: true,  write: true,  delete: false, export: true,  desc: "Submit & track own queries" },
    { role: "Evaluation",          create: true,  read: true,  write: true,  delete: false, export: true,  desc: "Review & forward queries" },
    { role: "SB User",             create: true,  read: true,  write: true,  delete: false, export: true,  desc: "Final review & decision" },
    { role: "Certificate Manager", create: false, read: true,  write: false, delete: false, export: true,  desc: "View approved/certified queries" },
    { role: "Admin",               create: true,  read: true,  write: true,  delete: true,  export: true,  desc: "Full admin access" },
    { role: "System Manager",      create: true,  read: true,  write: true,  delete: true,  export: true,  desc: "System-level full access" },
  ];
  const C = ({ v }) => <span style={{ color: v ? "#16a34a" : "#d1d5db", fontWeight: 700 }}>{v ? "✓" : "✗"}</span>;

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Role</th><th>Create</th><th>Read</th><th>Write</th><th>Delete</th><th>Export</th></tr></thead>
        <tbody>
          {PERMS.map(p => (
            <tr key={p.role}>
              <td>
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.role}</div>
                <div className="text-xs text-gray">{p.desc}</div>
              </td>
              <td><C v={p.create} /></td><td><C v={p.read} /></td>
              <td><C v={p.write} /></td><td><C v={p.delete} /></td><td><C v={p.export} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Frappe Connection Info ── */
function FrappeConnectionInfo({ user }) {
  const site = window.location.origin || "eval.portal";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[
        { label: "Connected Site", value: site },
        { label: "Logged In As",   value: user?.name },
        { label: "Display Name",   value: user?.full_name },
        { label: "Roles",          value: (user?.roles || []).join(", ") },
        { label: "API Base",       value: "/api/resource/" },
      ].map(item => (
        <div key={item.label} className="flex justify-between"
          style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
          <span className="text-sm text-gray">{item.label}</span>
          <span className="text-sm font-semibold truncate" style={{ maxWidth: "65%" }}>{item.value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Workflow Reference ── */
function WorkflowReference() {
  const roleColors = { Client: "#22c55e", Evaluation: "#3b82f6", "SB User": "#8b5cf6", Admin: "#f59e0b" };
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>From State</th><th>Action</th><th>To State</th><th>Allowed Role</th></tr></thead>
        <tbody>
          {TRANSITIONS.map((t, i) => (
            <tr key={i}>
              <td className="text-sm" style={{ color: "#64748b" }}>{t.from}</td>
              <td><span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t.action}</span></td>
              <td className="text-sm" style={{ color: "#1e293b", fontWeight: 500 }}>{t.to}</td>
              <td>
                {t.roles.map(r => (
                  <span key={r} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999,
                    background: (roleColors[r] || "#e5e7eb") + "22",
                    color: roleColors[r] || "#374151", fontSize: "0.75rem", fontWeight: 600, marginRight: 4 }}>
                    {r}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
