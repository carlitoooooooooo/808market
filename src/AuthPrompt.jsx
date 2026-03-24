import React from "react";

/**
 * Slide-up modal shown when a guest tries to do something requiring auth.
 * Props:
 *   visible: bool
 *   onClose: fn
 *   onSignUp: fn
 *   onLogIn: fn
 */
export default function AuthPrompt({ visible, onClose, onSignUp, onLogIn }) {
  if (!visible) return null;

  return (
    <div className="auth-prompt-backdrop" onClick={onClose}>
      <div className="auth-prompt-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="auth-prompt-pill" />
        <div className="auth-prompt-icon">🔒</div>
        <div className="auth-prompt-title">Account required</div>
        <div className="auth-prompt-body">
          Create a free account to like, comment, and cop beats.
        </div>
        <div className="auth-prompt-actions">
          <button className="btn-primary auth-prompt-signup" onClick={onSignUp}>
            Sign Up — it's free
          </button>
          <button className="auth-prompt-login" onClick={onLogIn}>
            Already have an account? Log In
          </button>
        </div>
        <button className="auth-prompt-dismiss" onClick={onClose}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
