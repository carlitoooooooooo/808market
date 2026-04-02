import { useState, useRef, useEffect, useCallback } from "react";

const SNIPPET_DURATION = 30;

export default function SnippetSelector({ file, url, initialStart, onConfirm, onCancel }) {
  const [duration, setDuration] = useState(0);
  const [snippetStart, setSnippetStart] = useState(initialStart || 0);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [waveform, setWaveform] = useState([]);

  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const barRef = useRef(null);
  const dragging = useRef(false);
  const objectUrlRef = useRef(null);

  // Initialize audio - bulletproof version
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Create audio URL
        let audioUrl;
        if (file) {
          // File object - create blob URL
          objectUrlRef.current = URL.createObjectURL(file);
          audioUrl = objectUrlRef.current;
        } else if (url) {
          // Already a URL
          audioUrl = url;
        } else {
          throw new Error("No file or URL provided");
        }

        // Create and load audio element
        const audio = new Audio();
        audioRef.current = audio;
        audio.crossOrigin = "anonymous";
        audio.src = audioUrl;

        // Wait for loadedmetadata
        await new Promise((resolve, reject) => {
          const onLoaded = () => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("error", onError);
            resolve();
          };
          const onError = (err) => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("error", onError);
            reject(new Error(`Audio load failed: ${err.type}`));
          };
          audio.addEventListener("loadedmetadata", onLoaded, { once: true });
          audio.addEventListener("error", onError, { once: true });
        });

        // Audio loaded successfully
        setDuration(audio.duration);
        setSnippetStart(Math.min(initialStart || 0, Math.max(0, audio.duration - SNIPPET_DURATION)));

        // Generate waveform (best effort - don't block on failure)
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          let buffer;

          if (file) {
            buffer = await file.arrayBuffer();
          } else {
            // Try to fetch URL for waveform (if CORS allows)
            try {
              const res = await fetch(audioUrl);
              buffer = await res.arrayBuffer();
            } catch {
              // CORS or fetch failed - use random waveform
              setWaveform(Array.from({ length: 60 }, () => Math.random() * 0.6 + 0.2));
              setLoading(false);
              return;
            }
          }

          const decoded = await ctx.decodeAudioData(buffer);
          const data = decoded.getChannelData(0);
          const bars = 60;
          const step = Math.floor(data.length / bars);
          const samples = Array.from({ length: bars }, (_, i) => {
            let max = 0;
            for (let j = 0; j < step; j++) {
              max = Math.max(max, Math.abs(data[i * step + j] || 0));
            }
            return max;
          });
          setWaveform(samples);
        } catch (err) {
          // Waveform generation failed - use random bars
          console.warn("Waveform generation failed, using placeholder:", err);
          setWaveform(Array.from({ length: 60 }, () => Math.random() * 0.6 + 0.2));
        }

        setLoading(false);
      } catch (err) {
        console.error("Snippet selector init error:", err);
        setError(err.message);
        setLoading(false);
      }
    })();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
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
    if (!audio || duration === 0) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      try {
        audio.currentTime = snippetStart;
        const playPromise = audio.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch((err) => {
            console.error("Play failed:", err);
            setPlaying(false);
          });
        }
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error("Play error:", err);
        setPlaying(false);
      }
    }
  };

  // Update playback position when snippet changes
  useEffect(() => {
    if (playing && audioRef.current) {
      audioRef.current.currentTime = snippetStart;
    }
  }, [snippetStart, playing]);

  // Time conversion
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
        <div>Loading audio...</div>
        <div style={{ fontSize: "12px", marginTop: "8px", color: "rgba(255,255,255,0.3)" }}>This may take a moment depending on file size</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#ff3366", fontFamily: "'Inter', sans-serif" }}>
        <div>❌ Error loading audio</div>
        <div style={{ fontSize: "12px", marginTop: "8px", color: "rgba(255,255,255,0.3)" }}>{error}</div>
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

      {/* Waveform + scrubber */}
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

        {/* Snippet window overlay */}
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
