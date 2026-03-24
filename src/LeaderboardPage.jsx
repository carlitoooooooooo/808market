import React, { useState, useEffect } from "react";
import TrackModal from "./TrackModal.jsx";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

const RANK_STYLE = {
  1: { label: "🥇", color: "#ffd700", border: "1px solid rgba(255,215,0,0.5)" },
  2: { label: "🥈", color: "#c0c0c0", border: "1px solid rgba(192,192,192,0.5)" },
  3: { label: "🥉", color: "#cd7f32", border: "1px solid rgba(205,127,50,0.5)" },
};

export default function LeaderboardPage({ tracks, onVote, userVotes, onViewUser }) {
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [subTab, setSubTab] = useState("beats");

  // Producers state
  const [producers, setProducers] = useState([]);
  const [producersLoading, setProducersLoading] = useState(false);
  const [producersLoaded, setProducersLoaded] = useState(false);

  useEffect(() => {
    if (subTab === "producers" && !producersLoaded) {
      loadProducers();
    }
  }, [subTab]);

  async function loadProducers() {
    setProducersLoading(true);
    try {
      // Fetch all tracks to group by producer
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/tracks?select=uploaded_by_username,cops&uploaded_by_username=not.is.null`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();

      // Group by username
      const byUser = {};
      if (Array.isArray(data)) {
        data.forEach(t => {
          const u = t.uploaded_by_username;
          if (!u) return;
          if (!byUser[u]) byUser[u] = { totalLikes: 0, beatCount: 0 };
          byUser[u].totalLikes += (t.cops || 0);
          byUser[u].beatCount += 1;
        });
      }

      const usernames = Object.keys(byUser);
      if (usernames.length === 0) { setProducers([]); setProducersLoaded(true); return; }

      // Fetch profiles for those usernames
      const profilesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?username=in.(${usernames.join(',')})&select=username,avatar_color,avatar_url,bio,role,is_beta_tester,follower_count`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const profiles = await profilesRes.json();
      const profileMap = {};
      if (Array.isArray(profiles)) profiles.forEach(p => { profileMap[p.username] = p; });

      // Merge and sort
      const merged = usernames.map(u => ({
        username: u,
        totalLikes: byUser[u].totalLikes,
        beatCount: byUser[u].beatCount,
        ...(profileMap[u] || {}),
      }));
      merged.sort((a, b) => b.totalLikes - a.totalLikes);
      setProducers(merged);
      setProducersLoaded(true);
    } catch (err) {
      console.error('Load producers error:', err);
    } finally {
      setProducersLoading(false);
    }
  }

  const sorted = [...tracks].sort((a, b) => (b.cops || 0) - (a.cops || 0));

  return (
    <div className="leaderboard-page">
      <div className="page-header">
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
          <button
            onClick={() => setSubTab("beats")}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: subTab === "beats" ? '2px solid #00f5ff' : '2px solid transparent',
              color: subTab === "beats" ? '#00f5ff' : 'rgba(255,255,255,0.4)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: '14px',
              padding: '6px 14px 8px',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >🔥 Top Beats</button>
          <button
            onClick={() => setSubTab("producers")}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: subTab === "producers" ? '2px solid #bf5fff' : '2px solid transparent',
              color: subTab === "producers" ? '#bf5fff' : 'rgba(255,255,255,0.4)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: '14px',
              padding: '6px 14px 8px',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >👥 Producers</button>
        </div>
        <p className="page-subtitle">
          {subTab === "beats" ? "Fan Favorites ❤️" : "Most loved right now"}
        </p>
      </div>

      {/* ── TOP BEATS ── */}
      {subTab === "beats" && (
        <div className="leaderboard-list">
          {sorted.map((track, idx) => {
            const rank = idx + 1;
            const rankStyle = RANK_STYLE[rank] || {};
            const cops = track.cops || 0;
            const price = track.price || 0;
            const isFree = !price || price === 0;

            return (
              <div
                key={track.id}
                className={`leaderboard-row ${rank <= 3 ? "leaderboard-row--top" : ""}`}
                style={rank <= 3 ? { border: rankStyle.border } : {}}
                onClick={() => setSelectedTrack(track)}
              >
                <div
                  className="leaderboard-rank"
                  style={rank <= 3 ? { color: rankStyle.color } : {}}
                >
                  {rank <= 3 ? rankStyle.label : `#${rank}`}
                </div>

                <div
                  className="leaderboard-thumb"
                  style={{ backgroundImage: `url(${track.coverUrl})` }}
                />

                <div className="leaderboard-info">
                  <div className="leaderboard-title">{track.title}</div>
                  <div className="leaderboard-artist">{track.artist}</div>
                  <div className="leaderboard-genre">{track.genre}</div>
                </div>

                <div className="leaderboard-hards" style={{ textAlign: "right" }}>
                  <div className="hards-count">❤️ {cops.toLocaleString()}</div>
                  <div style={{ fontSize: "12px", marginTop: "3px", color: isFree ? "var(--cyan)" : "var(--green)", fontWeight: 600, fontFamily: "var(--font-head)" }}>
                    {isFree ? "FREE" : `$${price}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TOP PRODUCERS ── */}
      {subTab === "producers" && (
        <div className="leaderboard-list">
          {producersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px' }}>
              Loading producers...
            </div>
          ) : producers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px' }}>
              No producers yet
            </div>
          ) : producers.map((p, idx) => {
            const rank = idx + 1;
            const rankStyle = RANK_STYLE[rank] || {};
            const initial = (p.username || '?')[0].toUpperCase();

            return (
              <div
                key={p.username}
                className={`leaderboard-row ${rank <= 3 ? "leaderboard-row--top" : ""}`}
                style={{
                  cursor: 'pointer',
                  ...(rank <= 3 ? { border: rankStyle.border } : {}),
                }}
                onClick={() => onViewUser && onViewUser(p.username)}
              >
                {/* Rank */}
                <div
                  className="leaderboard-rank"
                  style={rank <= 3 ? { color: rankStyle.color } : {}}
                >
                  {rank <= 3 ? rankStyle.label : `#${rank}`}
                </div>

                {/* Avatar */}
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.username}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                ) : (
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: p.avatar_color || '#bf5fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: 700, color: '#000',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    {initial}
                  </div>
                )}

                {/* Info */}
                <div className="leaderboard-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <div className="leaderboard-title">@{p.username}</div>
                    {p.role === 'admin' && (
                      <span style={{ fontSize: '9px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', color: '#000', letterSpacing: '0.5px' }}>ADMIN</span>
                    )}
                    {p.is_beta_tester && p.role !== 'admin' && (
                      <span style={{ fontSize: '9px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: 'linear-gradient(135deg, #ff9900, #ff3366)', color: '#fff', letterSpacing: '0.5px' }}>BETA</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontFamily: "'Space Grotesk', sans-serif" }}>
                    🎵 {p.beatCount} beat{p.beatCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Likes */}
                <div className="leaderboard-hards" style={{ textAlign: "right" }}>
                  <div className="hards-count">❤️ {(p.totalLikes || 0).toLocaleString()}</div>
                  {p.follower_count > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px', fontFamily: "'Space Grotesk', sans-serif" }}>
                      👥 {p.follower_count}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTrack && (
        <TrackModal
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onVote={(dir, track) => { onVote(dir, track); setSelectedTrack(null); }}
          userVotes={userVotes}
          onViewUser={onViewUser}
        />
      )}
    </div>
  );
}
