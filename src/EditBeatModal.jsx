import { useState } from "react";
import SnippetSelector from "./SnippetSelector.jsx";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

const GENRES = ["Hip-Hop", "Drill", "Trap", "R&B", "Electronic", "Other"];
const LICENSES = ["Free Download", "Non-Exclusive Lease", "Exclusive"];

function label(text) {
  return { display: 'block', fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '6px' };
}
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '15px', fontFamily: 'var(--font-body)', outline: 'none' };

export default function EditBeatModal({ track, onClose, onSave }) {
  const [title, setTitle] = useState(track.title || "");
  const [artist, setArtist] = useState(track.artist || "");
  const [genre, setGenre] = useState(track.genre || "Hip-Hop");
  const [price, setPrice] = useState(track.price ?? 0);
  const [licenseType, setLicenseType] = useState(track.licenseType || "Non-Exclusive Lease");
  const [producerNotes, setProducerNotes] = useState(track.producerNotes || "");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(track.coverUrl || null);
  const [snippetStart, setSnippetStart] = useState(track.snippetStart || 0);
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [audioFile, setAudioFile] = useState(null); // for snippet picker if needed
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!title.trim()) return setError("Title required");
    setSaving(true);
    setError("");
    try {
      let coverUrl = track.coverUrl;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${track.id}/cover_${Date.now()}.${ext}`;
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/covers/${path}`, {
          method: 'POST',
          headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': coverFile.type, 'x-upsert': 'true' },
          body: coverFile,
        });
        if (uploadRes.ok) coverUrl = `${SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
      }

      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${track.id}`, {
        method: 'PATCH',
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          genre,
          price: parseFloat(price) || 0,
          license_type: licenseType,
          cover_url: coverUrl,
          producer_notes: producerNotes.trim(),
          snippet_start: snippetStart,
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err?.message || "Failed to save");
      }
      const updated = await updateRes.json();
      const savedTrack = Array.isArray(updated) ? updated[0] : updated;
      onSave({
        ...track,
        title: savedTrack.title,
        artist: savedTrack.artist,
        genre: savedTrack.genre,
        price: savedTrack.price,
        licenseType: savedTrack.license_type,
        coverUrl: savedTrack.cover_url,
        producerNotes: savedTrack.producer_notes || "",
        snippetStart: savedTrack.snippet_start || 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="edit-beat-modal" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '24px', paddingBottom: 'max(80px, env(safe-area-inset-bottom, 80px))', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px' }}>Edit Beat</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Cover art */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: '12px', overflow: 'hidden', background: '#1a1a1a', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {coverPreview ? <img src={coverPreview} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px' }}>🖼️</span>}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
          </label>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Tap to change cover art</div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <label style={label('TITLE')}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Beat title..." style={inputStyle} />
        </div>

        {/* Artist */}
        <div style={{ marginBottom: '14px' }}>
          <label style={label('ARTIST')}>ARTIST</label>
          <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist name..." style={inputStyle} />
        </div>

        {/* Genre + Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={label('GENRE')}>GENRE</label>
            <select value={genre} onChange={e => setGenre(e.target.value)} style={{ ...inputStyle, padding: '10px 12px' }}>
              {GENRES.map(g => <option key={g} value={g} style={{ background: '#111' }}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={label('PRICE ($)')}>PRICE ($)</label>
            <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* License */}
        <div style={{ marginBottom: '14px' }}>
          <label style={label('LICENSE TYPE')}>LICENSE TYPE</label>
          <select value={licenseType} onChange={e => setLicenseType(e.target.value)} style={{ ...inputStyle, padding: '10px 12px' }}>
            {LICENSES.map(l => <option key={l} value={l} style={{ background: '#111' }}>{l}</option>)}
          </select>
        </div>

        {/* Snippet picker */}
        {track.audioUrl && !track.isSoundCloud && (
          <div style={{ marginBottom: '14px' }}>
            <label style={label('PREVIEW SNIPPET')}>PREVIEW SNIPPET</label>
            <button
              onClick={() => setShowSnippetPicker(true)}
              style={{ width: '100%', padding: '12px', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.3)', borderRadius: '10px', color: 'var(--cyan)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
            >
              🎚️ {snippetStart > 0 ? `Starts at ${formatTime(snippetStart)}` : 'Starts at beginning'} — tap to change
            </button>
          </div>
        )}

        {/* Producer notes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={label('PRODUCER NOTES')}>PRODUCER NOTES (OPTIONAL)</label>
          <textarea
            value={producerNotes}
            onChange={e => setProducerNotes(e.target.value.slice(0, 300))}
            placeholder="Tell people about this beat..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: '3px' }}>{producerNotes.length}/300</div>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>{error}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--cyan), var(--purple))', border: 'none', borderRadius: '12px', color: '#000', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Snippet picker modal */}
      {showSnippetPicker && track.audioUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
            <SnippetSelector
              url={track.audioUrl}
              initialStart={snippetStart}
              onConfirm={(start) => { setSnippetStart(start); setShowSnippetPicker(false); }}
              onCancel={() => setShowSnippetPicker(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
