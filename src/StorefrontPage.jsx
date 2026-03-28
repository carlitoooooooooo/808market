import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";

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
const BG_COLORS = ['#0a0a0a', '#080818', '#0a0808', '#080a08', '#12080a', '#08100a'];

function SectionHeader({ label, accent }) {
  return (
    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', color: accent, borderLeft: `3px solid ${accent}`, paddingLeft: '10px', marginBottom: '16px' }}>
      {label}
    </div>
  );
}

function BeatCard({ beat, accent, onBuy }) {
  const isFree = !beat.price || beat.price === 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      <div style={{ height: '120px', backgroundImage: `url(${beat.coverUrl || beat.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', gap: '4px' }}>
          {beat.genre && <span style={{ background: 'rgba(0,0,0,0.7)', color: accent, fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontFamily: 'var(--font-head)', fontWeight: 700 }}>{beat.genre}</span>}
          {beat.bpm && <span style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontFamily: 'var(--font-body)' }}>{beat.bpm} BPM</span>}
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

function ListingCard({ listing, accent, onBuy }) {
  const typeLabel = listing.type === 'open_verse' ? '🎤 Open Verse' : '⭐ Feature';
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {listing.cover_url && (
        <div style={{ height: '100px', backgroundImage: `url(${listing.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      )}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ background: `${accent}22`, color: accent, fontSize: '10px', padding: '2px 8px', borderRadius: '8px', fontFamily: 'var(--font-head)', fontWeight: 700 }}>{typeLabel}</span>
          {listing.genre && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'var(--font-body)' }}>{listing.genre}</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{listing.title}</div>
        {listing.description && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)', marginBottom: '8px', lineHeight: 1.4 }}>{listing.description}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: '#00ff88' }}>${listing.price}</span>
          <button onClick={() => onBuy(listing)} style={{ background: accent, color: '#000', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
            🛒 Book
          </button>
        </div>
      </div>
    </div>
  );
}

function DrumkitCard({ kit, accent }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      <div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>{kit.name}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>{kit.file_count ? `${kit.file_count} samples` : 'Drum Kit'} · {kit.price ? `$${kit.price}` : 'FREE'}</div>
      </div>
      <a href={kit.file_url} target="_blank" rel="noreferrer"
        style={{ background: accent, color: '#000', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)', textDecoration: 'none' }}>
        ⬇️ Get Kit
      </a>
    </div>
  );
}

// ─── Editor Modal ────────────────────────────────────────────────────────────
function StorefrontEditor({ storefront, username, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(storefront?.display_name || '');
  const [tagline, setTagline] = useState(storefront?.tagline || '');
  const [accent, setAccent] = useState(storefront?.accent_color || '#00f5ff');
  const [bg, setBg] = useState(storefront?.bg_color || '#0a0a0a');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const payload = { username, display_name: displayName, tagline, accent_color: accent, bg_color: bg, is_public: true };
    if (storefront) {
      await dbPatch(`storefronts?username=eq.${encodeURIComponent(username)}`, payload);
    } else {
      await dbPost('storefronts', payload);
    }
    setSaving(false);
    onSave({ ...payload });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px 24px', width: '100%', maxWidth: '420px' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', marginBottom: '20px' }}>✏️ Customize Storefront</div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Display Name</label>
          <input className="auth-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={username} maxLength={40} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Tagline</label>
          <input className="auth-input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Beats. Vibes. Culture." maxLength={80} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Accent Color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACCENT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setAccent(c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: `3px solid ${accent === c ? '#fff' : 'transparent'}`, cursor: 'pointer' }} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Background</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {BG_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setBg(c)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: c, border: `3px solid ${bg === c ? '#fff' : 'rgba(255,255,255,0.2)'}`, cursor: 'pointer' }} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: `linear-gradient(135deg, ${accent}, #bf5fff)`, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Artist Listing Upload ────────────────────────────────────────────────────
