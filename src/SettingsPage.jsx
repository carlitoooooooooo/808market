import React, { useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabase.js";

export default function SettingsPage({ onClose }) {
  const { currentUser, logout } = useAuth();

  const [section, setSection] = useState("account"); // "account" | "password"

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { type: "success"|"error", text }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (!newPw || newPw.length < 6) return setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
    if (newPw !== confirmPw) return setPwMsg({ type: "error", text: "Passwords don't match." });

    setPwLoading(true);
    try {
      // Re-authenticate with current password first
      const email = `${currentUser.username.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}@tsh-app.com`;
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPw });
      if (signInErr) {
        setPwMsg({ type: "error", text: "Current password is incorrect." });
        setPwLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) {
        setPwMsg({ type: "error", text: error.message });
      } else {
        setPwMsg({ type: "success", text: "Password updated! ✓" });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    } catch (err) {
      setPwMsg({ type: "error", text: "Something went wrong. Try again." });
    } finally {
      setPwLoading(false);
    }
  }

  const SECTIONS = [
    { id: "account", label: "Account" },
    { id: "password", label: "Password" },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="settings-header">
          <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "16px" }}>Settings</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Sub-nav */}
        <div className="settings-tabs">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`settings-tab ${section === s.id ? "settings-tab--active" : ""}`}
              onClick={() => setSection(s.id)}
            >{s.label}</button>
          ))}
        </div>

        <div className="settings-body">

          {/* ── Account Info ── */}
          {section === "account" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="settings-field">
                <label className="settings-label">Username</label>
                <div className="settings-value">@{currentUser?.username}</div>
              </div>
              <div className="settings-field">
                <label className="settings-label">Role</label>
                <div className="settings-value" style={{ textTransform: "capitalize" }}>{currentUser?.role || "user"}</div>
              </div>
              <div className="settings-field">
                <label className="settings-label">Beta Tester</label>
                <div className="settings-value">{currentUser?.isBetaTester ? "✓ Yes" : "No"}</div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "4px" }}>
                <button
                  onClick={async () => { await logout(); onClose(); }}
                  style={{
                    width: "100%", padding: "12px", background: "rgba(255,51,102,0.1)",
                    border: "1px solid rgba(255,51,102,0.3)", borderRadius: "12px",
                    color: "var(--red)", fontSize: "14px", fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-head)",
                  }}
                >Log Out</button>
              </div>
            </div>
          )}

          {/* ── Change Password ── */}
          {section === "password" && (
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="settings-label">Current Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="settings-label">New Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="settings-label">Confirm New Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>

              {pwMsg && (
                <div style={{
                  padding: "10px 14px", borderRadius: "10px", fontSize: "13px",
                  fontFamily: "var(--font-body)",
                  background: pwMsg.type === "success" ? "rgba(0,255,136,0.1)" : "rgba(255,51,102,0.1)",
                  border: `1px solid ${pwMsg.type === "success" ? "rgba(0,255,136,0.3)" : "rgba(255,51,102,0.3)"}`,
                  color: pwMsg.type === "success" ? "var(--green)" : "var(--red)",
                }}>
                  {pwMsg.text}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={pwLoading}
                style={{ width: "100%", justifyContent: "center", opacity: pwLoading ? 0.6 : 1 }}
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
