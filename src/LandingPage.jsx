import React, { useState, useEffect, useRef } from "react";
import Logo from "./Logo.jsx";
import AudioPlayer from "./AudioPlayer.js";

const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA";
const SUPABASE_URL = "https://bkapxykeryzxbqpgjgab.supabase.co";

export default function LandingPage({ onGetStarted, onBrowseAsGuest }) {
  const [beats, setBeats] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/tracks?order=listed_at.desc&limit=3`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
    }).then(r => r.json()).then(d => { if (Array.isArray(d)) setBeats(d); }).catch(() => {});
    return () => { if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; } };
  }, []);

  function handlePlay(beat) {
    if (!beat.audio_url) return;
    if (playingId === beat.id) {
      playerRef.current?.destroy(); playerRef.current = null; setPlayingId(null); return;
    }
    playerRef.current?.destroy();
    const p = new AudioPlayer(beat.audio_url, beat.snippet_start || 0);
    p.onEnded(() => setPlayingId(null));
    p.play(); playerRef.current = p; setPlayingId(beat.id);
  }

  return (
    <div style={{ minHeight: '100vh', height: '100%', background: '#000', color: '#fff', fontFamily: "'Inter', sans-serif", overflowY: 'auto', position: 'fixed', inset: 0, zIndex: 2 }}>

      {/* Gradient bg */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80vw 60vh at 20% 20%, rgba(0,245,255,0.07) 0%, transparent 60%), radial-gradient(ellipse 70vw 80vh at 80% 80%, rgba(191,95,255,0.07) 0%, transparent 60%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo />
            <span style={{ fontSize: '10px', border: '1px solid rgba(0,245,255,0.4)', color: '#00f5ff', borderRadius: '20px', padding: '2px 7px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>BETA</span>
          </div>
          <button onClick={onGetStarted} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
            Sign In
          </button>
        </div>

        {/* Hero */}
        <div style={{ padding: '48px 0 40px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 'clamp(42px, 12vw, 56px)', lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-2px' }}>
            Swipe.<br />
            <span style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Discover.</span><br />
            Cop.
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '32px', maxWidth: '340px' }}>
            The beat marketplace built for producers and artists who move different.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={onGetStarted} style={{
              background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', color: '#000',
              borderRadius: '50px', padding: '14px 28px', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
            }}>Get Started →</button>
            <button onClick={onBrowseAsGuest} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
              borderRadius: '50px', padding: '14px 24px', fontSize: '15px',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}>Browse as Guest</button>
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '20px', marginBottom: '24px', color: 'rgba(255,255,255,0.9)' }}>How it works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { icon: '🎵', title: 'Producers upload beats', desc: 'Set your price, license type, and let the world hear your work.' },
              { icon: '👆', title: 'Swipe to discover', desc: 'Hear 15-second previews. Like what you hear, cop what you love.' },
              { icon: '🛒', title: 'Cop the ones you love', desc: 'Buy direct. No middlemen. Producers get paid.' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {step.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{step.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Beats */}
        {beats.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '20px', marginBottom: '16px' }}>🔥 Featured Beats</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {beats.map(beat => {
                const isFree = !beat.price || beat.price === 0;
                const isPlaying = playingId === beat.id;
                return (
                  <div key={beat.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '14px', padding: '12px',
                  }}>
                    {/* Cover */}
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '10px', flexShrink: 0,
                      background: beat.cover_url ? `url(${beat.cover_url}) center/cover` : 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {!beat.cover_url && <span style={{ fontSize: '24px' }}>🎵</span>}
                      {beat.audio_url && (
                        <button onClick={() => handlePlay(beat)} style={{
                          position: 'absolute', inset: 0, background: isPlaying ? 'rgba(0,245,255,0.3)' : 'rgba(0,0,0,0.5)',
                          border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{isPlaying ? '⏸' : '▶'}</button>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{beat.title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '6px' }}>by {beat.artist || beat.uploaded_by_username}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {beat.genre && <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '10px', padding: '2px 8px', borderRadius: '20px' }}>{beat.genre}</span>}
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '13px', color: isFree ? '#00f5ff' : '#00ff88' }}>{isFree ? 'FREE' : `$${beat.price}`}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <button onClick={onGetStarted} style={{
                      background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', color: '#000',
                      borderRadius: '30px', padding: '8px 14px', fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0,
                    }}>Cop It</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div style={{ textAlign: 'center', padding: '12px 0 40px' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Join 808market — the beat marketplace built by producers, for producers.
          </div>
          <button onClick={onGetStarted} style={{
            background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', color: '#000',
            borderRadius: '50px', padding: '16px 40px', fontSize: '16px', fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", width: '100%', maxWidth: '320px',
          }}>Create Free Account →</button>
          <div style={{ marginTop: '16px' }}>
            <button onClick={onBrowseAsGuest} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              or browse as guest
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
