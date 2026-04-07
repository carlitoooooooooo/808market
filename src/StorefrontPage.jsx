import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import BannerCropper from "./BannerCropper.jsx";
import StickyAudioPlayer from "./StickyAudioPlayer.jsx";
import { supabase } from "./supabase.js";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

const db = (path) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
}).then(r => r.json());

const dbPatch = (path, body) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  method: 'PATCH',
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const dbPost = (path, body) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify(body),
}).then(r => r.json());

const ACCENT_COLORS = ['#00f5ff', '#bf5fff', '#ff3366', '#00ff88', '#ffd700', '#ff9900', '#ff64c8', '#4080ff'];
const BG_OPTIONS = [
  { value: '#0a0a0a', label: 'Black', preview: '#0a0a0a', text: '#666' },
  { value: '#080818', label: 'Midnight', preview: 'linear-gradient(135deg, #080818, #12103a)', text: '#6060cc' },
  { value: '#0a0818', label: 'Deep Purple', preview: 'linear-gradient(135deg, #0a0818, #1a0a2e)', text: '#8040cc' },
  { value: '#080f18', label: 'Navy', preview: 'linear-gradient(135deg, #080f18, #0a1a30)', text: '#4080cc' },
  { value: '#080f0c', label: 'Forest', preview: 'linear-gradient(135deg, #080f0c, #0a1e12)', text: '#40aa60' },
  { value: '#120808', label: 'Crimson', preview: 'linear-gradient(135deg, #120808, #2a0a0a)', text: '#cc4040' },
  { value: '#120c06', label: 'Ember', preview: 'linear-gradient(135deg, #120c06, #2a1806)', text: '#cc8040' },
  { value: '#0f0a12', label: 'Plum', preview: 'linear-gradient(135deg, #0f0a12, #1e0a2a)', text: '#aa50cc' },
  { value: '#060f12', label: 'Teal', preview: 'linear-gradient(135deg, #060f12, #081e24)', text: '#40aacc' },
  { value: '#0a100a', label: 'Jungle', preview: 'linear-gradient(135deg, #0a100a, #141e10)', text: '#60cc60' },
  { value: '#12100a', label: 'Gold', preview: 'linear-gradient(135deg, #12100a, #241e08)', text: '#ccaa40' },
  { value: '#10080f', label: 'Rose', preview: 'linear-gradient(135deg, #10080f, #20081e)', text: '#cc50aa' },
];

function SectionHeader({ label, accent }) {
  return (
    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', color: accent, borderLeft: `3px solid ${accent}`, paddingLeft: '10px', marginBottom: '16px' }}>
      {label}
    </div>
  );
}

