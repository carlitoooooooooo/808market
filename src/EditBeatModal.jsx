import { useState } from "react";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

const GENRES = ["Hip-Hop", "R&B", "Drill", "Trap", "Afrobeats", "Jersey Club", "Hyperpop", "Indie", "Electronic", "Soul"];
const LICENSES = ["Free Download", "Non-Exclusive Lease", "Exclusive"];

export default function EditBeatModal({ track, onClose, onSave }) {
  const [title, setTitle] = useState(track.title || "");
  const [artist, setArtist] = useState(track.artist || "");
  const [genre, setGenre] = useState(track.genre || "Hip-Hop");
  const [price, setPrice] = useState(track.price ?? 0);
  const [licenseType, setLicenseType] = useState(track.licenseType || "Non-Exclusive Lease");
  const [paymentLink, setPaymentLink] = useState(track.paymentLink || "");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(track.coverUrl || null);
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

      // Upload new cover if changed
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${track.id}/cover_${Date.now()}.${ext}`;
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/covers/${path}`, {
          method: 'POST',
          headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': coverFile.type, 'x-upsert': 'true' },
          body: coverFile,
        });
        if (uploadRes.ok) {
          coverUrl = `${SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
        }
      }

      // Update track in DB
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${track.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          genre,
          price: parseFloat(price) || 0,
          license_type: licenseType,
          payment_link: paymentLink.trim(),
          cover_url: coverUrl,
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
        paymentLink: savedTrack.payment_link,
        coverUrl: savedTrack.cover_url,
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px' }}>Edit Beat</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Cover art */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: '12px', overflow: 'hidden', background: '#1a1a1a', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {coverPreview
                ? <img src={coverPreview} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '24px' }}>🖼️</span>
              }
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
          </label>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Tap to change cover art</div>
        </div>

        {/* Fields */}
        {[
          { label: 'TITLE', value: title, set: setTitle, placeholder: 'Beat title...' },
          { label: 'ARTIST', value: artist, set: setArtist, placeholder: 'Artist name...' },
          { label: 'PAYMENT LINK', value: paymentLink, set: setPaymentLink, placeholder: 'Cashapp / PayPal / Beatstars URL' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '6px' }}>{f.label}</label>
            <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '15px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '6px' }}>GENRE</label>
            <select value={genre} onChange={e => setGenre(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
              {GENRES.map(g => <option key={g} value={g} style={{ background: '#111' }}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '6px' }}>PRICE ($)</label>
            <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '15px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '6px' }}>LICENSE TYPE</label>
          <select value={licenseType} onChange={e => setLicenseType(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
            {LICENSES.map(l => <option key={l} value={l} style={{ background: '#111' }}>{l}</option>)}
          </select>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>{error}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--cyan), var(--purple))', border: 'none', borderRadius: '12px', color: '#000', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