function ListingUpload({ username, accent, onClose, onAdded }) {
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
  const audioRef = useRef(null);
  const coverRef = useRef(null);

  const GENRES = ['Hip-Hop', 'Drill', 'Trap', 'R&B', 'Electronic', 'Other'];

  const handleSubmit = async () => {
    if (!title) return setError('Title is required');
    if (!price || parseFloat(price) <= 0) return setError('Price is required');
    setUploading(true);
    setError('');
    try {
      let audio_url = null;
      let cover_url = null;

      if (audioFile) {
        const ext = audioFile.name.split('.').pop();
        const path = `listings/${username}_${Date.now()}.${ext}`;
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/audio/${path}`, {
          method: 'POST',
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': audioFile.type },
          body: audioFile,
        });
        if (res.ok) {
          audio_url = `${SUPABASE_URL}/storage/v1/object/public/audio/${path}`;
        }
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const path = `listing_covers/${username}_${Date.now()}.${ext}`;
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/covers/${path}`, {
          method: 'POST',
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': coverFile.type },
          body: coverFile,
        });
        if (res.ok) {
          cover_url = `${SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
        }
      }

      const listing = await dbPost('artist_listings', {
        seller_username: username,
        type,
        title,
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 900, overflowY: 'auto', padding: '20px' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px 24px', width: '100%', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', marginBottom: '20px' }}>➕ Add Listing</div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Type</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ v: 'open_verse', l: '🎤 Open Verse' }, { v: 'feature', l: '⭐ Feature' }].map(t => (
              <button key={t.v} type="button" onClick={() => setType(t.v)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${type === t.v ? accent : 'rgba(255,255,255,0.1)'}`, background: type === t.v ? `${accent}20` : 'transparent', color: type === t.v ? accent : 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Title</label>
          <input className="auth-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'open_verse' ? "Song name..." : "Feature listing name..."} maxLength={80} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Description</label>
          <textarea className="auth-input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder={type === 'open_verse' ? "What does the song have so far? What are you looking for from the buyer?" : "What's your style? Turn time? What genres do you work with?"}
            rows={3} maxLength={300} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
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
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>Audio Preview (optional)</label>
          <input ref={audioRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => setAudioFile(e.target.files[0])} />
          <button type="button" onClick={() => audioRef.current?.click()}
            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: audioFile ? accent : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', textAlign: 'left' }}>
            {audioFile ? `✓ ${audioFile.name}` : '🎵 Upload audio preview...'}
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
  const bg = storefront?.bg_color || '#0a0a0a';

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

  const handleBuy = async (item) => {
    const isBeat = !!item.audio_url && !item.type;
    const isFree = !item.price || item.price === 0;
    if (isFree && isBeat) {
      const a = document.createElement('a');
      a.href = item.audio_url;
      a.download = `${item.title}.mp3`;
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
      <div style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto' }}>

        {/* Owner actions */}
        {isOwner && (
          <div style={{ marginBottom: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowListingUpload(true)}
              style={{ padding: '10px 18px', background: `linear-gradient(135deg, ${accent}, #bf5fff)`, border: 'none', borderRadius: '20px', color: '#000', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
              ➕ Add Listing
            </button>
          </div>
        )}

        {!hasContent && !isOwner && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
            <div>This storefront is empty right now.</div>
          </div>
        )}

        {/* Beats */}
        {beats.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader label={`🎵 Beats (${beats.length})`} accent={accent} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {beats.map(b => <BeatCard key={b.id} beat={b} accent={accent} onBuy={handleBuy} />)}
            </div>
          </div>
        )}

        {/* Open Verses */}
        {openVerses.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader label={`🎤 Open Verses (${openVerses.length})`} accent={accent} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {openVerses.map(l => <ListingCard key={l.id} listing={l} accent={accent} onBuy={handleBuy} />)}
            </div>
          </div>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader label={`⭐ Features (${features.length})`} accent={accent} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {features.map(l => <ListingCard key={l.id} listing={l} accent={accent} onBuy={handleBuy} />)}
            </div>
          </div>
        )}

        {/* Drumkits */}
        {drumkits.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader label={`🥁 Drum Kits (${drumkits.length})`} accent={accent} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {drumkits.map(k => <DrumkitCard key={k.id} kit={k} accent={accent} />)}
            </div>
          </div>
        )}
      </div>

      {/* Powered by footer */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: `1px solid ${accent}20`, fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)' }}>
        Powered by <a href="https://808market.app" target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: 'none', fontWeight: 700 }}>808market</a>
      </div>

      {showEditor && (
        <StorefrontEditor
          storefront={storefront}
          username={username}
          onSave={(updated) => { setStorefront(updated); setShowEditor(false); }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {showListingUpload && (
        <ListingUpload
          username={username}
          accent={accent}
          onClose={() => setShowListingUpload(false)}
          onAdded={(listing) => setListings(prev => [listing, ...prev])}
        />
      )}
    </div>
  );
}
