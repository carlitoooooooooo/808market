import React, { useState, useEffect } from "react";
import TrackModal from "./TrackModal.jsx";
import DrumkitSection from "./DrumkitSection.jsx";
import { dbSelect, dbInsert, dbUpdate } from "./dbHelper.js";
import { useAuth } from "./AuthContext.jsx";

const TEAM_MEMBERS = ['avalions'];

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function normalizeLicense(val) {
  if (!val || val === 'lease') return 'Non-Exclusive Lease';
  if (val === 'exclusive') return 'Exclusive';
  if (val === 'free') return 'Free Download';
  return val;
}

function mapTrack(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    genre: t.genre,
    bpm: t.bpm || 0,
    coverUrl: t.cover_url || "",
    audioUrl: t.audio_url || "",
    snippetStart: t.snippet_start || 0,
    tags: t.tags || [],
    uploadedBy: t.uploaded_by_username || t.uploaded_by || "unknown",
    uploadedById: t.uploaded_by || null,
    listedAt: t.listed_at || new Date().toISOString(),
    cops: t.cops || t.hards || 0,
    passes: t.passes || t.trash || 0,
    price: t.price || 0,
    licenseType: normalizeLicense(t.license_type),
    paymentLink: t.payment_link || "",
    beatKey: t.beat_key || "",
    soundcloudUrl: t.soundcloud_url || null,
    embedUrl: t.embed_url || null,
    isSoundCloud: !!(t.soundcloud_url),
    producerNotes: t.producer_notes || "",
    playCount: t.play_count || 0,
  };
}

