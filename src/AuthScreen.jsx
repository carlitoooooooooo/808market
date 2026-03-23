import React, { useState } from "react";
import { useAuth, AVATAR_COLORS } from "./AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    let result;
    if (mode === "login") {
      result = await login(username.trim(), password);
    } else {
      result = await signup(username.trim(), password, avatarColor, bio.trim());
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

          <button className="auth-submit btn-primary" type="submit" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Enter 808market →" : "Create Account →"}
          </button>
        </form>
      </div>

      <div className="auth-footer">swipe. cop. sell. 🎵</div>
    </div>
  );
}
