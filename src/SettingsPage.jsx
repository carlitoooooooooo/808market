import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabase.js";
import { 
  isSoundsEnabled, 
  setSoundsEnabled, 
  playNotificationSound, 
  playMessageSound,
  getNotificationSoundType,
  setNotificationSoundType,
  getNotificationVolume,
  setNotificationVolume,
  isAutoMuteEnabled,
  setAutoMute
} from "./soundUtils.js";

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';

export default function SettingsPage({ onClose }) {
  const { currentUser, logout } = useAuth();

  const [section, setSection] = useState("account"); // "account" | "password" | "fun" | "creator" | "privacy" | "about"
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
      return JSON.parse(localStorage.getItem('cursorAnimation') || 'false');
    } catch {
      return false;
    }
  });
  const [soundsEnabled, setSoundsEnabledLocal] = useState(() => isSoundsEnabled());
  const [soundType, setSoundTypeLocal] = useState(() => getNotificationSoundType());
  const [soundVolume, setSoundVolumeLocal] = useState(() => getNotificationVolume());
  const [autoMute, setAutoMuteLocal] = useState(() => isAutoMuteEnabled());

  // Creator Tools state
  const [uploadCount, setUploadCount] = useState(0);
  const [totalBeatsRevenue, setTotalBeatsRevenue] = useState(0);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState(() => currentUser?.stripeAccountId || null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeChecked, setStripeChecked] = useState(false);

  // Privacy & Safety state
  const [hideActivityStatus, setHideActivityStatus] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hideActivityStatus') || 'false');
    } catch {
      return false;
    }
  });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [muteNotifications, setMuteNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('muteNotifications') || 'false');
    } catch {
      return false;
    }
  });
  const [blockUsername, setBlockUsername] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);

  // Bug Report state
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugLoading, setBugLoading] = useState(false);
  const [bugMsg, setBugMsg] = useState(null);

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

  function handleSoundsToggle() {
    const newValue = !soundsEnabled;
    setSoundsEnabledLocal(newValue);
    setSoundsEnabled(newValue);
  }

  function handleSoundTypeChange(type) {
    setSoundTypeLocal(type);
    setNotificationSoundType(type);
  }

  function handleVolumeChange(newVolume) {
    const clamped = Math.max(0, Math.min(100, newVolume));
    setSoundVolumeLocal(clamped);
    setNotificationVolume(clamped);
  }

  function handleAutoMuteToggle() {
    const newValue = !autoMute;
    setAutoMuteLocal(newValue);
    setAutoMute(newValue);
  }

  function playTestSound(type) {
    if (type === 'notification') {
      playNotificationSound('like');
    } else if (type === 'message') {
      playMessageSound();
    }
  }

  // Load creator data
  useEffect(() => {
    if (section === "creator") {
      loadCreatorData();
      loadStripeStatus();
    }
  }, [section]);

  async function loadCreatorData() {
    if (!currentUser?.username) return;
    setCreatorLoading(true);
    try {
      const res = await fetch(
        `${URL}/rest/v1/tracks?uploaded_by_username=eq.${encodeURIComponent(currentUser.username)}&select=*`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const tracks = await res.json();
      if (Array.isArray(tracks)) {
        setUploadCount(tracks.length);
        const revenue = tracks.reduce((sum, t) => sum + (t.price || 0), 0);
        setTotalBeatsRevenue(revenue);
      }
    } catch {}
    setCreatorLoading(false);
  }

  async function loadStripeStatus() {
    if (!currentUser?.username || stripeChecked) return;
    try {
      // Load stripe_account_id from profiles
      const res = await fetch(
        `${URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}&select=stripe_account_id`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const data = await res.json();
      const accountId = data?.[0]?.stripe_account_id;
      if (accountId) {
        setStripeAccountId(accountId);
        // Check if fully connected
        const statusRes = await fetch(`/api/connect-status?account_id=${accountId}`);
        const status = await statusRes.json();
        setStripeConnected(status.connected === true);
      }
    } catch {}
    setStripeChecked(true);
  }

  async function handleStripeConnect() {
    if (!currentUser?.username) return;
    setStripeConnecting(true);
    try {
      const res = await fetch('/api/connect-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, existingAccountId: stripeAccountId }),
      });
      const data = await res.json();
      if (data.url) {
        // Save accountId to Supabase before redirecting
        if (data.accountId && data.accountId !== stripeAccountId) {
          await fetch(`${URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`, {
            method: 'PATCH',
            headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ stripe_account_id: data.accountId }),
          });
          setStripeAccountId(data.accountId);
        }
        window.location.href = data.url;
      }
    } catch (err) {
      alert('Failed to start Stripe onboarding: ' + err.message);
    }
    setStripeConnecting(false);
  }

  // Load blocked users
  useEffect(() => {
    if (section === "privacy") {
      loadBlockedUsers();
    }
  }, [section]);

  async function loadBlockedUsers() {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(
        `${URL}/rest/v1/profiles?id=eq.${encodeURIComponent(currentUser.id)}&select=blocked_users`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.blocked_users) {
        setBlockedUsers(data[0].blocked_users);
      }
    } catch {}
  }

  async function handleBlockUser() {
    if (!blockUsername.trim() || blockLoading) return;
    setBlockLoading(true);
    try {
      const newBlocked = [...blockedUsers, blockUsername.trim()];
      await fetch(`${URL}/rest/v1/profiles?id=eq.${encodeURIComponent(currentUser.id)}`, {
        method: 'PATCH',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_users: newBlocked }),
      });
      setBlockedUsers(newBlocked);
      setBlockUsername("");
    } catch {}
    setBlockLoading(false);
  }

  async function handleUnblockUser(username) {
    try {
      const newBlocked = blockedUsers.filter(u => u !== username);
      await fetch(`${URL}/rest/v1/profiles?id=eq.${encodeURIComponent(currentUser.id)}`, {
        method: 'PATCH',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_users: newBlocked }),
      });
      setBlockedUsers(newBlocked);
    } catch {}
  }

  function handleHideActivityToggle() {
    const newValue = !hideActivityStatus;
    setHideActivityStatus(newValue);
    localStorage.setItem('hideActivityStatus', JSON.stringify(newValue));
    // Save to DB
    if (currentUser?.username) {
      fetch(`${URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`, {
        method: 'PATCH',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hide_activity: newValue }),
      }).catch(() => {});
    }
  }

  function handleMuteNotificationsToggle() {
    const newValue = !muteNotifications;
    setMuteNotifications(newValue);
    localStorage.setItem('muteNotifications', JSON.stringify(newValue));
  }

  async function handleSubmitBugReport(e) {
    e.preventDefault();
    setBugMsg(null);
    if (!bugTitle.trim() || !bugDescription.trim()) {
      return setBugMsg({ type: "error", text: "Please fill in all fields." });
    }
    setBugLoading(true);
    try {
      const threadId = [currentUser.username, "mastercard"].sort().join("__");
      const bugReport = `🐛 BUG REPORT\n\nTitle: ${bugTitle}\n\nDescription: ${bugDescription}`;
      
      const res = await fetch(`${URL}/rest/v1/messages`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          thread_id: threadId,
          sender: currentUser.username,
          recipient: "mastercard",
          body: bugReport,
          read: false,
        }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      setBugMsg({ type: "success", text: "Bug report sent! 🙏" });
      setBugTitle("");
      setBugDescription("");
      setTimeout(() => setBugMsg(null), 3000);
    } catch (err) {
      console.error("Bug report error:", err);
      setBugMsg({ type: "error", text: "Failed to send bug report. Try again." });
    } finally {
      setBugLoading(false);
    }
  }

  const SOUND_TYPES = [
    { id: 'retro-beep', name: 'Retro Beep', emoji: '📡' },
    { id: 'coin-ding', name: 'Coin Ding', emoji: '🪙' },
    { id: 'chime', name: 'Chime', emoji: '🔔' },
    { id: 'sci-fi-blip', name: 'Sci-Fi Blip', emoji: '🛸' },
  ];

  const SECTIONS = [
    { id: "account", label: "👤 Account" },
    { id: "creator", label: "🛠️ Tools" },
    { id: "privacy", label: "🔒 Privacy" },
    { id: "fun", label: "🎉 Fun" },
    { id: "password", label: "🔑 Password" },
    { id: "about", label: "ℹ️ Help" },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="settings-header">
          <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "16px" }}>Settings</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", fontSize: "16px", cursor: "pointer", lineHeight: 1, width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
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

              {/* Notification Sounds */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', fontFamily: 'var(--font-head)' }}>
                  🔊 NOTIFICATION SOUNDS
                </label>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>
                  Customize notification beeps and alerts
                </p>
                
                {/* Master Enable/Disable */}
                <button
                  onClick={handleSoundsToggle}
                  style={{
                    background: soundsEnabled ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.06)',
                    border: soundsEnabled ? '1px solid rgba(0,200,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-head)',
                    transition: 'all 0.3s',
                    width: '100%',
                    marginBottom: '16px',
                  }}
                >
                  {soundsEnabled ? '✓ Sounds Enabled' : 'Enable Sounds'}
                </button>

                {soundsEnabled && (
                  <>
                    {/* Sound Type Selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>
                        Sound Type
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {SOUND_TYPES.map(st => (
                          <button
                            key={st.id}
                            onClick={() => handleSoundTypeChange(st.id)}
                            style={{
                              background: soundType === st.id ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.06)',
                              border: soundType === st.id ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              color: '#fff',
                              fontWeight: 500,
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-head)',
                              transition: 'all 0.2s',
                              textAlign: 'center',
                            }}
                            onMouseEnter={e => {
                              if (soundType !== st.id) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseLeave={e => {
                              if (soundType !== st.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }}
                          >
                            {st.emoji}<br/>{st.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volume Slider */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                          Volume
                        </label>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cyan)' }}>{soundVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={soundVolume}
                        onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(255,255,255,0.1)',
                          outline: 'none',
                          cursor: 'pointer',
                          accentColor: 'var(--cyan)',
                        }}
                      />
                    </div>

                    {/* Auto-Mute Toggle */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>
                        Auto-Mute
                      </label>
                      <button
                        onClick={handleAutoMuteToggle}
                        style={{
                          background: autoMute ? 'rgba(191,95,255,0.1)' : 'rgba(255,255,255,0.06)',
                          border: autoMute ? '1px solid rgba(191,95,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          color: '#fff',
                          fontWeight: 500,
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-head)',
                          transition: 'all 0.2s',
                          width: '100%',
                        }}
                      >
                        {autoMute ? '✓ Mute when tab focused' : 'Mute when tab focused'}
                      </button>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', fontFamily: 'var(--font-body)' }}>
                        {autoMute ? 'Sounds disabled while this tab is active' : 'Sounds play even if tab is active'}
                      </p>
                    </div>

                    {/* Test Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => playTestSound('notification')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'rgba(191,95,255,0.1)',
                          border: '1px solid rgba(191,95,255,0.3)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-head)',
                          fontWeight: 500,
                        }}
                      >
                        Test 🔔
                      </button>
                      <button
                        onClick={() => playTestSound('message')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'rgba(0,255,136,0.1)',
                          border: '1px solid rgba(0,255,136,0.3)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-head)',
                          fontWeight: 500,
                        }}
                      >
                        Test 💬
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Creator Tools ── */}
          {section === "creator" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {creatorLoading ? (
                <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "13px", padding: "20px" }}>Loading...</div>
              ) : (
                <>
                  {/* Stripe Connect alert banner */}
                  {!stripeConnected && uploadCount > 0 && (
                    <div style={{
                      background: "rgba(255,200,0,0.08)",
                      border: "1px solid rgba(255,200,0,0.35)",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}>
                      <span style={{ fontSize: "20px", flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{ fontFamily: "var(--font-head)", fontSize: "13px", fontWeight: 700, color: "#ffc800", marginBottom: "4px" }}>
                          You're not set up to receive payouts
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                          Connect Stripe below so you automatically receive 85% of every sale. Until then, sales go to 808market and are paid out manually.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="settings-field">
                    <label className="settings-label">Total Uploads</label>
                    <div className="settings-value" style={{ fontSize: "24px", fontWeight: 700 }}>{uploadCount}</div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "12px", fontFamily: "var(--font-head)" }}>
                      Royalty Split
                    </label>
                    <div style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.2)", borderRadius: "10px", padding: "14px", fontSize: "13px", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                      <div><strong>808market:</strong> 15%</div>
                      <div><strong>You:</strong> 85%</div>
                    </div>
                  </div>

                  {/* Stripe Connect */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", fontFamily: "var(--font-head)" }}>
                      💳 Stripe Payouts
                    </label>
                    <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "14px", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                      Connect your bank account to receive your 85% automatically after every sale.
                    </div>
                    {stripeConnected ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
                        <span style={{ fontSize: "18px" }}>✅</span>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-head)" }}>Stripe Connected</div>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>Payouts go directly to your bank after each sale</div>
                        </div>
                        <button
                          onClick={handleStripeConnect}
                          style={{ marginLeft: "auto", padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "var(--text-dim)", fontSize: "11px", cursor: "pointer", fontFamily: "var(--font-head)" }}
                        >
                          Manage
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStripeConnect}
                        disabled={stripeConnecting}
                        style={{
                          width: "100%", padding: "13px", borderRadius: "12px",
                          background: stripeConnecting ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #635bff, #00f5ff)",
                          border: "none", color: stripeConnecting ? "var(--text-dim)" : "#fff",
                          fontSize: "14px", fontWeight: 700, cursor: stripeConnecting ? "not-allowed" : "pointer",
                          fontFamily: "var(--font-head)", transition: "all 0.2s"
                        }}
                      >
                        {stripeConnecting ? "Opening Stripe..." : "💳 Connect Stripe — Get Paid"}
                      </button>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                    <button
                      onClick={() => alert("Bulk edit feature coming soon!")}
                      style={{
                        width: "100%", padding: "12px", background: "rgba(0,245,255,0.1)",
                        border: "1px solid rgba(0,245,255,0.3)", borderRadius: "12px",
                        color: "var(--cyan)", fontSize: "14px", fontWeight: 600,
                        cursor: "pointer", fontFamily: "var(--font-head)",
                      }}
                    >📝 Bulk Edit Beats (Coming Soon)</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Privacy & Safety ── */}
          {section === "privacy" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Hide Activity Status */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-head)" }}>
                  👁️ ACTIVITY STATUS
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", fontFamily: "var(--font-body)" }}>
                  Hide your online status from other users
                </p>
                <button
                  onClick={handleHideActivityToggle}
                  style={{
                    background: hideActivityStatus ? "rgba(191,95,255,0.1)" : "rgba(255,255,255,0.06)",
                    border: hideActivityStatus ? "1px solid rgba(191,95,255,0.3)" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    fontFamily: "var(--font-head)",
                    transition: "all 0.3s",
                    width: "100%",
                  }}
                >
                  {hideActivityStatus ? "✓ Activity Hidden" : "Activity Visible"}
                </button>
              </div>

              {/* Mute Notifications */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-head)" }}>
                  🔇 MUTE NOTIFICATIONS
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", fontFamily: "var(--font-body)" }}>
                  Silence all user notifications
                </p>
                <button
                  onClick={handleMuteNotificationsToggle}
                  style={{
                    background: muteNotifications ? "rgba(255,51,102,0.1)" : "rgba(255,255,255,0.06)",
                    border: muteNotifications ? "1px solid rgba(255,51,102,0.3)" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    fontFamily: "var(--font-head)",
                    transition: "all 0.3s",
                    width: "100%",
                  }}
                >
                  {muteNotifications ? "✓ Notifications Muted" : "Notifications Enabled"}
                </button>
              </div>

              {/* Block/Unblock Users */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-head)" }}>
                  🚫 BLOCKED USERS
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", fontFamily: "var(--font-body)" }}>
                  Block users from messaging you
                </p>
                
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <input
                    className="auth-input"
                    type="text"
                    value={blockUsername}
                    onChange={e => setBlockUsername(e.target.value)}
                    placeholder="Username to block"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={handleBlockUser}
                    disabled={!blockUsername.trim() || blockLoading}
                    style={{
                      padding: "10px 16px",
                      background: "rgba(255,51,102,0.1)",
                      border: "1px solid rgba(255,51,102,0.3)",
                      borderRadius: "8px",
                      color: "var(--red)",
                      fontWeight: 600,
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: "var(--font-head)",
                      opacity: blockLoading ? 0.6 : 1,
                    }}
                  >
                    Block
                  </button>
                </div>

                {blockedUsers.length > 0 && (
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px", gap: "8px", display: "flex", flexDirection: "column" }}>
                    {blockedUsers.map(username => (
                      <div key={username} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", fontSize: "13px" }}>
                        <span>@{username}</span>
                        <button
                          onClick={() => handleUnblockUser(username)}
                          style={{
                            background: "transparent",
                            border: "1px solid rgba(0,255,136,0.3)",
                            borderRadius: "4px",
                            color: "var(--green)",
                            padding: "4px 8px",
                            fontSize: "11px",
                            cursor: "pointer",
                            fontFamily: "var(--font-head)",
                          }}
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── About & Help ── */}
          {section === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Version Info */}
              <div className="settings-field">
                <label className="settings-label">Version</label>
                <div className="settings-value">v1.7.0</div>
              </div>

              {/* Credits */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-head)" }}>
                  💝 CREDITS
                </label>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px", fontSize: "12px", fontFamily: "var(--font-body)", lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
                  <p>Developed by mastercard2k 🎹</p>
                  <p style={{ marginTop: "8px" }}>Built with ❤️ by the 808market team</p>
                  <p style={{ marginTop: "8px" }}>Special thanks to all our producers and users for making this platform incredible.</p>
                </div>
              </div>

              {/* Links */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                <a
                  href="/about"
                  style={{
                    padding: "12px",
                    background: "rgba(0,245,255,0.1)",
                    border: "1px solid rgba(0,245,255,0.3)",
                    borderRadius: "10px",
                    color: "var(--cyan)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "var(--font-head)",
                    textAlign: "center",
                    textDecoration: "none",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,245,255,0.2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,245,255,0.1)"}
                >
                  📖 Changelog
                </a>
              </div>

              {/* Bug Report Form */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-head)" }}>
                  🐛 REPORT A BUG
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", fontFamily: "var(--font-body)" }}>
                  Help us fix issues by reporting bugs
                </p>
                <form onSubmit={handleSubmitBugReport} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <input
                      className="auth-input"
                      type="text"
                      value={bugTitle}
                      onChange={e => setBugTitle(e.target.value)}
                      placeholder="Bug title (e.g., 'Audio not playing')"
                    />
                  </div>
                  <div>
                    <textarea
                      className="auth-input"
                      value={bugDescription}
                      onChange={e => setBugDescription(e.target.value)}
                      placeholder="Describe the issue in detail..."
                      style={{ minHeight: "100px", resize: "vertical", fontFamily: "var(--font-body)" }}
                    />
                  </div>

                  {bugMsg && (
                    <div style={{
                      padding: "10px 14px", borderRadius: "10px", fontSize: "13px",
                      fontFamily: "var(--font-body)",
                      background: bugMsg.type === "success" ? "rgba(0,255,136,0.1)" : "rgba(255,51,102,0.1)",
                      border: `1px solid ${bugMsg.type === "success" ? "rgba(0,255,136,0.3)" : "rgba(255,51,102,0.3)"}`,
                      color: bugMsg.type === "success" ? "var(--green)" : "var(--red)",
                    }}>
                      {bugMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={bugLoading}
                    style={{ width: "100%", justifyContent: "center", opacity: bugLoading ? 0.6 : 1 }}
                  >
                    {bugLoading ? "Sending..." : "📤 Send Bug Report"}
                  </button>
                </form>
              </div>

              {/* Feedback Form */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-head)" }}>
                  💡 SEND FEEDBACK
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", fontFamily: "var(--font-body)" }}>
                  Suggestions help us improve
                </p>
                <button
                  onClick={() => alert("Feedback form coming soon!")}
                  style={{
                    width: "100%", padding: "12px", background: "rgba(191,95,255,0.1)",
                    border: "1px solid rgba(191,95,255,0.3)", borderRadius: "12px",
                    color: "#fff", fontSize: "14px", fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-head)",
                  }}
                >
                  Share Your Ideas
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
