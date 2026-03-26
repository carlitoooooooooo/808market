import React, { useRef, useState, useEffect, useCallback } from "react";
import AudioPlayer from "./AudioPlayer.js";
import WaveformVisualizer from "./WaveformVisualizer.jsx";
import { useAuth } from "./AuthContext.jsx";

const SWIPE_THRESHOLD = 80;

export default function SwipeCard({ track, onSwipe, isTop, stackIndex }) {
  const { currentUser } = useAuth();
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [flyDir, setFlyDir] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const playerRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pointerDownRef = useRef(false);
  const dragStartedRef = useRef(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (track.isSoundCloud) return;
    if (!isTop) {
      stopPlay();
    }
    return () => {
      stopPlay();
    };
  }, [isTop, track.id]);

  function startPlay() {
    stopPlay();
    const p = new AudioPlayer(track.audioUrl, track.snippetStart);
    p.onTimeUpdate((prog) => setProgress(prog));
    p.onEnded(() => { setIsPlaying(false); setProgress(0); });
    playerRef.current = p;
    p.play();
    setIsPlaying(true);
    setProgress(0);
    // Increment play count atomically
    const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
    fetch('https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/rpc/increment_play_count', {
      method: 'POST',
      headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: track.id }),
    }).catch(() => {});
  }

  function stopPlay() {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  }

  function togglePlay() {
    if (!playerRef.current) {
      startPlay();
      return;
    }
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  }

  const triggerSwipe = useCallback((dir) => {
    const label = dir === "right" ? "❤️ LIKED" : "PASS 💨";
    setStamp(label);
    setFlyDir(dir);
    setIsFlying(true);
    stopPlay();
    
    // Haptic feedback immediately on swipe
    try {
      const hapticEnabled = JSON.parse(localStorage.getItem('hapticEnabled') ?? 'true');
      if (hapticEnabled && navigator.vibrate) {
        navigator.vibrate(dir === "right" ? [30] : 10);
      }
    } catch (e) {}
    
    const rect = cardRef.current?.getBoundingClientRect();
    setTimeout(() => {
      onSwipe(dir, track, rect);
    }, 350);
  }, [track, onSwipe]);

  const onPointerDown = useCallback((e) => {
    if (isFlying) return;
    if (isFlipped) return; // back face buttons handle their own events
    pointerDownRef.current = true;
    dragStartedRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isFlying, isFlipped]);

  const onPointerMove = useCallback((e) => {
    if (!pointerDownRef.current || isFlying) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      dragStartedRef.current = true;
    }
    if (dragStartedRef.current) {
      setIsDragging(true);
      setDragX(dx);
      setDragY(dy);
      if (dx > 30) setStamp("❤️ LIKED");
      else if (dx < -30) setStamp("PASS 💨");
      else setStamp(null);
    }
  }, [isFlying]);

  const onPointerUp = useCallback((e) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;

    if (!dragStartedRef.current) {
      // Tap on front face — flip
      setDragX(0);
      setDragY(0);
      setIsDragging(false);
      setStamp(null);
      setIsFlipped(true);
      return;
    }

    const dx = e.clientX - startXRef.current;
    dragStartedRef.current = false;
    setIsDragging(false);

    if (dx > SWIPE_THRESHOLD) {
      triggerSwipe("right");
    } else if (dx < -SWIPE_THRESHOLD) {
      triggerSwipe("left");
    } else {
      setDragX(0);
      setDragY(0);
      setStamp(null);
    }
  }, [triggerSwipe]);

  async function handleCopIt(e) {
    e.stopPropagation();
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
          trackId: track.id,
          trackTitle: track.title,
          artist: track.artist,
          price: track.price,
          licenseType: track.licenseType,
          buyerUsername: currentUser?.username || 'anonymous',
        }),
      });
      const data = await res.json();
      if (data.url) {
        triggerSwipe("right");
        window.location.href = data.url;
      } else {
        if (track.paymentLink) window.open(track.paymentLink, '_blank');
        triggerSwipe("right");
      }
    } catch {
      if (track.paymentLink) window.open(track.paymentLink, '_blank');
      triggerSwipe("right");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const rotation = dragX * 0.08;
  const stampOpacity = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD);

  let flyStyle = {};
  if (isFlying) {
    flyStyle = {
      transform: `translateX(${flyDir === "right" ? "120vw" : "-120vw"}) rotate(${flyDir === "right" ? 30 : -30}deg)`,
      transition: "transform 0.35s cubic-bezier(0.4, 0, 0.6, 1)",
    };
  } else if (isDragging) {
    flyStyle = {
      transform: `translateX(${dragX}px) translateY(${dragY * 0.3}px) rotate(${rotation}deg)`,
    };
  } else {
    flyStyle = {
      transform: `translateX(0) rotate(0deg) scale(${stackIndex === 0 ? 1 : 0.96 - stackIndex * 0.02})`,
      transition: isDragging ? "none" : "transform 0.25s ease",
    };
  }

  // Price display
  const priceLabel = (!track.price || track.price === 0) ? "FREE" : `$${track.price}`;
  const isFree = !track.price || track.price === 0;

  return (
    // Outer: handles fly/drag transform + perspective
    <div
      style={{
        position: "absolute",
        zIndex: 10 - stackIndex,
        width: "100%",
        height: "clamp(380px, 55vh, 500px)",
        perspective: "1000px",
        userSelect: "none",
        ...flyStyle,
      }}
    >
    {/* Inner: captures pointer events when not flipped, transparent when flipped */}
    <div
      ref={cardRef}
      className={`swipe-card ${isTop ? "swipe-card--top" : ""}`}
      style={{
        width: "100%", height: "100%",
        cursor: isTop ? (isFlipped ? "default" : "grab") : "default",
        position: "relative",
        pointerEvents: isFlipped ? "none" : "auto",
      }}
      onPointerDown={isTop ? onPointerDown : undefined}
      onPointerMove={isTop ? onPointerMove : undefined}
      onPointerUp={isTop ? onPointerUp : undefined}
      onPointerCancel={isTop ? onPointerUp : undefined}
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
        <div className="swipe-card__face swipe-card__face--front">
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
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); togglePlay(); }}
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
            <div className={`swipe-stamp swipe-stamp--${dragX > 0 || flyDir === "right" ? "like" : "pass"}`}
              style={{ opacity: isFlying ? 1 : stampOpacity }}>{stamp}</div>
          )}
          <div className="swipe-card__progress-bar">
            <div className="swipe-card__progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>

          {/* Tap hint */}
          <div className="swipe-card__tap-hint">tap to flip</div>
        </div>

        {/* ── BACK FACE ── */}
        <div className="swipe-card__face swipe-card__face--back">
          {/* Blurred cover bg */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.3)', borderRadius: 'inherit' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', justifyContent: 'space-between' }}>
            {/* Header */}
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '4px' }}>BEAT DETAILS</div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '20px', color: '#fff', marginBottom: '2px' }}>{track.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontFamily: 'var(--font-body)' }}>by {track.artist}</div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="genre-tag">{track.genre}</span>
                {track.bpm > 0 && <span className="bpm-tag">{track.bpm} BPM</span>}
                {track.beatKey && <span className="bpm-tag" style={{ color: 'var(--purple)' }}>{track.beatKey}</span>}
              </div>
              {track.licenseType && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>
                  📄 {track.licenseType}
                </div>
              )}
              {track.producerNotes && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', lineHeight: 1.4, maxHeight: '48px', overflow: 'hidden' }}>
                  "{track.producerNotes}"
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={handleCopIt}
                disabled={checkoutLoading}
                style={{
                  width: '100%', padding: '14px',
                  background: isFree ? 'linear-gradient(135deg, var(--cyan), var(--green))' : 'linear-gradient(135deg, var(--cyan), var(--purple))',
                  border: 'none', borderRadius: '14px',
                  color: '#000', fontFamily: 'var(--font-head)', fontWeight: 700,
                  fontSize: '15px', cursor: 'pointer',
                  opacity: checkoutLoading ? 0.7 : 1,
                }}>
                {checkoutLoading ? "Opening..." : isFree ? "🎁 FREE DOWNLOAD" : `🛒 COP IT — ${priceLabel}`}
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onPointerUp={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); triggerSwipe("left"); }}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.4)', borderRadius: '12px', color: 'var(--red)', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  💨 Pass
                </button>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onPointerUp={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); triggerSwipe("right"); }}
                  style={{ flex: 1, padding: '12px', background: 'rgba(0,245,255,0.15)', border: '1px solid rgba(0,245,255,0.4)', borderRadius: '12px', color: 'var(--cyan)', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  ❤️ Like
                </button>
              </div>
              <button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setIsFlipped(false); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', padding: '4px' }}>
                ← flip back
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
