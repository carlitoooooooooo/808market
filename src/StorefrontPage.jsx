import React from "react";

export default function StorefrontPage({ username, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-head)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>@{username}'s Storefront</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>Coming soon...</div>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'var(--font-head)', fontSize: '14px' }}>
          ← Back to 808market
        </button>
      </div>
    </div>
  );
}
