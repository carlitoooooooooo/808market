import { useState, useRef, useEffect } from "react";

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';

export default function UserSearch({ onSelectUser, onClose, onSelectTrack }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("producers"); // "producers" | "beats"
  const [producerResults, setProducerResults] = useState([]);
  const [beatResults, setBeatResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async (q) => {
    if (!q.trim()) { setProducerResults([]); setBeatResults([]); return; }
    setLoading(true);
    try {
      const [producerRes, beatRes] = await Promise.all([
        // Search producers by username
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=ilike.*${encodeURIComponent(q.trim())}*&select=username,avatar_color,avatar_url,bio,role,is_beta_tester&limit=20`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
        ),
        // Search beats by title, artist, or tags
        fetch(
          `${SUPABASE_URL}/rest/v1/tracks?or=(title.ilike.*${encodeURIComponent(q.trim())}*,artist.ilike.*${encodeURIComponent(q.trim())}*,tags.cs.{${encodeURIComponent(q.trim().toLowerCase())}})&select=id,title,artist,genre,cover_url,price,tags,cops&order=cops.desc&limit=20`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
        ),
      ]);
      const producers = await producerRes.json();
      const beats = await beatRes.json();
      setProducerResults(Array.isArray(producers) ? producers : []);
      setBeatResults(Array.isArray(beats) ? beats : []);
    } catch {
      setProducerResults([]); setBeatResults([]);
    } finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#080808' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          placeholder="Search producers, beats, tags..."
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '16px',
            fontFamily: "'Inter', sans-serif", outline: 'none',
          }}
        />
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", padding: '8px' }}>
          Cancel
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#080808' }}>
        {[
          { id: 'producers', label: '👤 Producers', count: producerResults.length },
          { id: 'beats', label: '🎵 Beats', count: beatResults.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid #00f5ff' : '2px solid transparent',
            color: tab === t.id ? '#00f5ff' : 'rgba(255,255,255,0.4)',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '13px',
            padding: '10px', cursor: 'pointer', transition: 'color 0.15s',
          }}>
            {t.label}{query && t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>Searching...</div>
        )}

        {!loading && !query && (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
            🔍 Search producers, beat titles, or #tags
          </div>
        )}

        {/* Producers tab */}
        {!loading && query && tab === 'producers' && (
          producerResults.length === 0
            ? <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>No producers found for "{query}"</div>
            : producerResults.map(user => (
              <div key={user.username} onClick={() => { onSelectUser(user.username); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: user.avatar_color || '#00f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '16px', color: '#000', flexShrink: 0, overflow: 'hidden' }}>
                  {user.avatar_url ? <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', color: '#fff' }}>@{user.username}</span>
                    {user.role === 'admin' && <span style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', color: '#000', fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>ADMIN</span>}
                    {user.is_beta_tester && user.role !== 'admin' && <span style={{ background: 'linear-gradient(135deg, #ff9900, #ff3366)', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>BETA</span>}
                  </div>
                  {user.bio && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: "'Inter', sans-serif", marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.bio}</div>}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '18px' }}>›</div>
              </div>
            ))
        )}

        {/* Beats tab */}
        {!loading && query && tab === 'beats' && (
          beatResults.length === 0
            ? <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>No beats found for "{query}"</div>
            : beatResults.map(beat => {
              const isFree = !beat.price || beat.price === 0;
              return (
                <div key={beat.id}
                  onClick={() => { onSelectTrack?.(beat.id); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '8px', background: beat.cover_url ? `url(${beat.cover_url}) center/cover` : 'rgba(255,255,255,0.08)', backgroundSize: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '14px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{beat.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>by {beat.artist} · {beat.genre}</div>
                    {Array.isArray(beat.tags) && beat.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {beat.tags.slice(0, 4).map(tag => (
                          <span key={tag} style={{ background: 'rgba(0,245,255,0.1)', color: 'var(--cyan)', fontSize: '10px', padding: '1px 7px', borderRadius: '20px', fontFamily: "'Space Grotesk', sans-serif" }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '13px', color: isFree ? 'var(--cyan)' : 'var(--green)' }}>{isFree ? 'FREE' : `$${beat.price}`}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>❤️ {beat.cops || 0}</span>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