export default function UserProfilePage({ username, onClose, onOpenModal, userVotes, onMessageUser }) {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load full profile with all custom fields
        const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
        const profRes = await fetch(
          `https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=*`,
          { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
        );
        const profData = await profRes.json();
        const prof = Array.isArray(profData) ? profData[0] : profData;
        setProfile(prof || null);
        setFollowerCount(prof?.follower_count || 0);
        setFollowingCount(prof?.following_count || 0);

        // Load their tracks via direct REST (order by listed_at)
        const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
        const tracksRes = await fetch(
          `https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/tracks?uploaded_by_username=eq.${encodeURIComponent(username)}&order=listed_at.desc`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
        );
        const tracksData = await tracksRes.json();
        const mapped = Array.isArray(tracksData) ? tracksData.map(mapTrack) : [];
        // Sort by listed_at descending
        mapped.sort((a, b) => new Date(b.listedAt) - new Date(a.listedAt));
        setTracks(mapped);

        // Check follow status
        if (currentUser?.username && currentUser.username !== username) {
          const followData = await fetch(
            `${SUPABASE_URL}/rest/v1/follows?follower_username=eq.${encodeURIComponent(currentUser.username)}&following_username=eq.${encodeURIComponent(username)}&select=id`,
            { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
          ).then(r => r.json());
          setIsFollowing(Array.isArray(followData) && followData.length > 0);
        }
      } catch (err) {
        console.error('UserProfilePage load error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (username) load();
  }, [username, currentUser?.username]);

  const totalLikes = tracks.reduce((s, t) => s + (t.cops || 0), 0);
  const totalPlays = tracks.reduce((s, t) => s + (t.playCount || 0), 0);

  const avatarColor = profile?.avatar_color || "#ff2d78";
  const bio = profile?.bio || "";
  const initial = username ? username[0].toUpperCase() : "?";

  function handleTrackClick(track) {
    if (onOpenModal) {
      onOpenModal(track);
    } else {
      setSelectedTrack(track);
    }
  }

  async function handleFollow() {
    if (!currentUser?.username || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await fetch(
          `${SUPABASE_URL}/rest/v1/follows?follower_username=eq.${encodeURIComponent(currentUser.username)}&following_username=eq.${encodeURIComponent(username)}`,
          { method: 'DELETE', headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
        );
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
        // Decrement counts
        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`,
          {
            method: 'PATCH',
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ following_count: Math.max(0, (profile?.following_count || 1) - 1) }),
          }
        );
        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}`,
          {
            method: 'PATCH',
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ follower_count: Math.max(0, followerCount - 1) }),
          }
        );
      } else {
        // Follow
        await dbInsert('follows', {
          follower_username: currentUser.username,
          following_username: username,
        });
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
        // Increment counts
        // Get current user's following_count
        const myProfile = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}&select=following_count`,
          { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
        ).then(r => r.json());
        const myFollowingCount = (Array.isArray(myProfile) ? myProfile[0]?.following_count : myProfile?.following_count) || 0;

        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`,
          {
            method: 'PATCH',
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ following_count: myFollowingCount + 1 }),
          }
        );
        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}`,
          {
            method: 'PATCH',
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ follower_count: followerCount + 1 }),
          }
        );
        // Notification
        try {
          await dbInsert('notifications', {
            user_username: username,
            type: 'follow',
            from_username: currentUser.username,
            message: `${currentUser.username} started following you`,
          });
        } catch (e) { console.error('Follow notification error:', e); }
      }
    } catch (err) {
      console.error('Follow/unfollow error:', err);
    } finally {
      setFollowLoading(false);
    }
  }

  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="user-profile-page">
        <button onClick={onClose} style={{
          position: 'fixed', top: '16px', left: '16px', zIndex: 300,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%',
          width: '36px', height: '36px', color: '#fff', fontSize: '16px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>

        {loading ? (
          <div className="user-profile-loading">
            <div style={{ color: "var(--pink)", fontFamily: "var(--font-pixel)", fontSize: "12px", padding: "40px 20px", textAlign: "center" }}>
              LOADING...
            </div>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="user-profile-header">
              <div className="user-profile-avatar" style={{ background: profile?.avatar_url ? 'transparent' : avatarColor, overflow: 'hidden' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initial
                }
              </div>
              <div className="user-profile-info">
                <div className={`user-profile-username ${profile?.name_glow && profile.name_glow !== 'none' ? `name-glow-${profile.name_glow}` : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  @{username}
                  {/* Online indicator */}
                  {!profile?.hide_activity && profile?.last_seen && (() => {
                    const diff = (Date.now() - new Date(profile.last_seen).getTime()) / 1000 / 60;
                    if (diff < 5) return <span title="Online now" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88', display: 'inline-block', flexShrink: 0 }} />;
                    if (diff < 30) return <span title={`Active ${Math.round(diff)}m ago`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffd700', boxShadow: '0 0 6px #ffd700', display: 'inline-block', flexShrink: 0 }} />;
                    return null;
                  })()}
                  {profile?.role === 'admin' && (
                    <span style={{
                      background: 'linear-gradient(135deg, #00f5ff, #bf5fff)',
                      color: '#000', fontSize: '9px', fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                      letterSpacing: '1px', textTransform: 'uppercase',
                    }}>ADMIN</span>
                  )}
                  {TEAM_MEMBERS.includes(profile?.username) && profile?.role !== 'admin' && (
                    <span style={{
                      background: 'linear-gradient(135deg, #00ff88, #00f5ff)',
                      color: '#000', fontSize: '10px', fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                      letterSpacing: '1px', textTransform: 'uppercase',
                    }}>TEAM</span>
                  )}
                  {profile?.is_beta_tester && profile?.role !== 'admin' && !TEAM_MEMBERS.includes(profile?.username) && (
                    <span style={{
                      background: 'linear-gradient(135deg, #ff9900, #ff3366)',
                      color: '#fff', fontSize: '9px', fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                      letterSpacing: '1px', textTransform: 'uppercase',
                    }}>BETA TESTER</span>
                  )}
                </div>
                {/* Follower/Following counts */}
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Grotesk', sans-serif", marginTop: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{followerCount}</span> followers
                  {' · '}
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{followingCount}</span> following
                </div>
                {bio && <div className="user-profile-bio">{bio}</div>}
                {profile?.tagline && <div style={{ fontSize: '12px', color: 'var(--cyan)', fontFamily: "'Inter', sans-serif", marginTop: '2px', fontStyle: 'italic' }}>{profile.tagline}</div>}
                {profile?.location && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>📍 {profile.location}</div>}
                {profile?.influenced_by && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>🎵 Influenced by: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.influenced_by}</span></div>}
                {(profile?.instagram || profile?.twitter || profile?.soundcloud || profile?.youtube || profile?.spotify_url || profile?.bio_link) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {profile.instagram && <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textDecoration: 'none' }}>📸 Instagram</a>}
                    {profile.twitter && <a href={`https://x.com/${profile.twitter}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textDecoration: 'none' }}>🐦 Twitter</a>}
                    {profile.soundcloud && <a href={`https://soundcloud.com/${profile.soundcloud}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textDecoration: 'none' }}>☁️ SoundCloud</a>}
                    {profile.youtube && <a href={`https://youtube.com/@${profile.youtube}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textDecoration: 'none' }}>▶️ YouTube</a>}
                    {profile.spotify_url && <a href={profile.spotify_url} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textDecoration: 'none' }}>🎵 Spotify</a>}
                    {profile.bio_link && <a href={profile.bio_link.startsWith('http') ? profile.bio_link : `https://${profile.bio_link}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>🔗 {profile.bio_link_label || 'Link'}</a>}
                  </div>
                )}
              </div>
            </div>

            {/* Follow button (only if not own profile and logged in) */}
            {!isOwnProfile && currentUser && (
              <div style={{ padding: '0 16px 12px 16px' }}>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: isFollowing ? 'none' : '1.5px solid #00f5ff',
                    background: isFollowing ? '#00f5ff' : 'transparent',
                    color: isFollowing ? '#000' : '#00f5ff',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: followLoading ? 'not-allowed' : 'pointer',
                    opacity: followLoading ? 0.7 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {followLoading ? '...' : isFollowing ? 'Following ✓' : 'Follow +'}
                </button>
                {onMessageUser && (
                  <button
                    onClick={() => onMessageUser(username)}
                    style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: 'var(--cyan)', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
                  >💬 DM</button>
                )}
                <button
                  onClick={async () => {
                    const url = `https://808market.app/u/${username}`;
                    try {
                      if (navigator.share) { await navigator.share({ title: `${username} on 808market`, url }); }
                      else { await navigator.clipboard.writeText(url); alert('Profile link copied!'); }
                    } catch {}
                  }}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: '20px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer' }}
                  title="Share profile"
                >📤</button>
                <button
                  onClick={() => onOpenStorefront && onOpenStorefront(username)}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: '20px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer' }}
                  title="View Storefront"
                >🏪</button>
              </div>
            )}

            {/* Stats */}
            <div className="user-profile-stats">
              <div className="stat-box">
                <div className="stat-value" style={{ color: "var(--green)" }}>{totalLikes}</div>
                <div className="stat-label">❤️ likes</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{tracks.length}</div>
                <div className="stat-label">🎵 beats</div>
              </div>
              <div className="stat-box">
                <div className="stat-value" style={{ color: "var(--cyan)" }}>{totalPlays}</div>
                <div className="stat-label">🎧 plays</div>
              </div>
            </div>

            {/* Their Tracks */}
            <div className="user-profile-tracks-section">
              <div className="section-title" style={{ padding: "0 16px", marginBottom: "8px" }}>
                🎵 THEIR TRACKS
              </div>

              {tracks.length === 0 ? (
                <div style={{ color: "#666", fontFamily: "var(--font-vt)", fontSize: "18px", padding: "16px", textAlign: "center" }}>
                  no tracks yet
                </div>
              ) : (
                <div className="user-profile-tracks-grid">
                  {tracks.map(track => {
                    return (
                      <div
                        key={track.id}
                        className="user-profile-track-card"
                        onClick={() => handleTrackClick(track)}
                      >
                        <div
                          className="user-profile-track-thumb"
                          style={{ backgroundImage: `url(${track.coverUrl})` }}
                        />
                        <div className="user-profile-track-info">
                          <div className="user-profile-track-title">{track.title}</div>
                          <div className="user-profile-track-artist">{track.artist}</div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px" }}>
                            <span className="genre-tag" style={{ fontSize: "6px", padding: "2px 5px" }}>{track.genre}</span>
                            <span style={{ fontFamily: "var(--font-pixel)", fontSize: "7px", color: "var(--green)" }}>❤️{track.cops || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          <DrumkitSection username={username} isOwnProfile={false} />
          </>
        )}
      {/* Inline TrackModal if no onOpenModal prop */}
      {selectedTrack && (
        <TrackModal
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onVote={() => {}}
          userVotes={userVotes || {}}
        />
      )}
    </div>
  );
}
