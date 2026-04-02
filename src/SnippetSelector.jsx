import { useState, useRef, useEffect, useCallback } from "react";

const SNIPPET_DURATION = 30;

export default function SnippetSelector({ file, url, initialStart, onConfirm, onCancel }) {
  const [duration, setDuration] = useState(0);
  const [snippetStart, setSnippetStart] = useState(initialStart || 0);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [waveform] = useState(Array.from({ length: 60 }, () => Math.random() * 0.6 + 0.2));

  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const barRef = useRef(null);
  const dragging = useRef(false);
  const blobUrlRef = useRef(null);
  const metadataLoadedRef = useRef(false);

  // Initialize audio once
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    let audioSource = null;

    // Get audio source - prefer File object (blob URL), fall back to signed URL
    const initAudio = async () => {
      try {
        if (file && (file instanceof File || (file.size && file.type))) {
          // Use File object directly with blob URL
          audioSource = URL.createObjectURL(file);
          blobUrlRef.current = audioSource;
          console.log("Using File object - blob URL created");
        } else if (url) {
          // For URL, get signed version if needed
          if (!url.includes('/sign/') && url.includes('/object/public/')) {
            try {
              const res = await fetch('/api/sign-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl: url }),
              });
              const data = await res.json();
              audioSource = data.signedUrl || url;
              console.log("Got signed URL");
            } catch (e) {
              console.warn('Could not get signed URL, using public URL');
              audioSource = url;
            }
          } else {
            audioSource = url;
          }
        } else {
          throw new Error("No file or URL provided");
        }

        audio.src = audioSource;
        console.log("Audio src set");
      } catch (err) {
        console.error("Init error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initAudio();

    // Event handlers
    const handleLoadedMetadata = () => {
      console.log("Audio loaded. Duration:", audio.duration);
      metadataLoadedRef.current = true;
      setDuration(audio.duration);
      setSnippetStart(Math.min(initialStart || 0, Math.max(0, audio.duration - SNIPPET_DURATION)));
      setLoading(false);
    };

    const handleError = () => {
      console.error("Audio load error:", audio.error?.code, audio.error?.message);
      setError(`Failed to load audio: ${audio.error?.message || "unknown error"}`);
      setLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", () => setPlaying(false));

    const timeoutId = setTimeout(() => {
      if (!metadataLoadedRef.current) {
        console.error("Timeout loading audio");
        setError("Audio load timeout");
        setLoading(false);
      }
    }, 8000);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [file, url, initialStart]);

  const tick = useCallback(() => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setPlayhead(t);
    if (t >= snippetStart + SNIPPET_DURATION) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [snippetStart]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      // Seek to start time if ready, otherwise wait
      if (audio.readyState >= 2 && isFinite(audio.duration)) {
        audio.currentTime = snippetStart;
        audio.play().catch(err => console.error("Play error:", err));
      } else {
        const onCanPlay = () => {
          audio.removeEventListener("canplay", onCanPlay);
          audio.currentTime = snippetStart;
          audio.play().catch(err => console.error("Play error:", err));
        };
        audio.addEventListener("canplay", onCanPlay, { once: true });
      }
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    if (playing && audioRef.current) {
      audioRef.current.currentTime = snippetStart;
    }
  }, [snippetStart, playing]);

  const toBarPct = (seconds) => (duration > 0 ? (seconds / duration) * 100 : 0);
  const snippetLeftPct = toBarPct(snippetStart);
  const snippetWidthPct = toBarPct(SNIPPET_DURATION);
  const playheadPct = toBarPct(playhead);

  const handleBarInteraction = (e) => {
    if (!barRef.current || duration === 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawStart = pct * duration;
    const maxStart = Math.max(0, duration - SNIPPET_DURATION);
    const centeredStart = rawStart - SNIPPET_DURATION / 2;
    setSnippetStart(Math.max(0, Math.min(centeredStart, maxStart)));
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
        <div>⏳ Loading audio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#ff3366", fontFamily: "'Inter', sans-serif" }}>
        <div>❌ {error}</div>
        <button
          onClick={onCancel}
          style={{ marginTop: "16px", padding: "10px 20px", background: "#ff3366", border: "none", borderRadius: "8px", color: "#000", fontWeight: 700, cursor: "pointer" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>
        Select your 30s preview
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px", fontFamily: "'Inter', sans-serif" }}>
        Drag or click to pick which part plays as the preview
      </div>

      <div
        ref={barRef}
        style={{
          position: "relative",
          height: "72px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "10px",
          cursor: "pointer",
          overflow: "hidden",
          marginBottom: "12px",
          userSelect: "none",
          touchAction: "none",
        }}
        onMouseDown={(e) => {
          dragging.current = true;
          handleBarInteraction(e);
        }}
        onMouseMove={(e) => {
          if (dragging.current) handleBarInteraction(e);
        }}
        onMouseUp={() => {
          dragging.current = false;
        }}
        onMouseLeave={() => {
          dragging.current = false;
        }}
        onTouchStart={(e) => {
          dragging.current = true;
          handleBarInteraction(e);
          e.preventDefault();
        }}
        onTouchMove={(e) => {
          if (dragging.current) {
            handleBarInteraction(e);
            e.preventDefault();
          }
        }}
        onTouchEnd={() => {
          dragging.current = false;
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "100%", padding: "8px 6px" }}>
          {waveform.map((amp, i) => {
            const barPct = (i / waveform.length) * 100;
            const inSnippet = barPct >= snippetLeftPct && barPct < snippetLeftPct + snippetWidthPct;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: "2px",
                  height: `${Math.max(8, amp * 100)}%`,
                  background: inSnippet ? "#00f5ff" : "rgba(255,255,255,0.15)",
                  transition: "background 0.08s",
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${snippetLeftPct}%`,
            width: `${snippetWidthPct}%`,
            background: "rgba(0,245,255,0.08)",
            border: "2px solid #00f5ff",
            borderRadius: "4px",
            pointerEvents: "none",
          }}
        />

        {duration > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${playheadPct}%`,
              width: "2px",
              background: "#fff",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", marginBottom: "16px" }}>
        <span>{fmt(0)}</span>
        <span style={{ color: "#00f5ff", fontWeight: 600 }}>
          {fmt(snippetStart)} — {fmt(Math.min(snippetStart + SNIPPET_DURATION, duration))}
        </span>
        <span>{fmt(duration)}</span>
      </div>

      <button
        onClick={togglePlay}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "12px",
          background: playing ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${playing ? "#00f5ff" : "rgba(255,255,255,0.15)"}`,
          borderRadius: "10px",
          color: playing ? "#00f5ff" : "#fff",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        {playing ? "⏸ Stop Preview" : "▶ Preview Snippet"}
      </button>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "12px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "10px",
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.pause();
            setPlaying(false);
            onConfirm(Math.round(snippetStart));
          }}
          style={{
            flex: 2,
            padding: "12px",
            background: "linear-gradient(135deg, #00f5ff, #bf5fff)",
            border: "none",
            borderRadius: "10px",
            color: "#000",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Use This Snippet ✓
        </button>
      </div>
    </div>
  );
}