function BeatCard({ beat, accent, onBuy, cardStyle, onPlayTrack, onStopTrack }) {
  const isFree = !beat.price || beat.price === 0;
  const cardBg = cardStyle === 'glass' ? 'rgba(255,255,255,0.08)' : cardStyle === 'minimal' ? 'transparent' : cardStyle === 'bordered' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)';
  const cardBorder = cardStyle === 'bordered' ? `2px solid ${accent}40` : cardStyle === 'minimal' ? 'none' : '1px solid rgba(255,255,255,0.08)';
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef(null);
  const currentUrlRef = React.useRef(null);

  // Check if audio URL is playable (not SoundCloud)
  const audioUrl = beat.audio_url || beat.audioUrl;
  const isPlayable = audioUrl && !audioUrl.includes('soundcloud.com');

  // Create audio element once
  React.useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const handleEnded = () => setPlaying(false);
    const handleError = () => {
      console.error('Audio error:', audio.error?.code);
      setPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!isPlayable || !audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      if (onStopTrack) onStopTrack();
    } else {
      if (onPlayTrack) onPlayTrack(beat);
      // Get signed URL
      const getSignedUrl = async () => {
        if (!audioUrl || audioUrl.includes('/sign/') || !audioUrl.includes('/object/public/')) {
          return audioUrl;
        }
        try {
          const res = await fetch('/api/sign-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl }),
          });
          const data = await res.json();
          return data.signedUrl || audioUrl;
        } catch (e) {
          console.warn('Could not get signed URL');
          return audioUrl;
        }
      };

      getSignedUrl().then(signedUrl => {
        const audio = audioRef.current;
        if (!audio) return;

        // Only set src if it changed
        if (currentUrlRef.current !== signedUrl) {
          audio.pause();
          audio.src = signedUrl;
          currentUrlRef.current = signedUrl;
        }

        const startTime = beat.snippet_start || beat.snippetStart || 0;
        
        // Load metadata first (required for mobile), then seek and play
        audio.load(); // Load the audio resource to ensure metadata is available
        
        if (audio.readyState >= 2 && isFinite(audio.duration)) {
          audio.currentTime = startTime;
          try {
            audio.play().catch(err => {
              console.warn('Play deferred:', err);
              // Mobile may require user gesture - wait for canplay
              const onCanPlay = () => {
                audio.removeEventListener("canplay", onCanPlay);
                audio.play().catch(e => console.error('Final play error:', e));
              };
              audio.addEventListener("canplay", onCanPlay, { once: true });
            });
          } catch (err) {
            console.error('Play error:', err);
          }
        } else {
          const onCanPlay = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.currentTime = startTime;
            try {
              audio.play().catch(err => console.error('Play error:', err));
            } catch (err) {
              console.error('Play error:', err);
            }
          };
          audio.addEventListener("canplay", onCanPlay, { once: true });
        }

        setPlaying(true);
      });
    }
  };

  return (
    <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}70`}
      onMouseLeave={e => e.currentTarget.style.borderColor = cardStyle === 'bordered' ? `${accent}40` : 'rgba(255,255,255,0.08)'}
    >
      <div style={{ height: '120px', backgroundImage: `url(${beat.coverUrl || beat.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
        {/* Play button - only for playable audio (not SoundCloud) */}
        {isPlayable && (
          <button onClick={togglePlay} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: playing ? accent : 'rgba(0,0,0,0.6)', border: `2px solid ${accent}`, borderRadius: '50%', width: '40px', height: '40px', color: playing ? '#000' : accent, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            {playing ? '⏸' : '▶'}
          </button>
        )}
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', gap: '4px' }}>
          {beat.genre && <span style={{ background: 'rgba(0,0,0,0.7)', color: accent, fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontFamily: 'var(--font-head)', fontWeight: 700 }}>{beat.genre}</span>}
          {beat.bpm > 0 && <span style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontFamily: 'var(--font-body)' }}>{beat.bpm} BPM</span>}
        </div>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{beat.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: isFree ? accent : '#00ff88' }}>{isFree ? 'FREE' : `$${beat.price}`}</span>
          <button onClick={() => onBuy(beat)} style={{ background: accent, color: '#000', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
            {isFree ? '⬇️ Free' : '🛒 Buy'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListingCard({ listing, accent, onBuy, onDelete, isOwner }) {
  const typeLabel = listing.type === 'open_verse' ? '🎤 Open Verse' : '⭐ Feature';
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef(null);
  const currentUrlRef = React.useRef(null);

  // Check if audio URL is playable (not SoundCloud)
  const isPlayable = listing.audio_url && !listing.audio_url.includes('soundcloud.com');

  // Create audio element once
  React.useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const handleEnded = () => setPlaying(false);
    const handleError = () => {
      console.error('Audio error:', audio.error?.code);
      setPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!isPlayable || !audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      // Get signed URL
      const getSignedUrl = async () => {
        if (!listing.audio_url || listing.audio_url.includes('/sign/') || !listing.audio_url.includes('/object/public/')) {
          return listing.audio_url;
        }
        try {
          const res = await fetch('/api/sign-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl: listing.audio_url }),
          });
          const data = await res.json();
          return data.signedUrl || listing.audio_url;
        } catch (e) {
          console.warn('Could not get signed URL');
          return listing.audio_url;
        }
      };

      getSignedUrl().then(signedUrl => {
        const audio = audioRef.current;
        if (!audio) return;

        // Only set src if it changed
        if (currentUrlRef.current !== signedUrl) {
          audio.pause();
          audio.src = signedUrl;
          currentUrlRef.current = signedUrl;
        }

        // Load metadata first (required for mobile), then seek and play
        audio.load(); // Load the audio resource to ensure metadata is available
        
        if (audio.readyState >= 2 && isFinite(audio.duration)) {
          audio.currentTime = 0;
          try {
            audio.play().catch(err => {
              console.warn('Play deferred:', err);
              // Mobile may require user gesture - wait for canplay
              const onCanPlay = () => {
                audio.removeEventListener("canplay", onCanPlay);
                audio.play().catch(e => console.error('Final play error:', e));
              };
              audio.addEventListener("canplay", onCanPlay, { once: true });
            });
          } catch (err) {
            console.error('Play error:', err);
          }
        } else {
          const onCanPlay = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.currentTime = 0;
            try {
              audio.play().catch(err => console.error('Play error:', err));
            } catch (err) {
              console.error('Play error:', err);
            }
          };
          audio.addEventListener("canplay", onCanPlay, { once: true });
        }

        setPlaying(true);
      });
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {listing.cover_url ? (
        <div style={{ height: '100px', backgroundImage: `url(${listing.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          {isPlayable && (
            <button onClick={togglePlay} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: playing ? accent : 'rgba(0,0,0,0.6)', border: `2px solid ${accent}`, borderRadius: '50%', width: '36px', height: '36px', color: playing ? '#000' : accent, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playing ? '⏸' : '▶'}
            </button>
          )}
        </div>
      ) : listing.audio_url ? (
        <div style={{ height: '60px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={togglePlay} style={{ background: playing ? accent : 'rgba(0,0,0,0.4)', border: `2px solid ${accent}`, borderRadius: '50%', width: '36px', height: '36px', color: playing ? '#000' : accent, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playing ? '⏸' : '▶'}
          </button>
        </div>
      ) : null}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ background: `${accent}22`, color: accent, fontSize: '10px', padding: '2px 8px', borderRadius: '8px', fontFamily: 'var(--font-head)', fontWeight: 700 }}>{typeLabel}</span>
          {listing.genre && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'var(--font-body)' }}>{listing.genre}</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{listing.title}</div>
        {listing.description && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)', marginBottom: '8px', lineHeight: 1.4 }}>{listing.description}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: '#00ff88' }}>${listing.price}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {isOwner && <button onClick={() => onDelete && onDelete(listing.id)} style={{ background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366', borderRadius: '8px', padding: '5px 8px', fontSize: '11px', cursor: 'pointer' }}>🗑</button>}
            <button onClick={() => onBuy(listing)} style={{ background: accent, color: '#000', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
              🛒 Book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrumkitCard({ kit, accent, onBuy, isOwner, onDelete }) {
  const isFree = !kit.price || kit.price === 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kit.name}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
          🥁 Drum Kit · <span style={{ color: isFree ? accent : '#00ff88', fontWeight: 700 }}>{isFree ? 'FREE' : `$${kit.price}`}</span>
        </div>
        {kit.description && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kit.description}</div>}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        {isFree ? (
          <button onClick={async () => {
            let url = kit.file_url;
            try {
              const r = await fetch('/api/sign-audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl: kit.file_url }) });
              const d = await r.json();
              if (d.signedUrl) url = d.signedUrl;
            } catch {}
            const a = document.createElement('a');
            a.href = url;
            a.download = kit.name;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }} style={{ background: accent, color: '#000', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)', whiteSpace: 'nowrap' }}>
            ⬇️ Free
          </button>
        ) : (
          <button onClick={() => onBuy && onBuy({ ...kit, title: kit.name, artist: kit.uploaded_by_username, type: 'drumkit' })}
            style={{ background: `linear-gradient(135deg, ${accent}, #bf5fff)`, color: '#000', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)', whiteSpace: 'nowrap' }}>
            🛒 Buy
          </button>
        )}
        {isOwner && onDelete && (
          <button onClick={onDelete} style={{ background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', cursor: 'pointer' }}>
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

const CARD_STYLES = [
  { value: 'default', label: 'Default' },
  { value: 'glass', label: 'Glass' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bordered', label: 'Bordered' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'solid', label: 'Solid' },
];

const BADGE_FRAMES = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'pill', label: 'Pill' },
  { value: 'outlined', label: 'Outlined' },
];

const TEXT_ALIGNMENTS = [
  { value: 'left', label: 'Left', icon: '◄' },
  { value: 'center', label: 'Center', icon: '■' },
  { value: 'right', label: 'Right', icon: '►' },
];

const FONT_STYLES = [
  { value: 'default', label: 'Default', family: 'var(--font-head)' },
  { value: 'mono', label: 'Mono', family: "'Space Mono', monospace" },
  { value: 'serif', label: 'Serif', family: 'Georgia, serif' },
  { value: 'rounded', label: 'Rounded', family: "'Nunito', 'Space Grotesk', sans-serif" },
  { value: 'geometric', label: 'Geometric', family: "'Montserrat', sans-serif" },
  { value: 'sans-bold', label: 'Bold Sans', family: "'Arial Black', sans-serif" },
];

const SECTION_LABELS = { beats: '🎵 Beats', open_verses: '🎤 Open Verses', features: '⭐ Features', drumkits: '🥁 Drum Kits' };

function SectionOrderEditor({ order, setOrder }) {
  const move = (i, dir) => {
    const arr = [...order];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setOrder(arr);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {order.map((sec, i) => (
        <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ flex: 1, fontSize: '13px', fontFamily: 'var(--font-body)' }}>{SECTION_LABELS[sec] || sec}</span>
          <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', cursor: i === 0 ? 'default' : 'pointer', fontSize: '14px' }}>↑</button>
          <button onClick={() => move(i, 1)} disabled={i === order.length - 1} style={{ background: 'none', border: 'none', color: i === order.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', cursor: i === order.length - 1 ? 'default' : 'pointer', fontSize: '14px' }}>↓</button>
        </div>
      ))}
    </div>
  );
}

function EditorField({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Editor Modal ────────────────────────────────────────────────────────────
function StorefrontEditor({ storefront, username, beats, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(storefront?.display_name || '');
  const [tagline, setTagline] = useState(storefront?.tagline || '');
  const [aboutBio, setAboutBio] = useState(storefront?.about_bio || '');
  const [accent, setAccent] = useState(storefront?.accent_color || '#00f5ff');
  const [bg, setBg] = useState(storefront?.bg_color || '#0a0a0a');
  // ensure bg is always a valid option value
  const [cardStyle, setCardStyle] = useState(storefront?.card_style || 'default');
  const [badgeFrame, setBadgeFrame] = useState(storefront?.badge_frame || 'rounded');
  const [fontStyle, setFontStyle] = useState(storefront?.font_style || 'default');
  const [textAlign, setTextAlign] = useState(storefront?.text_align || 'left');
  const [showStats, setShowStats] = useState(storefront?.show_stats !== false);
  const [gridLayout, setGridLayout] = useState(storefront?.grid_layout !== false);
  const [sectionOrder, setSectionOrder] = useState(() => {
    try { return JSON.parse(storefront?.section_order || '["beats","open_verses","features","drumkits"]'); }
    catch { return ['beats', 'open_verses', 'features', 'drumkits']; }
  });
  const [sectionVisibility, setSectionVisibility] = useState(() => {
    try { return JSON.parse(storefront?.section_visibility || '{"beats":true,"open_verses":true,"features":true,"drumkits":true}'); }
    catch { return { beats: true, open_verses: true, features: true, drumkits: true }; }
  });
  const [customSectionTitles, setCustomSectionTitles] = useState(() => {
    try { return JSON.parse(storefront?.custom_section_titles || '{}'); }
    catch { return {}; }
  });
  const [ctaButtonText, setCtaButtonText] = useState(storefront?.cta_button_text || 'Explore');
  const [featuredBeatId, setFeaturedBeatId] = useState(storefront?.featured_beat_id || '');
  const [instagram, setInstagram] = useState(storefront?.instagram || '');
  const [twitter, setTwitter] = useState(storefront?.twitter || '');
  const [soundcloud, setSoundcloud] = useState(storefront?.soundcloud || '');
  const [youtube, setYoutube] = useState(storefront?.youtube || '');
  const [bioLink, setBioLink] = useState(storefront?.bio_link || '');
  const [bioLinkLabel, setBioLinkLabel] = useState(storefront?.bio_link_label || '');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(storefront?.banner_url || null);
  const [cropFile, setCropFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState(null);
  const [stickyPlayerIsPlaying, setStickyPlayerIsPlaying] = useState(false);
  const bannerRef = useRef(null);

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCropFile(file);
    bannerRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    let banner_url = storefront?.banner_url || null;
    if (bannerFile) {
      const ext = bannerFile.name.split('.').pop();
      const path = `banners/${username}_${Date.now()}.${ext}`;
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/covers/${path}`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': bannerFile.type },
        body: bannerFile,
      });
      if (res.ok) banner_url = `${SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
    }
    const payload = {
      username, display_name: displayName, tagline, about_bio: aboutBio,
      accent_color: accent, bg_color: bg, banner_url, is_public: true,
      card_style: cardStyle, badge_frame: badgeFrame, font_style: fontStyle,
      text_align: textAlign, show_stats: showStats, grid_layout: gridLayout,
      section_order: JSON.stringify(sectionOrder),
      section_visibility: JSON.stringify(sectionVisibility),
      custom_section_titles: JSON.stringify(customSectionTitles),
      cta_button_text: ctaButtonText,
      featured_beat_id: featuredBeatId || null,
      instagram, twitter, soundcloud, youtube, bio_link: bioLink, bio_link_label: bioLinkLabel,
    };
    let updated;
    if (storefront) {
      await dbPatch(`storefronts?username=eq.${encodeURIComponent(username)}`, payload);
      updated = { ...storefront, ...payload };
    } else {
      const result = await dbPost('storefronts', payload);
      updated = Array.isArray(result) ? result[0] : result;
    }
    setSaving(false);
    onSave(updated);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 900, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px 20px', width: '100%', maxWidth: '480px', marginTop: '20px', marginBottom: '40px' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', marginBottom: '20px' }}>✏️ Customize Storefront</div>

        {/* Banner */}
        <EditorField label="Banner Image">
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />
          {bannerPreview ? (
            <div style={{ position: 'relative', height: '80px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => bannerRef.current?.click()}>
              <img src={bannerPreview} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontFamily: 'var(--font-head)' }}>Change Banner</div>
            </div>
          ) : (
            <button type="button" onClick={() => bannerRef.current?.click()}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
              🖼 Upload Banner Image
            </button>
          )}
        </EditorField>

        <EditorField label="Display Name">
          <input className="auth-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={username} maxLength={40} />
        </EditorField>

        <EditorField label="Tagline">
          <input className="auth-input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Beats. Vibes. Culture." maxLength={80} />
        </EditorField>

        <EditorField label="About Bio">
          <textarea className="auth-input" value={aboutBio} onChange={e => setAboutBio(e.target.value)} placeholder="Tell visitors about yourself..." maxLength={300} rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </EditorField>

        {/* Featured Beat */}
        {beats && beats.length > 0 && (
          <EditorField label="⭐ Featured Beat">
            <select className="auth-input" value={featuredBeatId} onChange={e => setFeaturedBeatId(e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">None</option>
              {beats.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </EditorField>
        )}

        {/* Section Order */}
        <EditorField label="Section Order">
          <SectionOrderEditor order={sectionOrder} setOrder={setSectionOrder} />
        </EditorField>

        {/* Card Style */}
        <EditorField label="Card Style">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CARD_STYLES.map(s => (
              <button key={s.value} type="button" onClick={() => setCardStyle(s.value)}
                style={{ padding: '7px 14px', borderRadius: '20px', border: `2px solid ${cardStyle === s.value ? accent : 'rgba(255,255,255,0.15)'}`, background: cardStyle === s.value ? `${accent}20` : 'transparent', color: cardStyle === s.value ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
                {s.label}
              </button>
            ))}
          </div>
        </EditorField>

        {/* Font Style */}
        <EditorField label="Font Style">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FONT_STYLES.map(f => (
              <button key={f.value} type="button" onClick={() => setFontStyle(f.value)}
                style={{ padding: '7px 14px', borderRadius: '20px', border: `2px solid ${fontStyle === f.value ? accent : 'rgba(255,255,255,0.15)'}`, background: fontStyle === f.value ? `${accent}20` : 'transparent', color: fontStyle === f.value ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: f.family }}>
                {f.label}
              </button>
            ))}
          </div>
        </EditorField>

        {/* Badge Frame Style */}
        <EditorField label="Badge Style">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {BADGE_FRAMES.map(b => (
              <button key={b.value} type="button" onClick={() => setBadgeFrame(b.value)}
                style={{ padding: '7px 14px', borderRadius: '20px', border: `2px solid ${badgeFrame === b.value ? accent : 'rgba(255,255,255,0.15)'}`, background: badgeFrame === b.value ? `${accent}20` : 'transparent', color: badgeFrame === b.value ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
                {b.label}
              </button>
            ))}
          </div>
        </EditorField>

        {/* Text Alignment */}
        <EditorField label="Text Alignment">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TEXT_ALIGNMENTS.map(t => (
              <button key={t.value} type="button" onClick={() => setTextAlign(t.value)}
                style={{ padding: '7px 14px', borderRadius: '20px', border: `2px solid ${textAlign === t.value ? accent : 'rgba(255,255,255,0.15)'}`, background: textAlign === t.value ? `${accent}20` : 'transparent', color: textAlign === t.value ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </EditorField>

        {/* CTA Button Text */}
        <EditorField label="Call-to-Action Button Text">
          <input className="auth-input" value={ctaButtonText} onChange={e => setCtaButtonText(e.target.value)} placeholder="Explore" maxLength={30} />
        </EditorField>

        {/* Section Visibility */}
        <EditorField label="Section Visibility">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.keys(sectionVisibility).map(section => (
              <button key={section} type="button" onClick={() => setSectionVisibility(prev => ({ ...prev, [section]: !prev[section] }))}
                style={{ padding: '8px 12px', background: sectionVisibility[section] ? `${accent}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${sectionVisibility[section] ? `${accent}40` : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', color: sectionVisibility[section] ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-head)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: sectionVisibility[section] ? accent : 'rgba(255,255,255,0.3)' }}>{sectionVisibility[section] ? '👁️' : '👁️‍🗨️'}</span>
                {SECTION_LABELS[section] || section}
              </button>
            ))}
          </div>
        </EditorField>

        {/* Custom Section Titles */}
        <EditorField label="Custom Section Titles (Optional)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['beats', 'open_verses', 'features', 'drumkits'].map(section => (
              <input key={section} className="auth-input" value={customSectionTitles[section] || ''} 
                onChange={e => setCustomSectionTitles(prev => ({ ...prev, [section]: e.target.value }))}
                placeholder={`Custom ${SECTION_LABELS[section] || section} title...`} maxLength={50} />
            ))}
          </div>
        </EditorField>

        {/* Layout Options */}
        <EditorField label="Layout">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setGridLayout(true)}
              style={{ flex: 1, padding: '7px 14px', borderRadius: '20px', border: `2px solid ${gridLayout ? accent : 'rgba(255,255,255,0.15)'}`, background: gridLayout ? `${accent}20` : 'transparent', color: gridLayout ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
              📊 Grid
            </button>
            <button type="button" onClick={() => setGridLayout(false)}
              style={{ flex: 1, padding: '7px 14px', borderRadius: '20px', border: `2px solid ${!gridLayout ? accent : 'rgba(255,255,255,0.15)'}`, background: !gridLayout ? `${accent}20` : 'transparent', color: !gridLayout ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
              📝 List
            </button>
          </div>
        </EditorField>

        {/* Show Stats Toggle */}
        <EditorField label="Display Stats">
          <button type="button" onClick={() => setShowStats(!showStats)}
            style={{ width: '100%', padding: '7px 14px', borderRadius: '20px', border: `2px solid ${showStats ? accent : 'rgba(255,255,255,0.15)'}`, background: showStats ? `${accent}20` : 'transparent', color: showStats ? accent : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
            {showStats ? '✓ Show Beat Stats' : '✗ Hide Beat Stats'}
          </button>
        </EditorField>



        {/* Accent Color */}
        <EditorField label="Accent Color">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACCENT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setAccent(c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: `3px solid ${accent === c ? '#fff' : 'transparent'}`, cursor: 'pointer' }} />
            ))}
          </div>
        </EditorField>

        {/* Background */}
        <EditorField label="Background">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {BG_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setBg(opt.value)}
                style={{
                  width: '72px', height: '52px', borderRadius: '10px',
                  background: opt.preview, border: `2px solid ${bg === opt.value ? '#fff' : 'rgba(255,255,255,0.15)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  paddingBottom: '5px', transition: 'border-color 0.15s',
                  boxShadow: bg === opt.value ? '0 0 0 2px rgba(255,255,255,0.3)' : 'none',
                }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 700, color: opt.text, letterSpacing: '0.5px' }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </EditorField>

        {/* Social Links */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase' }}>Social Links</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input className="auth-input" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="📸 Instagram handle" maxLength={50} />
            <input className="auth-input" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="🐦 Twitter/X handle" maxLength={50} />
            <input className="auth-input" value={soundcloud} onChange={e => setSoundcloud(e.target.value)} placeholder="☁️ SoundCloud username" maxLength={50} />
            <input className="auth-input" value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="▶️ YouTube channel" maxLength={50} />
            <input className="auth-input" value={bioLink} onChange={e => setBioLink(e.target.value)} placeholder="🔗 Custom link URL" maxLength={200} />
            <input className="auth-input" value={bioLinkLabel} onChange={e => setBioLinkLabel(e.target.value)} placeholder="🔗 Link label (e.g. My Website)" maxLength={50} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: `linear-gradient(135deg, ${accent}, #bf5fff)`, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      {cropFile && (
        <BannerCropper
          file={cropFile}
          onCrop={(croppedFile) => { setBannerFile(croppedFile); setBannerPreview(URL.createObjectURL(croppedFile)); setCropFile(null); }}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}

// ─── Artist Listing Upload ────────────────────────────────────────────────────
function ListingUpload({ username, userId, accent, onClose, onAdded }) {
  const [type, setType] = useState('open_verse');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [bpm, setBpm] = useState('');
  const [price, setPrice] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [myDrumkits, setMyDrumkits] = useState([]);
  const [selectedKitId, setSelectedKitId] = useState('');
  const [kitMode, setKitMode] = useState('existing'); // 'existing' | 'new'
  const [kitName, setKitName] = useState('');
  const [kitPrice, setKitPrice] = useState('');
  const [kitFile, setKitFile] = useState(null);
  const [kitProgress, setKitProgress] = useState(0);
  const audioRef = useRef(null);
  const coverRef = useRef(null);
  const kitFileRef = useRef(null);

  const GENRES = ['Hip-Hop', 'Drill', 'Trap', 'R&B', 'Electronic', 'Other'];

  // Load drumkits when type switches to drumkit
  useEffect(() => {
    if (type !== 'drumkit' || myDrumkits.length > 0) return;
    fetch(`${SUPABASE_URL}/rest/v1/drumkits?uploaded_by_username=eq.${encodeURIComponent(username)}&select=id,name,file_url,price,description`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(data => { if (Array.isArray(data)) setMyDrumkits(data); }).catch(() => {});
  }, [type, username]);

  const handleSubmit = async () => {
    if (type === 'drumkit') {
      if (kitMode === 'existing') {
        if (!selectedKitId) return setError('Select a drumkit');
        const kit = myDrumkits.find(k => String(k.id) === selectedKitId);
        if (!kit) return setError('Drumkit not found');
        try {
          setUploading(true);
          const listing = await dbPost('artist_listings', {
            seller_username: username, type: 'drumkit', title: kit.name,
            description: kit.description || '', price: kit.price || 0,
            audio_url: kit.file_url, cover_url: null, is_active: true, bpm: null, genre: 'Other',
          });
          onAdded(Array.isArray(listing) ? { ...listing[0], audio_url: kit.file_url } : { ...listing, audio_url: kit.file_url });
          onClose();
        } catch (err) { setError('Failed: ' + err.message); }
        setUploading(false);
      } else {
        // Upload new kit
        if (!kitFile) return setError('Select a .zip or .rar file');
        if (!kitName.trim()) return setError('Name is required');
        setUploading(true); setKitProgress(0);
        try {
          const ext = kitFile.name.split('.').pop().toLowerCase();
          const path = `${username}/${Date.now()}.${ext}`;
          setKitProgress(50);
          const fileUrl = await uploadFile('drumkits', path, kitFile);
          setKitProgress(100);
          // Save to drumkits table
          await fetch(`${SUPABASE_URL}/rest/v1/drumkits`, {
            method: 'POST',
            headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ uploaded_by_username: username, name: kitName.trim(), price: parseFloat(kitPrice) || 0, file_url: fileUrl, file_size_mb: Math.round(kitFile.size / 1024 / 1024 * 10) / 10 }),
          });
          // Also add as listing
          const listing = await dbPost('artist_listings', {
            seller_username: username, type: 'drumkit', title: kitName.trim(),
            price: parseFloat(kitPrice) || 0, audio_url: fileUrl, is_active: true, bpm: null, genre: 'Other',
          });
          onAdded(Array.isArray(listing) ? { ...listing[0], audio_url: fileUrl } : { ...listing, audio_url: fileUrl });
          onClose();
        } catch (err) { setError('Upload failed: ' + err.message); }
        setUploading(false);
      }
      return;
    }
    if (type === 'open_verse' && !title) return setError('Title is required');
    if (!price || parseFloat(price) <= 0) return setError('Price is required');
    if (type === 'open_verse' && !audioFile) return setError('Audio preview is required for open verses');
    setUploading(true);
    setError('');
    try {
      let audio_url = null;
      let cover_url = null;

      if (audioFile) {
        const ext = audioFile.name.split('.').pop();
        if (!userId) throw new Error('Not authenticated — please log out and back in');
        const path = `${userId}/listing_${Date.now()}.${ext}`;
        audio_url = await uploadFile('audio', path, audioFile);
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const coverPath = userId ? `${userId}/listing_cover_${Date.now()}.${ext}` : `${username}/listing_cover_${Date.now()}.${ext}`;
        cover_url = await uploadFile('covers', coverPath, coverFile).catch(() => null);
      }

      const listing = await dbPost('artist_listings', {
        seller_username: username,
        type,
        title: type === 'feature' ? 'Feature' : title,
        description,
        genre,
        bpm: bpm ? parseInt(bpm) : null,
        price: parseFloat(price),
        audio_url,
        cover_url,
        is_active: true,
      });

      onAdded(Array.isArray(listing) ? listing[0] : listing);
      onClose();
    } catch (err) {
      setError('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 900, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px 20px', width: '100%', maxWidth: '480px', marginTop: '20px', marginBottom: '40px' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', marginBottom: '20px' }}>➕ Add Listing</div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Type</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ v: 'open_verse', l: '🎤 Open Verse' }, { v: 'feature', l: '⭐ Feature' }, { v: 'drumkit', l: '🥁 Drum Kit' }].map(t => (
              <button key={t.v} type="button" onClick={() => setType(t.v)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${type === t.v ? accent : 'rgba(255,255,255,0.1)'}`, background: type === t.v ? `${accent}20` : 'transparent', color: type === t.v ? accent : 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Drumkit: pick existing or upload new */}
        {type === 'drumkit' ? (
          <>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[{ v: 'existing', l: 'Use Existing' }, { v: 'new', l: '+ Upload New' }].map(m => (
                <button key={m.v} type="button" onClick={() => setKitMode(m.v)}
                  style={{ flex: 1, padding: '9px', borderRadius: '10px', border: `2px solid ${kitMode === m.v ? accent : 'rgba(255,255,255,0.1)'}`, background: kitMode === m.v ? `${accent}20` : 'transparent', color: kitMode === m.v ? accent : 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                  {m.l}
                </button>
              ))}
            </div>

            {kitMode === 'existing' ? (
              <div style={{ marginBottom: '20px' }}>
                {myDrumkits.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
                    No drumkits found on your profile yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {myDrumkits.map(k => (
                      <div key={k.id} onClick={() => setSelectedKitId(String(k.id))}
                        style={{ background: selectedKitId === String(k.id) ? `${accent}15` : 'rgba(255,255,255,0.04)', border: `2px solid ${selectedKitId === String(k.id) ? accent : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px' }}>{k.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{k.price > 0 ? `$${k.price}` : 'FREE'}</div>
                        </div>
                        {selectedKitId === String(k.id) && <span style={{ color: accent, fontSize: '16px' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Kit Name</label>
                  <input className="auth-input" value={kitName} onChange={e => setKitName(e.target.value)} placeholder="My Drum Kit..." maxLength={80} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Price ($) — leave 0 for free</label>
                  <input className="auth-input" type="number" min="0" step="0.01" value={kitPrice} onChange={e => setKitPrice(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Kit File (.zip or .rar, max 50MB)</label>
                  <input ref={kitFileRef} type="file" accept=".zip,.rar" style={{ display: 'none' }} onChange={e => {
                    const f = e.target.files[0];
                    if (!f) return;
                    if (f.size > 50 * 1024 * 1024) { setError('Max 50MB'); return; }
                    setKitFile(f);
                    if (!kitName) setKitName(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                  }} />
                  <button type="button" onClick={() => kitFileRef.current?.click()}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${kitFile ? accent : 'rgba(255,255,255,0.15)'}`, borderRadius: '10px', color: kitFile ? accent : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', textAlign: 'left' }}>
                    {kitFile ? `✓ ${kitFile.name}` : '📦 Select .zip or .rar...'}
                  </button>
                  {kitProgress > 0 && kitProgress < 100 && (
                    <div style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${kitProgress}%`, background: accent, transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : type === 'feature' ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Feature Price ($)</label>
              <input className="auth-input" type="number" min="1" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="200.00" />
            </div>
          </>
        ) : (
          <>
            {/* Open Verse: full form */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Song Title</label>
              <input className="auth-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Song name..." maxLength={80} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Genre</label>
                <select className="auth-input" value={genre} onChange={e => setGenre(e.target.value)} style={{ cursor: 'pointer' }}>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>BPM (optional)</label>
                <input className="auth-input" type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="140" />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Price ($)</label>
              <input className="auth-input" type="number" min="1" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="50.00" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Audio Preview <span style={{ color: '#ff3366', fontSize: '10px' }}>* Required · up to 1 minute</span>
              </label>
              <input ref={audioRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => setAudioFile(e.target.files[0])} />
              <button type="button" onClick={() => audioRef.current?.click()}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${audioFile ? accent : 'rgba(255,51,102,0.3)'}`, borderRadius: '10px', color: audioFile ? accent : 'rgba(255,100,100,0.7)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', textAlign: 'left' }}>
                {audioFile ? `✓ ${audioFile.name}` : '🎵 Upload audio preview (required)...'}
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Cover Image (optional)</label>
              <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCoverFile(e.target.files[0])} />
              <button type="button" onClick={() => coverRef.current?.click()}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: coverFile ? accent : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', textAlign: 'left' }}>
                {coverFile ? `✓ ${coverFile.name}` : '🖼 Upload cover image...'}
              </button>
            </div>
          </>
        )}

        {error && <div style={{ color: '#ff3366', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={uploading} style={{ flex: 2, padding: '12px', background: `linear-gradient(135deg, ${accent}, #bf5fff)`, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
            {uploading ? 'Uploading...' : 'List It'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error(error.message);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ─── Main Storefront Page ─────────────────────────────────────────────────────
export default function StorefrontPage({ username, onBack }) {
  const { currentUser } = useAuth();
  const isOwner = currentUser?.username === username;

  const [storefront, setStorefront] = useState(null);
  const [beats, setBeats] = useState([]);
  const [listings, setListings] = useState([]);
  const [drumkits, setDrumkits] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showListingUpload, setShowListingUpload] = useState(false);
  const [copied, setCopied] = useState(false);

  const accent = storefront?.accent_color || '#00f5ff';
  const bgValue = storefront?.bg_color || '#0a0a0a';
  const bgOption = BG_OPTIONS.find(o => o.value === bgValue);
  const bg = bgOption?.preview || bgValue;
  const fontFamily = 'var(--font-head)';
  const sectionOrder = (() => {
    try { return JSON.parse(storefront?.section_order || '["beats","open_verses","features","drumkits"]'); }
    catch { return ['beats', 'open_verses', 'features', 'drumkits']; }
  })();
  const featuredBeat = storefront?.featured_beat_id ? beats.find(b => String(b.id) === String(storefront.featured_beat_id)) : null;

  useEffect(() => {
    if (!username) return;
    Promise.all([
      db(`storefronts?username=eq.${encodeURIComponent(username)}`),
      db(`tracks?uploaded_by_username=eq.${encodeURIComponent(username)}&select=id,title,artist,genre,bpm,price,license_type,cover_url,audio_url,snippet_start,cops&order=listed_at.desc`),
      db(`artist_listings?seller_username=eq.${encodeURIComponent(username)}&is_active=eq.true&order=listed_at.desc`),
      db(`drumkits?username=eq.${encodeURIComponent(username)}&select=id,name,file_url,file_count,price&order=created_at.desc`),
      db(`profiles?username=eq.${encodeURIComponent(username)}&select=username,avatar_color,avatar_url,bio`),
    ]).then(([sfData, beatsData, listingsData, kitsData, profileData]) => {
      setStorefront(Array.isArray(sfData) ? sfData[0] : null);
      setBeats(Array.isArray(beatsData) ? beatsData : []);
      setListings(Array.isArray(listingsData) ? listingsData : []);
      setDrumkits(Array.isArray(kitsData) ? kitsData : []);
      setProfile(Array.isArray(profileData) ? profileData[0] : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [username]);

  const handleDeleteDrumkit = async (id, isListing) => {
    if (!confirm('Remove this drum kit from your storefront?')) return;
    if (isListing) {
      await fetch(`${SUPABASE_URL}/rest/v1/artist_listings?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      setListings(prev => prev.filter(l => l.id !== id));
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/drumkits?id=eq.${id}`, {
        method: 'DELETE',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      });
      setDrumkits(prev => prev.filter(k => k.id !== id));
    }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm('Remove this listing?')) return;
    await fetch(`${SUPABASE_URL}/rest/v1/artist_listings?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const handleBuy = async (item) => {
    const isFree = !item.price || item.price === 0;
    const downloadUrl = item.audio_url || item.file_url;
    if (isFree && downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${item.title || item.name}.${item.file_url ? 'zip' : 'mp3'}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: item.id,
          trackTitle: item.title,
          artist: item.artist || username,
          price: item.price,
          licenseType: item.license_type || item.type || 'listing',
          buyerUsername: currentUser?.username || 'anonymous',
          producerUsername: username,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert('Checkout failed: ' + err.message);
    }
  };

  const handleShare = async () => {
    const url = `https://808market.app/store/${username}`;
    try {
      if (navigator.share) await navigator.share({ title: `${username}'s Storefront`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
        Loading storefront...
      </div>
    );
  }

  const hasContent = beats.length > 0 || listings.length > 0 || drumkits.length > 0;
  const openVerses = listings.filter(l => l.type === 'open_verse');
  const features = listings.filter(l => l.type === 'feature');
  const listedDrumkits = listings.filter(l => l.type === 'drumkit');

  // Map font style to actual font family
  const fontStyleMap = {
    'default': 'var(--font-head)',
    'mono': 'Courier New, monospace',
    'serif': 'Georgia, serif',
    'geometric': 'Poppins, sans-serif',
    'bold-sans': 'Arial Black, sans-serif',
  };
  const appliedFontFamily = fontStyleMap[storefront?.font_style] || fontStyleMap['default'];

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff' }}>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: `${bg}ee`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${accent}30`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: accent, fontSize: '20px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>←</button>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {storefront?.display_name || `@${username}`}
        </div>
        <button onClick={handleShare} style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)', flexShrink: 0 }}>
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
        {isOwner && (
          <button onClick={() => setShowEditor(true)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)', flexShrink: 0 }}>
            ✏️ Edit
          </button>
        )}
      </div>

      {/* Banner */}
      {storefront?.banner_url && (
        <div style={{ width: '100%', height: '160px', backgroundImage: `url(${storefront.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      )}

      {/* Hero */}
      <div style={{ padding: '32px 20px 24px', textAlign: 'center', borderBottom: `1px solid ${accent}20` }}>
        {/* Avatar */}
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: profile?.avatar_color || '#333', margin: '0 auto 14px', overflow: 'hidden', border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-head)' }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (username[0] || '?').toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '22px', marginBottom: '4px' }}>
          {storefront?.display_name || `@${username}`}
        </div>
        {storefront?.tagline && (
          <div style={{ fontSize: '14px', color: `${accent}cc`, fontFamily: 'var(--font-body)', marginBottom: '8px', fontStyle: 'italic' }}>{storefront.tagline}</div>
        )}
        {profile?.bio && (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', maxWidth: '400px', margin: '0 auto' }}>{profile.bio}</div>
        )}
        {isOwner && !storefront && (
          <button onClick={() => setShowEditor(true)} style={{ marginTop: '16px', background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
            ✨ Set up your storefront
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: appliedFontFamily }}>

        {/* Owner actions */}
        {isOwner && (
          <div style={{ marginBottom: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowListingUpload(true)}
              style={{ padding: '10px 18px', background: `linear-gradient(135deg, ${accent}, #bf5fff)`, border: 'none', borderRadius: '20px', color: '#000', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: appliedFontFamily }}>
              ➕ Add Listing
            </button>
          </div>
        )}

        {/* About Bio */}
        {storefront?.about_bio && (
          <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}20`, borderRadius: '12px', padding: '16px 18px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
            {storefront.about_bio}
          </div>
        )}

        {/* Social Links */}
        {(storefront?.instagram || storefront?.twitter || storefront?.soundcloud || storefront?.youtube || storefront?.bio_link) && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {storefront.instagram && <a href={`https://instagram.com/${storefront.instagram}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>📸 Instagram</a>}
            {storefront.twitter && <a href={`https://x.com/${storefront.twitter}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>🐦 Twitter</a>}
            {storefront.soundcloud && <a href={`https://soundcloud.com/${storefront.soundcloud}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>☁️ SoundCloud</a>}
            {storefront.youtube && <a href={`https://youtube.com/@${storefront.youtube}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>▶️ YouTube</a>}
            {storefront.bio_link && <a href={storefront.bio_link.startsWith('http') ? storefront.bio_link : `https://${storefront.bio_link}`} target="_blank" rel="noreferrer" style={{ background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: '20px', padding: '6px 14px', color: accent, fontSize: '12px', textDecoration: 'none', fontWeight: 700 }}>🔗 {storefront.bio_link_label || 'Link'}</a>}
          </div>
        )}

        {/* Featured Beat */}
        {featuredBeat && (
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader label="⭐ Featured Beat" accent={accent} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', maxWidth: '340px' }}>
              <BeatCard beat={featuredBeat} accent={accent} onBuy={handleBuy} cardStyle={storefront?.card_style} onPlayTrack={setCurrentlyPlayingTrack} onStopTrack={() => setCurrentlyPlayingTrack(null)} />
            </div>
          </div>
        )}

        {!hasContent && !isOwner && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
            <div>This storefront is empty right now.</div>
          </div>
        )}

        {/* Sections in custom order */}
        {sectionOrder.map(section => {
          if (section === 'beats' && beats.length > 0) return (
            <div key="beats" style={{ marginBottom: '32px' }}>
              <SectionHeader label={`🎵 Beats (${beats.length})`} accent={accent} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {beats.map(b => <BeatCard key={b.id} beat={b} accent={accent} onBuy={handleBuy} cardStyle={storefront?.card_style} onPlayTrack={setCurrentlyPlayingTrack} onStopTrack={() => setCurrentlyPlayingTrack(null)} />)}
              </div>
            </div>
          );
          if (section === 'open_verses' && openVerses.length > 0) return (
            <div key="open_verses" style={{ marginBottom: '32px' }}>
              <SectionHeader label={`🎤 Open Verses (${openVerses.length})`} accent={accent} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {openVerses.map(l => <ListingCard key={l.id} listing={l} accent={accent} onBuy={handleBuy} isOwner={isOwner} onDelete={handleDeleteListing} />)}
              </div>
            </div>
          );
          if (section === 'features' && (features.length > 0 || isOwner)) return (
            <div key="features" style={{ marginBottom: '32px' }}>
              <SectionHeader label="⭐ Features" accent={accent} />
              {features.length > 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}30`, borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontFamily, fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Book a Feature</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, fontFamily, color: '#00ff88', marginTop: '8px' }}>${features[0].price}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <button onClick={() => handleBuy(features[0])} style={{ background: `linear-gradient(135deg, ${accent}, #bf5fff)`, color: '#000', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily, whiteSpace: 'nowrap' }}>🎤 Buy a Feature</button>
                    {isOwner && <button onClick={() => handleDeleteListing(features[0].id)} style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily }}>🗑 Remove</button>}
                  </div>
                </div>
              ) : isOwner ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Add a feature listing to show a "Buy a Feature" button here</div>
              ) : null}
            </div>
          );
          if (section === 'drumkits' && (drumkits.length > 0 || listedDrumkits.length > 0)) return (
            <div key="drumkits" style={{ marginBottom: '32px' }}>
              <SectionHeader label={`🥁 Drum Kits (${drumkits.length + listedDrumkits.length})`} accent={accent} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {drumkits.map(k => <DrumkitCard key={k.id} kit={k} accent={accent} onBuy={handleBuy} isOwner={isOwner} onDelete={() => handleDeleteDrumkit(k.id, false)} />)}
                {listedDrumkits.map(l => (
                  <DrumkitCard key={l.id} accent={accent} onBuy={handleBuy} isOwner={isOwner} onDelete={() => handleDeleteDrumkit(l.id, true)}
                    kit={{ id: l.id, name: l.title, price: l.price, file_url: l.audio_url, description: l.description }}
                  />
                ))}
              </div>
            </div>
          );
          return null;
        })}
      </div>

      {/* Powered by footer */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: `1px solid ${accent}20`, fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)' }}>
        Powered by <a href="https://808market.app" target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: 'none', fontWeight: 700 }}>808market</a>
      </div>

      {showEditor && (
        <StorefrontEditor
          storefront={storefront}
          username={username}
          beats={beats}
          onSave={(updated) => { setStorefront(updated); setShowEditor(false); }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {showListingUpload && (
        <ListingUpload
          username={username}
          userId={currentUser?.id}
          accent={accent}
          onClose={() => setShowListingUpload(false)}
          onAdded={(listing) => setListings(prev => [listing, ...prev])}
        />
      )}

      {/* Sticky Audio Player */}
      <StickyAudioPlayer
        currentTrack={currentlyPlayingTrack}
        isPlaying={stickyPlayerIsPlaying}
        onPlayPause={setStickyPlayerIsPlaying}
        onClose={() => {
          setCurrentlyPlayingTrack(null);
          setStickyPlayerIsPlaying(false);
        }}
      />
    </div>
  );
}

