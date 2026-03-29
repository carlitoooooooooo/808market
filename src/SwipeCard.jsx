import React, { useRef, useState, useEffect, useCallback } from "react";
import AudioPlayer from "./AudioPlayer.js";
import WaveformVisualizer from "./WaveformVisualizer.jsx";
import { useAuth } from "./AuthContext.jsx";

const SWIPE_THRESHOLD = 80;

function haptic(dir) {
  try {
    const enabled = JSON.parse(localStorage.getItem('hapticEnabled') ?? 'true');
    if (!enabled) return;
    const pattern = dir === "right" ? [40] : [20];
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

export default function SwipeCard({ track, onSwipe, isTop, stackIndex }) {
  const { currentUser } = useAuth();
  const [isFlying, setIsFlying] = useState(false);
  const [flyDir, setFlyDir] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const playerRef = useRef(null);
  const outerRef = useRef(null);
  const cardRef = useRef(null);
  const frontFaceRef = useRef(null);

  // All gesture state in refs — no state re-renders during drag
  const gesture = useRef({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    isHorizontal: false,
    decided: false,
  });

  // ── Audio ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTop) stopPlay();
    return () => stopPlay();
  }, [isTop, track.id]);

  function startPlay() {
    stopPlay();
    const p = new AudioPlayer(track.audioUrl, track.snippetStart);
    p.onTimeUpdate(prog => setProgress(prog));
    p.onEnded(() => { setIsPlaying(false); setProgress(0); });
    playerRef.current = p;
    p.play();
    setIsPlaying(true);
    setProgress(0);
    const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
    fetch('https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/rpc/increment_play_count', {
      method: 'POST',
      headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: track.id }),
    }).catch(() => {});
  }

  function stopPlay() {
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    setIsPlaying(false);
    setProgress(0);
  }

  function togglePlay() {
    if (!playerRef.current) { startPlay(); return; }
    if (isPlaying) { playerRef.current.pause(); setIsPlaying(false); }
    else { playerRef.current.play(); setIsPlaying(true); }
  }

  // ── Swipe trigger ─────────────────────────────────────────────────────────
  const triggerSwipe = useCallback((dir) => {
    haptic(dir);
    setStamp(dir === "right" ? "❤️ LIKED" : "PASS 💨");
    setFlyDir(dir);
    setIsFlying(true);
    stopPlay();
    // Animate fly-out via DOM
    if (outerRef.current) {
      const tx = dir === "right" ? "130vw" : "-130vw";
      const rot = dir === "right" ? 30 : -30;
      outerRef.current.style.transition = "transform 0.35s cubic-bezier(0.4,0,0.6,1)";
      outerRef.current.style.transform = `translateX(${tx}) rotate(${rot}deg)`;
    }
    const rect = cardRef.current?.getBoundingClientRect();
    setTimeout(() => onSwipe(dir, track, rect), 350);
  }, [track, onSwipe]);

  // ── Native touch handlers (passive:false required for preventDefault) ───────
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !isTop) return;

    const setTransform = (dx, dy) => {
      if (!outerRef.current) return;
      const rot = dx * 0.08;
      outerRef.current.style.transition = "none";
      outerRef.current.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${rot}deg)`;
    };

    const resetTransform = () => {
      if (!outerRef.current) return;
      outerRef.current.style.transition = "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)";
      outerRef.current.style.transform = `scale(${stackIndex === 0 ? 1 : 0.96 - stackIndex * 0.02})`;
    };

    const onTouchStart = (e) => {
      if (isFlying) return;
      const t = e.touches[0];
      gesture.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        dx: 0,
        dy: 0,
        isHorizontal: false,
        decided: false,
      };
    };

    const onTouchMove = (e) => {
      const g = gesture.current;
      if (!g.active || isFlying) return;
      const t = e.touches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;

      if (!g.decided && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        g.decided = true;
        g.isHorizontal = Math.abs(dx) > Math.abs(dy);
      }

      if (!g.decided) return;

      if (g.isHorizontal) {
        e.preventDefault(); // safe because listener is non-passive
        g.dx = dx;
        g.dy = dy;
        setTransform(dx, dy);
        const newStamp = dx > 40 ? "❤️ LIKED" : dx < -40 ? "PASS 💨" : null;
        setStamp(prev => prev !== newStamp ? newStamp : prev);
      }
    };

    const onTouchEnd = (e) => {
      const g = gesture.current;
      if (!g.active) return;
      g.active = false;

      if (!g.decided || !g.isHorizontal) {
        // Tap — flip card
        if (!g.decided) {
          setIsFlipped(f => !f);
        }
        setStamp(null);
        resetTransform();
        return;
      }

      const dx = g.dx;
      setStamp(null);

      if (dx > SWIPE_THRESHOLD) {
        triggerSwipe("right");
      } else if (dx < -SWIPE_THRESHOLD) {
        triggerSwipe("left");
      } else {
        resetTransform();
      }
    };



    // Touch on full card
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isTop, isFlying, stackIndex, triggerSwipe]);

  // ── Mouse handlers for desktop (React events on front face only) ──────────
  const handleMouseDown = useCallback((e) => {
    if (isFlying || e.button !== 0) return;
    gesture.current = { active: true, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, isHorizontal: false, decided: false };
  }, [isFlying]);

  const handleMouseMove = useCallback((e) => {
    const g = gesture.current;
    if (!g.active || isFlying) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.decided && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      g.decided = true;
      g.isHorizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (g.decided && g.isHorizontal) {
      g.dx = dx; g.dy = dy;
      if (outerRef.current) {
        outerRef.current.style.transition = "none";
        outerRef.current.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${dx * 0.08}deg)`;
      }
      const ns = dx > 40 ? "❤️ LIKED" : dx < -40 ? "PASS 💨" : null;
      setStamp(prev => prev !== ns ? ns : prev);
    }
  }, [isFlying]);

  const handleMouseUp = useCallback(() => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    const reset = () => {
      if (outerRef.current) {
        outerRef.current.style.transition = "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)";
        outerRef.current.style.transform = `scale(${stackIndex === 0 ? 1 : 0.96 - stackIndex * 0.02})`;
      }
    };
    if (!g.decided) {
      setIsFlipped(true);
      setStamp(null);
      reset();
      return;
    }
    if (!g.isHorizontal) { setStamp(null); reset(); return; }
    const dx = g.dx;
    setStamp(null);
    if (dx > SWIPE_THRESHOLD) triggerSwipe("right");
    else if (dx < -SWIPE_THRESHOLD) triggerSwipe("left");
    else reset();
  }, [isFlying, stackIndex, triggerSwipe]);

  // ── Checkout ───────────────────────────────────────────────────────────────
  async function handleCopIt(e) {
    e.stopPropagation();
    const isFree = !track.price || track.price === 0;
    if (isFree) {
      if (track.audioUrl) {
        const a = document.createElement('a');
        a.href = track.audioUrl;
        a.download = `${track.title} - ${track.artist}.mp3`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      triggerSwipe("right");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id, trackTitle: track.title, artist: track.artist,
          price: track.price, licenseType: track.licenseType,
          buyerUsername: currentUser?.username || 'anonymous',
          producerUsername: track.uploadedBy || track.artist,
        }),
      });
      const data = await res.json();
      if (data.url) { triggerSwipe("right"); window.location.href = data.url; }
      else triggerSwipe("right");
    } catch { triggerSwipe("right"); }
    finally { setCheckoutLoading(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const priceLabel = (!track.price || track.price === 0) ? "FREE" : `$${track.price}`;
  const isFree = !track.price || track.price === 0;

  const restingTransform = `translateX(0) rotate(0deg) scale(${stackIndex === 0 ? 1 : 0.96 - stackIndex * 0.02})`;

  return (
    <div
      ref={outerRef}
      style={{
        position: "absolute",
        zIndex: 10 - stackIndex,
        width: "100%",
        height: "clamp(380px, 55vh, 500px)",
        perspective: "1000px",
        userSelect: "none",
        willChange: "transform",
        transform: restingTransform,
        transition: "transform 0.25s ease",
      }}
    >
      <div
        ref={cardRef}
        className={`swipe-card ${isTop ? "swipe-card--top" : ""}`}
        style={{
          width: "100%", height: "100%",
          cursor: isTop ? (isFlipped ? "default" : "grab") : "default",
          position: "relative",
          pointerEvents: isTop ? "auto" : "none",
          touchAction: "none", // disable ALL browser gesture handling — we do it ourselves
        }}
      >
        {/* Flip container */}
        <div className="swipe-card__flipper" style={{
          width: "100%", height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>

          {/* ── FRONT FACE ── */}
          <div ref={frontFaceRef} className="swipe-card__face swipe-card__face--front"
            onMouseDown={isTop && !isFlipped ? handleMouseDown : undefined}
            onMouseMove={isTop && !isFlipped ? handleMouseMove : undefined}
            onMouseUp={isTop && !isFlipped ? handleMouseUp : undefined}
            onMouseLeave={isTop && !isFlipped ? handleMouseUp : undefined}
          >
            <div className="swipe-card__cover" style={{ backgroundImage: `url(${track.coverUrl})` }} />
            <div className="swipe-card__overlay" />
            <div className={`price-badge ${isFree ? "price-badge--free" : ""}`}>{priceLabel}</div>

            {track.isSoundCloud ? (
              <div className="swipe-card__sc-embed" onClick={e => e.stopPropagation()}>
                <iframe scrolling="no" frameBorder="no" allow="autoplay" src={track.embedUrl}
                  title="SoundCloud" style={{ width: "100%", height: "80px", border: "none" }} />
              </div>
            ) : (
              <div className="swipe-card__center">
                <WaveformVisualizer isPlaying={isPlaying} progress={progress} />
                <button className="swipe-card__play-btn"
                  onTouchStart={e => e.stopPropagation()}
                  onTouchEnd={e => { e.stopPropagation(); e.preventDefault(); togglePlay(); }}
                  onClick={e => { e.stopPropagation(); e.preventDefault(); togglePlay(); }}
                  aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? "⏸" : "▶"}
                </button>
              </div>
            )}

            <div className="swipe-card__info">
              <div className="swipe-card__artist">{track.artist}</div>
              <div className="swipe-card__title">{track.title}</div>
              <div className="swipe-card__meta">
                <span className="genre-tag">{track.genre}</span>
                {track.bpm > 0 && <span className="bpm-tag">{track.bpm} BPM</span>}
                {track.beatKey && <span className="bpm-tag" style={{ color: "var(--purple)" }}>{track.beatKey}</span>}
              </div>
            </div>

            {stamp && (
              <div className={`swipe-stamp swipe-stamp--${stamp.includes("LIKED") ? "like" : "pass"}`}
                style={{ opacity: 1 }}>{stamp}</div>
            )}
            <div className="swipe-card__progress-bar">
              <div className="swipe-card__progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="swipe-card__tap-hint">tap to flip</div>
          </div>

          {/* ── BACK FACE ── */}
          <div className="swipe-card__face swipe-card__face--back">
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.3)', borderRadius: 'inherit' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '4px' }}>BEAT DETAILS</div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '20px', color: '#fff', marginBottom: '2px' }}>{track.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontFamily: 'var(--font-body)' }}>by {track.artist}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="genre-tag">{track.genre}</span>
                  {track.bpm > 0 && <span className="bpm-tag">{track.bpm} BPM</span>}
                  {track.beatKey && <span className="bpm-tag" style={{ color: 'var(--purple)' }}>{track.beatKey}</span>}
                </div>
                {track.licenseType && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>📄 {track.licenseType}</div>}
                {track.producerNotes && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', lineHeight: 1.4, maxHeight: '48px', overflow: 'hidden' }}>"{track.producerNotes}"</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                  onClick={handleCopIt}
                  disabled={checkoutLoading}
                  style={{ width: '100%', padding: '14px', background: isFree ? 'linear-gradient(135deg, var(--cyan), var(--green))' : 'linear-gradient(135deg, var(--cyan), var(--purple))', border: 'none', borderRadius: '14px', color: '#000', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', cursor: 'pointer', opacity: checkoutLoading ? 0.7 : 1 }}>
                  {checkoutLoading ? "Opening..." : isFree ? "🎁 FREE DOWNLOAD" : `🛒 COP IT — ${priceLabel}`}
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); triggerSwipe("left"); }}
                    style={{ flex: 1, padding: '12px', background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.4)', borderRadius: '12px', color: 'var(--red)', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                    💨 Pass
                  </button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); triggerSwipe("right"); }}
                    style={{ flex: 1, padding: '12px', background: 'rgba(0,245,255,0.15)', border: '1px solid rgba(0,245,255,0.4)', borderRadius: '12px', color: 'var(--cyan)', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                    ❤️ Like
                  </button>
                </div>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setIsFlipped(false); }}
                  style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-head)', fontSize: '13px', cursor: 'pointer' }}>
                  ← Back
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
