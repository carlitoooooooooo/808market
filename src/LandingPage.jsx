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
    async function fetchBeats() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/tracks?order=cops.desc&limit=3`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) setBeats(data);
      } catch (e) {
        console.error("Landing beats fetch error:", e);
      }
    }
    fetchBeats();
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  function handlePlay(beat) {
    if (!beat.audio_url) return;
    if (playingId === beat.id) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      setPlayingId(null);
      return;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    const p = new AudioPlayer(beat.audio_url, beat.snippet_start || 0);
    p.onEnded(() => setPlayingId(null));
    p.play();
    playerRef.current = p;
    setPlayingId(beat.id);
  }

  return (
    <div className="landing-page">
      <div className="app-bg" />

      {/* === HERO === */}
      <section className="landing-hero">
        <div className="landing-logo-wrap">
          <Logo />
          <span className="beta-tag">BETA</span>
        </div>
        <h1 className="landing-tagline">
          Swipe.<br />
          <span className="landing-tagline--accent">Discover.</span><br />
          Cop.
        </h1>
        <p className="landing-sub">
          The beat marketplace built for producers and artists who move different.
        </p>
        <div className="landing-ctas">
          <button className="btn-primary landing-cta-primary" onClick={onGetStarted}>
            Get Started →
          </button>
          <button className="btn-secondary landing-cta-secondary" onClick={onBrowseAsGuest}>
            Browse as Guest
          </button>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="landing-how">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step__icon">🎵</div>
            <div className="landing-step__label">Producers upload beats</div>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step__icon">👆</div>
            <div className="landing-step__label">You swipe to discover</div>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step__icon">🛒</div>
            <div className="landing-step__label">Cop the ones you love</div>
          </div>
        </div>
      </section>

      {/* === FEATURED BEATS === */}
      {beats.length > 0 && (
        <section className="landing-beats">
          <h2 className="landing-section-title">🔥 Featured Beats</h2>
          <div className="landing-beats-grid">
            {beats.map((beat) => {
              const isFree = !beat.price || beat.price === 0;
              const isPlaying = playingId === beat.id;
              return (
                <div key={beat.id} className="landing-beat-card">
                  {/* Cover */}
                  <div
                    className="landing-beat-cover"
                    style={{ backgroundImage: beat.cover_url ? `url(${beat.cover_url})` : "none" }}
                  >
                    <div className="landing-beat-cover-overlay" />
                    {beat.audio_url && (
                      <button
                        className={`landing-beat-play ${isPlaying ? "landing-beat-play--active" : ""}`}
                        onClick={() => handlePlay(beat)}
                      >
                        {isPlaying ? "⏸" : "▶"}
                      </button>
                    )}
                    <span className={`landing-beat-price ${isFree ? "landing-beat-price--free" : ""}`}>
                      {isFree ? "FREE" : `$${beat.price}`}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="landing-beat-info">
                    <div className="landing-beat-artist">{beat.artist}</div>
                    <div className="landing-beat-title">{beat.title}</div>
                    {beat.genre && <span className="genre-tag">{beat.genre}</span>}
                  </div>

                  {/* Auth overlay on tap */}
                  <div className="landing-beat-auth-overlay" onClick={onGetStarted}>
                    <div className="landing-beat-auth-text">
                      Sign up to cop this beat 🛒
                    </div>
                    <button className="btn-primary" style={{ fontSize: "13px", padding: "8px 20px" }}>
                      Get Started →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* === FOOTER === */}
      <footer className="landing-footer">
        <div className="landing-footer-text">
          Join 808market — the beat marketplace built by producers, for producers.
        </div>
        <button className="btn-primary landing-footer-cta" onClick={onGetStarted}>
          Get Started →
        </button>
        <button
          className="landing-footer-guest"
          onClick={onBrowseAsGuest}
        >
          or browse as guest
        </button>
      </footer>
    </div>
  );
}
