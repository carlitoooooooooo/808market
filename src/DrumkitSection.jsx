import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const MAX_MB = 50;

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
  padding: '10px 14px', color: '#fff', fontSize: '15px',
  fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
};

// ── Upload form (own profile only) ──────────────────────────────
function DrumkitUpload({ username, onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef(null);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['zip', 'rar'].includes(ext)) { setError('Only .zip or .rar files allowed'); return; }
    const mb = f.size / 1024 / 1024;
    if (mb > MAX_MB) { setError(`File too large (max ${MAX_MB}MB)`); return; }
    setFile(f);
    setError('');
    if (!name) setName(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
  }

  async function handleUpload() {
    if (!file || !name.trim()) return setError('File and name required');
    setUploading(true); setError(''); setProgress(0);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `${username}/${Date.now()}.${ext}`;

      // Upload file with XHR for progress
      const fileUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/drumkits/${path}`);
        xhr.setRequestHeader('Authorization', `Bearer ${ANON}`);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(`${SUPABASE_URL}/storage/v1/object/public/drumkits/${path}`);
          } else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });

      // Save to DB
      const res = await fetch(`${SUPABASE_URL}/rest/v1/drumkits`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          uploaded_by_username: username,
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
          file_url: fileUrl,
          file_size_mb: Math.round(file.size / 1024 / 1024 * 10) / 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to save');

      onUploaded(Array.isArray(data) ? data[0] : data);
      setFile(null); setName(''); setDescription(''); setPrice('');
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false); setProgress(0);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
      >
        + Upload Drumkit
      </button>
    );
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Upload Drumkit</div>

      {/* File picker */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{ border: '2px dashed rgba(0,245,255,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(0,245,255,0.05)' : 'transparent' }}
      >
        {file ? (
          <div>
            <div style={{ color: 'var(--cyan)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '14px' }}>📦 {file.name}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '3px' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>📦</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Tap to select .zip or .rar<br />Max {MAX_MB}MB</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".zip,.rar,application/zip,application/x-rar-compressed" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      <input value={name} onChange={e => setName(e.target.value)} placeholder="Drumkit name..." style={inputStyle} />
      <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} placeholder="Description (optional)..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price ($0 = free)" style={{ ...inputStyle, flex: 1 }} />
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>{error}</div>}

      {uploading && (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>Uploading... {progress}%</div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', borderRadius: '2px', transition: 'width 0.2s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => { setShowForm(false); setError(''); setFile(null); }} disabled={uploading}
          style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px' }}>
          Cancel
        </button>
        <button onClick={handleUpload} disabled={uploading || !file || !name.trim()}
          className="btn-primary"
          style={{ flex: 2, justifyContent: 'center', opacity: (!file || !name.trim() || uploading) ? 0.5 : 1 }}>
          {uploading ? 'Uploading...' : '🥁 List Drumkit'}
        </button>
      </div>
    </div>
  );
}

// ── Main section (used on both own + other profiles) ─────────────
export default function DrumkitSection({ username, isOwnProfile }) {
  const { currentUser } = useAuth();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  async function loadKits() {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/drumkits?uploaded_by_username=eq.${encodeURIComponent(username)}&order=listed_at.desc`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const data = await res.json();
      setKits(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadKits(); }, [username]);

  async function handleDelete(kit) {
    if (!confirm(`Delete "${kit.name}"?`)) return;
    await fetch(`${SUPABASE_URL}/rest/v1/drumkits?id=eq.${kit.id}`, {
      method: 'DELETE',
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    setKits(prev => prev.filter(k => k.id !== kit.id));
  }

  async function handleCop(kit) {
    const isFree = !kit.price || kit.price === 0;
    if (isFree) {
      // Direct download
      setDownloading(kit.id);
      // Increment download count
      fetch(`${SUPABASE_URL}/rest/v1/drumkits?id=eq.${kit.id}`, {
        method: 'PATCH',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ download_count: (kit.download_count || 0) + 1 }),
      }).catch(() => {});
      // Get signed URL to prevent direct file access
      let downloadUrl = kit.file_url;
      try {
        const signRes = await fetch('/api/sign-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioUrl: kit.file_url }),
        });
        const signData = await signRes.json();
        if (signData.signedUrl) downloadUrl = signData.signedUrl;
      } catch {}
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${kit.name}.${kit.file_url.split('.').pop()}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setKits(prev => prev.map(k => k.id === kit.id ? { ...k, download_count: (k.download_count || 0) + 1 } : k));
      setDownloading(null);
    } else {
      // Paid — Stripe checkout
      setDownloading(kit.id);
      try {
        const res = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackId: kit.id,
            trackTitle: kit.name,
            artist: kit.uploaded_by_username,
            price: kit.price,
            licenseType: 'Drumkit',
            buyerUsername: currentUser?.username || 'anonymous',
          }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } catch {}
      setDownloading(null);
    }
  }

  return (
    <div className="profile-section">
      <div className="section-title">🥁 DRUMKITS</div>

      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Loading...</div>
      ) : kits.length === 0 && !isOwnProfile ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>No drumkits listed yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {kits.map(kit => {
            const isFree = !kit.price || kit.price === 0;
            const isDownloading = downloading === kit.id;
            return (
              <div key={kit.id} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', marginBottom: '3px' }}>📦 {kit.name}</div>
                    {kit.description && <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>{kit.description}</div>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>{kit.file_size_mb} MB</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>·</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>{kit.download_count || 0} downloads</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: isFree ? 'var(--cyan)' : 'var(--green)' }}>
                      {isFree ? 'FREE' : `$${kit.price}`}
                    </span>
                    {isOwnProfile && (
                      <button onClick={() => handleDelete(kit)} style={{ background: 'none', border: 'none', color: 'rgba(255,51,102,0.6)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>🗑 delete</button>
                    )}
                  </div>
                </div>
                {!isOwnProfile && (
                  <button
                    onClick={() => handleCop(kit)}
                    disabled={isDownloading}
                    style={{ width: '100%', padding: '10px', background: isFree ? 'linear-gradient(135deg, var(--cyan), var(--green))' : 'linear-gradient(135deg, var(--cyan), var(--purple))', border: 'none', borderRadius: '10px', color: '#000', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', cursor: isDownloading ? 'not-allowed' : 'pointer', opacity: isDownloading ? 0.6 : 1 }}
                  >
                    {isDownloading ? 'Processing...' : isFree ? '⬇️ Free Download' : `🛒 COP IT — $${kit.price}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOwnProfile && (
        <DrumkitUpload username={username} onUploaded={(kit) => setKits(prev => [kit, ...prev])} />
      )}
    </div>
  );
}
