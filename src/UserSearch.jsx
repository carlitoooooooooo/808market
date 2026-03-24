import { useState, useRef, useEffect } from "react";

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';

export default function UserSearch({ onSelectUser, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${URL}/rest/v1/profiles?username=ilike.*${encodeURIComponent(q.trim())}*&select=username,avatar_color,avatar_url,bio,role,is_beta_tester&limit=20`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {/* Search header */}
      <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#080808' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          placeholder="Search producers..."
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

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
            Searching...
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
            No users found for "{query}"
          </div>
        )}

        {!loading && !query && (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
            🔍 Search for producers by username
          </div>
        )}

        {results.map(user => (
          <div
            key={user.username}
            onClick={() => { onSelectUser(user.username); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 20px', cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: user.avatar_color || '#00f5ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '16px', color: '#000',
              flexShrink: 0, overflow: 'hidden',
            }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.username[0].toUpperCase()
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', color: '#fff' }}>
                  @{user.username}
                </span>
                {user.role === 'admin' && (
                  <span style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', color: '#000', fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', letterSpacing: '1px' }}>ADMIN</span>
                )}
                {user.is_beta_tester && user.role !== 'admin' && (
                  <span style={{ background: 'linear-gradient(135deg, #ff9900, #ff3366)', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', letterSpacing: '1px' }}>BETA</span>
                )}
              </div>
              {user.bio && (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: "'Inter', sans-serif", marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.bio}
                </div>
              )}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '18px' }}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
