import React, { useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabase.js";

export default function SettingsPage({ onClose }) {
  const { currentUser, logout } = useAuth();

  const [section, setSection] = useState("account"); // "account" | "password" | "fun"
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('selectedTheme') || 'default';
    } catch {
      return 'default';
    }
  });
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hapticEnabled') || 'true');
    } catch {
      return true;
    }
  });
  const [cursorAnimation, setCursorAnimation] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cursorAnimation') || 'true');
    } catch {
      return true;
    }
  });

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

  const THEME_PACKS = [
    { id: 'default', name: 'Default', emoji: '🎵', colors: ['--cyan', '--purple', '--green'] },
    { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🤖', colors: ['#ff0080', '#00ff9f', '#ff00ff'] },
    { id: 'synthwave', name: 'Synthwave', emoji: '🌅', colors: ['#ff006e', '#00f5ff', '#ffbe0b'] },
    { id: 'ocean', name: 'Ocean', emoji: '🌊', colors: ['#0077be', '#00d4ff', '#5fb3d5'] },
    { id: 'forest', name: 'Forest', emoji: '🌲', colors: ['#2d6a4f', '#40916c', '#95d5b2'] },
    { id: 'sunset', name: 'Sunset', emoji: '🌅', colors: ['#ff006e', '#fb5607', '#ffbe0b'] },
  ];

  function handleThemeChange(themeId) {
    setTheme(themeId);
    localStorage.setItem('selectedTheme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  }

  function handleHapticToggle() {
    const newValue = !hapticEnabled;
    setHapticEnabled(newValue);
    localStorage.setItem('hapticEnabled', JSON.stringify(newValue));
  }

  function handleCursorAnimationToggle() {
    const newValue = !cursorAnimation;
    setCursorAnimation(newValue);
    localStorage.setItem('cursorAnimation', JSON.stringify(newValue));
    if (newValue) {
      document.documentElement.classList.add('cursor-animation-enabled');
    } else {
      document.documentElement.classList.remove('cursor-animation-enabled');
    }
  }

  const SECTIONS = [
    { id: "account", label: "Account" },
    { id: "fun", label: "🎉 Fun" },
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

          {section === "fun" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Theme Packs */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '12px', fontFamily: 'var(--font-head)' }}>
                  🎨 THEME PACKS
                </label>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>
                  Choose your vibe
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {THEME_PACKS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      style={{
                        background: theme === t.id ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.06)',
                        border: theme === t.id ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        padding: '12px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-head)',
                        transition: 'all 0.3s',
                        textAlign: 'center',
                      }}
                      onMouseEnter={e => {
                        if (theme !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={e => {
                        if (theme !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      {t.emoji}<br/>{t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Haptic Feedback */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', fontFamily: 'var(--font-head)' }}>
                  📳 HAPTIC FEEDBACK
                </label>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>
                  Feel your votes
                </p>
                <button
                  onClick={handleHapticToggle}
                  style={{
                    background: hapticEnabled ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.06)',
                    border: hapticEnabled ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-head)',
                    transition: 'all 0.3s',
                    width: '100%',
                  }}
                >
                  {hapticEnabled ? '✓ Haptic Enabled' : 'Enable Haptic'}
                </button>
              </div>

              {/* Cursor Animation */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', fontFamily: 'var(--font-head)' }}>
                  ✨ CURSOR PARTICLES
                </label>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>
                  Trailing particle effects
                </p>
                <button
                  onClick={handleCursorAnimationToggle}
                  style={{
                    background: cursorAnimation ? 'rgba(191,95,255,0.1)' : 'rgba(255,255,255,0.06)',
                    border: cursorAnimation ? '1px solid rgba(191,95,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-head)',
                    transition: 'all 0.3s',
                    width: '100%',
                  }}
                >
                  {cursorAnimation ? '✓ Particles Enabled' : 'Enable Particles'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
