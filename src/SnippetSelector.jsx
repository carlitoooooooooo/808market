import { useState, useRef, useEffect, useCallback } from "react";

const SNIPPET_DURATION = 15;

export default function SnippetSelector({ file, url, onConfirm, onCancel }) {
  const [duration, setDuration] = useState(0);
  const [snippetStart, setSnippetStart] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [waveform, setWaveform] = useState([]);

  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const barRef = useRef(null);
  const dragging = useRef(false);

  // Decode audio + generate waveform
  useEffect(() => {
    const objectUrl = file ? URL.createObjectURL(file) : url;
    const audio = new Audio(objectUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setSnippetStart(0);
      setLoading(false);
    });

    audio.addEventListener('ended', () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    });

    // Generate simple waveform from samples
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferPromise = file ? file.arrayBuffer() : fetch(objectUrl).then(r => r.arrayBuffer());
    bufferPromise.then(buf => ctx.decodeAudioData(buf)).then(decoded => {
      const data = decoded.getChannelData(0);
      const bars = 60;
      const step = Math.floor(data.length / bars);
      const samples = Array.from({ length: bars }, (_, i) => {
        let max = 0;
        for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(data[i * step + j] || 0));
        return max;
      });
      setWaveform(samples);
    }).catch(() => {
      setWaveform(Array.from({ length: 60 }, () => Math.random() * 0.6 + 0.2));
    });

    return () => {
      audio.pause();
      if (file) URL.revokeObjectURL(objectUrl);
      cancelAnimationFrame(rafRef.current);
    };
  }, [file, url]);

  const tick = useCallback(() => {
    if (!audioRef.current) return;
    setPlayhead(audioRef.current.currentTime);
    // Auto-stop at end of snippet
    if (audioRef.current.currentTime >= snippetStart + SNIPPET_DURATION) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [snippetStart]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      audio.currentTime = snippetStart;
      audio.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  // Restart preview when snippet changes
  useEffect(() => {
    if (playing && audioRef.current) {
      audioRef.current.currentTime = snippetStart;
    }
  }, [snippetStart]);

  const getSnippetPct = () => (snippetStart / Math.max(duration - SNIPPET_DURATION, 1));
  const snippetWidthPct = duration > 0 ? (SNIPPET_DURATION / duration) * 100 : 20;

  const handleBarInteraction = (e) => {
    if (!barRef.current || duration === 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const maxStart = Math.max(0, duration - SNIPPET_DURATION);
    const newStart = pct * duration;
    setSnippetStart(Math.min(newStart, maxStart));
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
        Loading audio...
      </div>
    );
  }

  const snippetEndPct = Math.min(100, (getSnippetPct() * 100) + snippetWidthPct);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
        Select your 15s preview
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px', fontFamily: "'Inter', sans-serif" }}>
        Drag the highlighted section to pick which part plays
      </div>

      {/* Waveform + scrubber */}
      <div
        ref={barRef}
        style={{ position: 'relative', height: '72px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', cursor: 'pointer', overflow: 'hidden', marginBottom: '12px', userSelect: 'none' }}
        onMouseDown={(e) => { dragging.current = true; handleBarInteraction(e); }}
        onMouseMove={(e) => { if (dragging.current) handleBarInteraction(e); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onTouchStart={(e) => { dragging.current = true; handleBarInteraction(e); }}
        onTouchMove={(e) => { if (dragging.current) handleBarInteraction(e); e.preventDefault(); }}
        onTouchEnd={() => { dragging.current = false; }}
      >
        {/* Waveform bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '100%', padding: '8px 6px' }}>
          {waveform.map((amp, i) => {
            const pct = (i / waveform.length) * 100;
            const inSnippet = pct >= getSnippetPct() * 100 && pct < snippetEndPct;
            return (
              <div key={i} style={{
                flex: 1, borderRadius: '2px',
                height: `${Math.max(8, amp * 100)}%`,
                background: inSnippet ? '#00f5ff' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.1s',
              }} />
            );
          })}
        </div>

        {/* Snippet window overlay */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${getSnippetPct() * 100}%`,
          width: `${snippetWidthPct}%`,
          background: 'rgba(0,245,255,0.1)',
          border: '2px solid #00f5ff',
          borderRadius: '4px',
          pointerEvents: 'none',
        }} />

        {/* Playhead */}
        {duration > 0 && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(playhead / duration) * 100}%`,
            width: '2px', background: '#fff',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Time labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: '16px' }}>
        <span>{fmt(0)}</span>
        <span style={{ color: '#00f5ff', fontWeight: 600 }}>
          Preview: {fmt(snippetStart)} — {fmt(Math.min(snippetStart + SNIPPET_DURATION, duration))}
        </span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Preview button */}
      <button
        onClick={togglePlay}
        style={{
          width: '100%', padding: '12px', marginBottom: '12px',
          background: playing ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${playing ? '#00f5ff' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '10px', color: playing ? '#00f5ff' : '#fff',
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '14px', cursor: 'pointer',
        }}
      >
        {playing ? '⏸ Stop Preview' : '▶ Preview Snippet'}
      </button>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}>
          Back
        </button>
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.pause();
            onConfirm(Math.round(snippetStart));
          }}
          style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', borderRadius: '10px', color: '#000', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
        >
          Use This Snippet ✓
        </button>
      </div>
    </div>
  );
}
