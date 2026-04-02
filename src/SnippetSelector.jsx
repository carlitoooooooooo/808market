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
  const objectUrlRef = useRef(null);
  const loadedRef = useRef(false);

  // Initialize audio element once
  useEffect(() => {
    // Create audio element
    const audio = new Audio();
    audioRef.current = audio;

    // Prepare audio source
    let source = null;
    if (file) {
      source = URL.createObjectURL(file);
      objectUrlRef.current = source;
      console.log("🎵 Created blob URL for file:", file.name, "Size:", file.size);
    } else if (url) {
      source = url;
      console.log("🎵 Using URL:", url);
    } else {
      setError("No audio file provided");
      setLoading(false);
      return;
    }

    // Set source
    audio.src = source;
    console.log("🎵 Audio element src set");

    // Handler: Audio metadata loaded
    const handleLoadedMetadata = () => {
      if (loadedRef.current) return; // Prevent duplicate calls
      loadedRef.current = true;
      console.log("✅ Metadata loaded. Duration:", audio.duration);
      setDuration(audio.duration);
      setSnippetStart(Math.min(initialStart || 0, Math.max(0, audio.duration - SNIPPET_DURATION)));
      setLoading(false);
    };

    // Handler: Audio error
    const handleError = () => {
      if (loadedRef.current) return; // Already processed
      loadedRef.current = true;
      console.error("❌ Audio error:", audio.error?.code, audio.error?.message);
      setError(`Failed to load audio: ${audio.error?.message || "unknown error"}`);
      setLoading(false);
    };

    // Handler: Audio ended
    const handleEnded = () => {
      console.log("⏹ Audio ended");
      setPlaying(false);
    };

    // Attach listeners
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);

    // Timeout failsafe
    const timeoutId = setTimeout(() => {
      if (!loadedRef.current) {
        console.error("⏱ Timeout: Audio metadata never loaded");
        loadedRef.current = true;
        setError("Audio load timeout - file may be unsupported");
        setLoading(false);
      }
    }, 8000);

    console.log("🎵 Listeners attached, waiting for metadata...");

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [file, url]);

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
    if (!audio || duration === 0) {
      console.warn("⚠ Cannot play: audio not ready or duration is 0");
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      console.log("⏸ Paused");
    } else {
      try {
        audio.currentTime = snippetStart;
        console.log("▶ Playing from:", snippetStart);
        const playPromise = audio.play();
        if (playPromise?.catch) {
          playPromise.catch((err) => {
            console.error("Play error:", err);
            setPlaying(false);
          });
        }
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error("Play exception:", err);
        setPlaying(false);
      }
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
        <div style={{ fontSize: "12px", marginTop: "8px", color: "rgba(255,255,255,0.3)" }}>Check browser console for details</div>
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

      {/* Waveform */}
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
        {/* Waveform bars */}
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

        {/* Snippet overlay */}
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

        {/* Playhead */}
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

      {/* Time labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", marginBottom: "16px" }}>
        <span>{fmt(0)}</span>
        <span style={{ color: "#00f5ff", fontWeight: 600 }}>
          {fmt(snippetStart)} — {fmt(Math.min(snippetStart + SNIPPET_DURATION, duration))}
        </span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Preview button */}
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

      {/* Actions */}
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
