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

  console.log("=== SnippetSelector mounted ===");
  console.log("file prop type:", typeof file, "value:", file);
  console.log("url prop type:", typeof url, "value:", url);
  console.log("initialStart:", initialStart);

  useEffect(() => {
    console.log("=== useEffect running ===");

    if (!file && !url) {
      console.error("No file or URL!");
      setError("No audio file provided");
      setLoading(false);
      return;
    }

    // Create audio element
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    console.log("✓ Audio element created");

    // Create source
    let objectUrl = null;
    if (file) {
      console.log("Loading file:", file.name, "Type:", file.type, "Size:", file.size);
      objectUrl = URL.createObjectURL(file);
      console.log("✓ Blob URL created:", objectUrl.substring(0, 50) + "...");
    } else {
      console.log("Using URL:", url);
      objectUrl = url;
    }

    // Set source
    audio.src = objectUrl;
    console.log("✓ Audio src set");

    // Set up event handlers BEFORE loading
    let loaded = false;

    const onMetadata = () => {
      if (loaded) return;
      loaded = true;
      console.log("✅ LOADEDMETADATA event fired!");
      console.log("Duration:", audio.duration);
      setDuration(audio.duration);
      setSnippetStart(Math.min(initialStart || 0, Math.max(0, audio.duration - SNIPPET_DURATION)));
      setLoading(false);
    };

    const onError = () => {
      if (loaded) return;
      loaded = true;
      const code = audio.error?.code;
      const msg = audio.error?.message;
      console.error("❌ ERROR event fired!");
      console.error("Error code:", code, "Message:", msg);
      console.error("ReadyState:", audio.readyState);
      console.error("NetworkState:", audio.networkState);
      setError(`Failed to load audio: ${msg || `Error code ${code}`}`);
      setLoading(false);
    };

    const onCanPlay = () => {
      console.log("🎵 CANPLAY event fired");
    };

    const onCanPlayThrough = () => {
      console.log("🎵 CANPLAYTHROUGH event fired");
    };

    const onLoadStart = () => {
      console.log("🎵 LOADSTART event fired");
    };

    const onLoadedData = () => {
      console.log("🎵 LOADEDDATA event fired, Duration:", audio.duration);
    };

    console.log("✓ Attaching event listeners...");
    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("canplaythrough", onCanPlayThrough);
    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("loadeddata", onLoadedData);

    // Timeout
    const timeoutId = setTimeout(() => {
      if (!loaded) {
        loaded = true;
        console.error("⏱ Timeout: No load event after 10 seconds");
        console.error("ReadyState:", audio.readyState, "NetworkState:", audio.networkState);
        setError("Audio load timeout");
        setLoading(false);
      }
    }, 10000);

    // Cleanup
    return () => {
      console.log("=== Cleanup ===");
      clearTimeout(timeoutId);
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("loadeddata", onLoadedData);
      if (objectUrl && file) {
        URL.revokeObjectURL(objectUrl);
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
    if (!audio || duration === 0) {
      console.warn("Cannot play: audio not ready");
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      try {
        audio.currentTime = snippetStart;
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
        <div style={{ fontSize: "12px", marginTop: "8px", color: "rgba(255,255,255,0.3)" }}>Check browser console (F12)</div>
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
