import React, { useRef, useState, useEffect, useCallback } from "react";
import AudioPlayer from "./AudioPlayer.js";
import WaveformVisualizer from "./WaveformVisualizer.jsx";
import { useAuth } from "./AuthContext.jsx";
import "./SwipeCard.css";

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
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const playerRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pointerDownRef = useRef(false);
  const dragStartedRef = useRef(false);
  const isHorizontalRef = useRef(false);
  const lastXRef = useRef(0);
  const currentDragX = useRef(0);
  const cardRef = useRef(null);
  const outerRef = useRef(null);

  useEffect(() => {
    if (track.isSoundCloud) return;
    if (!isTop) {
      stopPlay();
    }
    return () => {
      stopPlay();
    };
  }, [isTop, track.id]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !isTop) return;
    const handler = (e) => {
      const dx = Math.abs((e.touches[0]?.clientX || 0) - (e.touches[1]?.clientX || e.touches[0]?.clientX || 0));
      if (el._swipingHorizontal) e.preventDefault();
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, [isTop]);

  function startPlay() {
    stopPlay();
    const p = new AudioPlayer(track.audioUrl || null, track.snippetStart, track.id);
    p.onTimeUpdate((prog) => setProgress(prog));
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
    const label = dir === "right" ? "❤️ LIKED" : "💨 PASS";
    setStamp(label);
    setFlyDir(dir);
    setIsFlying(true);
    setTimeout(() => {
      onSwipe(track.id, dir === "right" ? "cops" : "passes");
    }, 100);
  }, [track.id, onSwipe]);

  const handleCopIt = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("Please log in to purchase");
      return;
    }
    const isFree = !track.price || track.price === 0;
    const downloadUrl = track.audioUrl;
    if (isFree && downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${track.title}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
          licenseType: track.licenseType || 'Non-Exclusive Lease',
          buyerUsername: currentUser.username,
          producerUsername: track.uploadedBy,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert('Checkout failed: ' + err.message);
    }
    setCheckoutLoading(false);
  };

  // Swipe/drag handlers
  function onPointerDown(e) {
    if (!isTop || track.isSoundCloud) return;
    pointerDownRef.current = true;
    dragStartedRef.current = false;
    isHorizontalRef.current = false;
    startXRef.current = e.clientX || e.touches?.[0]?.clientX || 0;
    startYRef.current = e.clientY || e.touches?.[0]?.clientY || 0;
    lastXRef.current = startXRef.current;
    currentDragX.current = 0;
  }

  function onPointerMove(e) {
    if (!pointerDownRef.current || !isTop) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    const y = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaX = x - startXRef.current;
    const deltaY = y - startYRef.current;

    if (!dragStartedRef.current) {
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        dragStartedRef.current = true;
        isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      } else {
        return;
      }
    }

    if (!isHorizontalRef.current) return;

    currentDragX.current = deltaX;
    setDragX(deltaX);
    setDragY(deltaY * 0.1);
    setIsDragging(true);

    if (outerRef.current) {
      const angle = (deltaX / window.innerWidth) * 15;
      outerRef.current.style.transform = `translateX(${deltaX}px) translateY(${deltaY * 0.1}px) rotate(${angle}deg)`;
    }
    if (cardRef.current) cardRef.current._swipingHorizontal = true;
  }

  function onPointerUp(e) {
    if (!pointerDownRef.current || !dragStartedRef.current) {
      pointerDownRef.current = false;
      if (Math.abs(currentDragX.current) < 5) {
        // Tap - do nothing on modern card, just close on old design
      }
      return;
    }
    pointerDownRef.current = false;
    dragStartedRef.current = false;

    const threshold = SWIPE_THRESHOLD;
    if (Math.abs(currentDragX.current) > threshold) {
      triggerSwipe(currentDragX.current > 0 ? "right" : "left");
    } else {
      if (outerRef.current) {
        outerRef.current.style.transform = '';
        outerRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
        setTimeout(() => {
          if (outerRef.current) outerRef.current.style.transition = '';
        }, 350);
      }
      setDragX(0);
      setDragY(0);
      setIsDragging(false);
    }
    if (cardRef.current) cardRef.current._swipingHorizontal = false;
  }

  const priceLabel = (!track.price || track.price === 0) ? "FREE" : `$${track.price}`;
  const isFree = !track.price || track.price === 0;

  let flyStyle = {};
  if (isFlying) {
    const dir = flyDir === "right" ? 1 : -1;
    flyStyle = {
      transform: `translateX(${dir * window.innerWidth}px) rotate(${dir * 45}deg) scale(0.8)`,
      transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      opacity: 0,
    };
  } else if (isDragging) {
    flyStyle = { transition: "none" };
  } else if (!isDragging) {
    flyStyle = {
      transform: `translateY(${stackIndex * 12}px) scale(${1 - stackIndex * 0.03})`,
      transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
    };
  }

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
        ...flyStyle,
      }}
    >
      <div
        ref={cardRef}
        className={`swipe-card ${isDragging ? "dragging" : ""} ${isFlying ? "flying" : ""}`}
        style={{
          width: "100%",
          height: "100%",
          cursor: isTop ? "grab" : "default",
          position: "relative",
          pointerEvents: isTop ? "auto" : "none",
          touchAction: isTop ? "pan-y" : "auto",
        }}
        onPointerDown={isTop ? onPointerDown : undefined}
        onPointerMove={isTop ? onPointerMove : undefined}
        onPointerUp={isTop ? onPointerUp : undefined}
        onPointerCancel={isTop ? onPointerUp : undefined}
      >
        {/* Cover Image */}
        <div className="swipe-card-image">
          <img src={track.coverUrl} alt={track.title} />
        </div>

        {/* Info Section */}
        <div className="swipe-card-info">
          <div>
            <div className="swipe-card-title">{track.title}</div>
            <div className="swipe-card-artist">{track.artist}</div>
            
            {/* Badges */}
            <div className="swipe-card-badges">
              <span className="badge genre">{track.genre}</span>
              {track.bpm > 0 && <span className="badge">{track.bpm} BPM</span>}
              {!isFree && <span className="badge price">{priceLabel}</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="swipe-card-buttons">
            <button 
              className="swipe-btn swipe-btn-play"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); togglePlay(); }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸ PLAYING" : "▶ PREVIEW"}
            </button>
            <button 
              className="swipe-btn swipe-btn-info"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); handleCopIt(e); }}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "..." : isFree ? "📥 GET" : "🛒 BUY"}
            </button>
          </div>
        </div>

        {/* Floating Info Panel */}
        <div className="floating-info-panel">
          <div className="stat-row">
            <span className="stat-label">Plays</span>
            <span className="stat-value">{track.cops || 0}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Cops</span>
            <span className="stat-value">{track.passes || 0}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Key</span>
            <span className="stat-value">{track.beatKey || "—"}</span>
          </div>
        </div>

        {/* Stamp Animation */}
        {stamp && (
          <div className={`swipe-stamp ${flyDir === "right" ? "stamp-like" : "stamp-pass"}`}
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}>
            {stamp}
          </div>
        )}

        {/* Progress Bar */}
        {isPlaying && (
          <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
        )}
      </div>
    </div>
  );
}
