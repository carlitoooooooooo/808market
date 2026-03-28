import React, { useState, useEffect, useRef } from "react";
import { useAuth, AVATAR_COLORS } from "./AuthContext.jsx";
import Logo from "./Logo.jsx";

const TURNSTILE_SITE_KEY = '0x4AAAAAACvZvlyc-GFKm5Lm';

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Render Turnstile widget when switching to signup
  useEffect(() => {
    if (mode !== 'signup') return;
    const interval = setInterval(() => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        clearInterval(interval);
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null),
        });
      }
    }, 100);
    return () => {
      clearInterval(interval);
      if (widgetIdRef.current) {
        try { window.turnstile?.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Verify Turnstile for signup
    if (mode === 'signup') {
      if (!turnstileToken) {
        setError("Please complete the verification check.");
        return;
      }
      try {
        const verifyRes = await fetch('/api/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          setError("Verification failed. Please try again.");
          if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
          setTurnstileToken(null);
          return;
        }
      } catch {
        // If verification API fails, allow signup anyway (don't block real users)
      }
    }

    setLoading(true);
    let result;
    if (mode === "login") {
      result = await login(username.trim(), password);
    } else {
      result = await signup(username.trim(), password, avatarColor, bio.trim(), email.trim());
    }
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="auth-screen">
      {/* Animated background */}
      <div className="app-bg" />
      <div className="auth-bg-splatter" />

      <div className="auth-logo">
        <Logo />
        <div className="logo-sub">The Beat Marketplace</div>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>
            LOGIN
          </button>
          <button className={`auth-tab ${mode === "signup" ? "auth-tab--active" : ""}`} onClick={() => { setMode("signup"); setError(""); }}>
            SIGN UP
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">USERNAME</label>
            <input
              className="auth-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ur_handle"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">PASSWORD</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {mode === "signup" && (
            <>
              <div className="auth-field">
                <label className="auth-label">EMAIL <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 400 }}>(optional — for account recovery)</span></label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={loading}
                />
                {!email && (
                  <div style={{ fontSize: '11px', color: '#ff9900', marginTop: '5px', fontFamily: 'var(--font-body)' }}>
                    ⚠️ Without an email, you won't be able to recover your account if you forget your password.
                  </div>
                )}
              </div>
              <div className="auth-field">
                <label className="auth-label">BIO (OPTIONAL)</label>
                <input
                  className="auth-input"
                  type="text"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="say something..."
                  maxLength={80}
                  disabled={loading}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">PICK YOUR COLOR</label>
                <div className="avatar-color-picker">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`avatar-color-option ${avatarColor === color ? "avatar-color-option--selected" : ""}`}
                      style={{ background: color }}
                      onClick={() => setAvatarColor(color)}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <div className="auth-error">{error}</div>}

          {/* Turnstile widget - only shown on signup */}
          {mode === 'signup' && (
            <div ref={turnstileRef} style={{ margin: '8px 0', minHeight: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          )}

          <button className="auth-submit btn-primary" type="submit" disabled={loading || (mode === 'signup' && !turnstileToken)}>
            {loading ? "..." : mode === "login" ? "Enter 808market →" : "Create Account →"}
          </button>
        </form>
      </div>

      <div className="auth-footer">swipe. discover. sell. 🎵</div>
    </div>
  );
}
