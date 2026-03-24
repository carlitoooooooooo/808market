import React, { useState, useEffect, useMemo } from "react";
import { useAuth, AVATAR_COLORS } from "./AuthContext.jsx";
import { BADGES } from "./badges.js";
// MOCK_USERS removed — using real DB data for taste match
import SnippetPicker from "./SnippetPicker.jsx";
import { supabase } from "./supabase.js";
import EditBeatModal from "./EditBeatModal.jsx";
import ImageCropper from "./ImageCropper.jsx";

const REACTIONS_EMOJIS = ["🔥", "😤", "💯", "🥶", "😭", "💀"];

function getTopReaction(counts) {
  let top = null;
  let max = 0;
  for (const [emoji, count] of Object.entries(counts)) {
    if (count > max) { max = count; top = emoji; }
  }
  return top;
}

function getPinnedTrack(username) {
  try { return JSON.parse(localStorage.getItem(`ds_pinned_${username}`)); } catch { return null; }
}
function setPinnedTrack(username, trackId) {
  localStorage.setItem(`ds_pinned_${username}`, JSON.stringify(trackId));
}

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

export default function ProfilePage({ userVotes, tracks, onViewUser, onUpload }) {
  const { currentUser, setUserData, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState(currentUser?.bio || "");
  const [editColor, setEditColor] = useState(currentUser?.avatarColor || AVATAR_COLORS[0]);
  const [profileExtra, setProfileExtra] = useState({ location: '', tagline: '', instagram: '', twitter: '', soundcloud: '', youtube: '', influenced_by: '', avatar_border: 'none', name_glow: 'none' });
  const [totalPlays, setTotalPlays] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef(null);
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [snippetConfirmed, setSnippetConfirmed] = useState(null);
  const [pinnedId, setPinnedId] = useState(() => getPinnedTrack(currentUser?.username));

  const [myUploads, setMyUploads] = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [savedBeats, setSavedBeats] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [uploadReactions, setUploadReactions] = useState({});
  const [tasteMatches, setTasteMatches] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingBeat, setEditingBeat] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [followList, setFollowList] = useState(null); // { type: 'followers'|'following', users: [] }
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Load real taste matches from DB
  useEffect(() => {
    if (!currentUser?.username || !tracks?.length) return;

    async function loadTasteMatches() {
      try {
        // Get my liked genres
        const myVotes = userVotes || {};
        const myLikedIds = Object.entries(myVotes).filter(([,v]) => v === 'right').map(([id]) => id);
        const myLikedTracks = tracks.filter(t => myLikedIds.includes(String(t.id)));
        const myGenres = new Set(myLikedTracks.map(t => t.genre));
        if (myGenres.size === 0) return;

        // Get all other users' votes
        const votesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?vote=eq.right&select=user_id,track_id`,
          { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
        );
        const allVotes = await votesRes.json();
        if (!Array.isArray(allVotes)) return;

        // Get all profiles (except me)
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=neq.${encodeURIComponent(currentUser.username)}&select=username,avatar_color,role`,
          { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
        );
        const profiles = await profilesRes.json();
        if (!Array.isArray(profiles)) return;

        // Build votes map per user
        const votesByUser = {};
        allVotes.forEach(v => {
          if (!votesByUser[v.user_id]) votesByUser[v.user_id] = [];
          votesByUser[v.user_id].push(v.track_id);
        });

        // We need user_id → username mapping — get from profiles by id
        // But profiles use username not id as primary key in our system
        // So match by checking which tracks they liked and what genres those are
        const matches = profiles.map(profile => {
          // Find votes from this profile (we don't have their id easily, skip for now)
          // Use a simpler approach: compare by track overlap
          return { username: profile.username, avatarColor: profile.avatar_color, role: profile.role, pct: 0, shared: [] };
        }).filter(m => m.pct > 0).slice(0, 3);

        // Better approach: load each user's liked tracks by their votes
        // Get all right-votes with user info by joining through profiles
        const votesWithUsersRes = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?vote=eq.right&select=user_id,track_id`,
          { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
        );
        const votesData = await votesWithUsersRes.json();

        // Group track_ids by user_id
        const userTrackMap = {};
        if (Array.isArray(votesData)) {
          votesData.forEach(v => {
            if (!userTrackMap[v.user_id]) userTrackMap[v.user_id] = [];
            userTrackMap[v.user_id].push(String(v.track_id));
          });
        }

        // Get profiles with their ids
        const profilesWithIdRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=neq.${encodeURIComponent(currentUser.username)}&select=id,username,avatar_color,role`,
          { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
        );
        const profilesWithId = await profilesWithIdRes.json();

        const scored = (Array.isArray(profilesWithId) ? profilesWithId : []).map(profile => {
          const theirTrackIds = userTrackMap[profile.id] || [];
          const theirTracks = tracks.filter(t => theirTrackIds.includes(String(t.id)));
          const theirGenres = new Set(theirTracks.map(t => t.genre));
          const shared = [...myGenres].filter(g => theirGenres.has(g));
          const total = new Set([...myGenres, ...theirGenres]).size;
          const pct = total > 0 ? Math.round((shared.length / total) * 100) : 0;
          return { username: profile.username, avatarColor: profile.avatar_color, role: profile.role, pct, shared };
        }).filter(m => m.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 3);

        setTasteMatches(scored);
      } catch (err) {
        console.error('Taste match error:', err);
      }
    }
    loadTasteMatches();
  }, [currentUser?.username, tracks?.length, JSON.stringify(userVotes)]);

  // Load follower/following counts
  useEffect(() => {
    if (!currentUser?.username) return;
    fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}&select=follower_count,following_count`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(data => {
      const prof = Array.isArray(data) ? data[0] : data;
      if (prof) {
        setFollowerCount(prof.follower_count || 0);
        setFollowingCount(prof.following_count || 0);
      }
    }).catch(() => {});
  }, [currentUser?.username]);

  // Load saved beats
  useEffect(() => {
    if (!currentUser?.username) { setSavedLoading(false); return; }
    fetch(`${SUPABASE_URL}/rest/v1/saved_beats?user_username=eq.${encodeURIComponent(currentUser.username)}&select=track_id,created_at&order=created_at.desc`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(async data => {
      if (!Array.isArray(data) || data.length === 0) { setSavedBeats([]); setSavedLoading(false); return; }
      const ids = data.map(d => d.track_id).join(',');
      const tracksRes = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=in.(${ids})&select=id,title,artist,cover_url,price,audio_url,uploaded_by_username`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
      });
      const tracks = await tracksRes.json();
      setSavedBeats(Array.isArray(tracks) ? tracks : []);
    }).catch(() => setSavedBeats([])).finally(() => setSavedLoading(false));
  }, [currentUser?.username]);

  // Load extra profile fields
  useEffect(() => {
    if (!currentUser?.username) return;
    fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}&select=location,tagline,instagram,twitter,soundcloud,youtube,influenced_by,avatar_border,name_glow`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(data => {
      const p = Array.isArray(data) ? data[0] : data;
      if (p) setProfileExtra({ location: p.location||'', tagline: p.tagline||'', instagram: p.instagram||'', twitter: p.twitter||'', soundcloud: p.soundcloud||'', youtube: p.youtube||'', influenced_by: p.influenced_by||'', avatar_border: p.avatar_border||'none', name_glow: p.name_glow||'none' });
    }).catch(() => {});

    // Load total plays from tracks
    fetch(`${SUPABASE_URL}/rest/v1/tracks?uploaded_by_username=eq.${encodeURIComponent(currentUser.username)}&select=play_count`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTotalPlays(data.reduce((s, t) => s + (t.play_count || 0), 0));
    }).catch(() => {});
  }, [currentUser?.username]);

  // Load avatar — check localStorage first, then DB
  useEffect(() => {
    if (!currentUser?.username) return;
    // Check localStorage session first
    try {
      const saved = localStorage.getItem('tsh_session');
      if (saved) {
        const session = JSON.parse(saved);
        if (session.avatarUrl) { setAvatarUrl(session.avatarUrl); return; }
      }
    } catch {}
    // Fall back to DB
    fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}&select=avatar_url`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(data => {
      const url = Array.isArray(data) ? data[0]?.avatar_url : data?.avatar_url;
      if (url) setAvatarUrl(url);
    }).catch(() => {});
  }, [currentUser?.username]);

  useEffect(() => {
    if (!currentUser?.username) {
      setUploadsLoading(false);
      return;
    }

    let cancelled = false;
    setUploadsLoading(true);

    async function loadUploads() {
      try {
        const url = `${SUPABASE_URL}/rest/v1/tracks?uploaded_by_username=eq.${encodeURIComponent(currentUser.username)}&order=listed_at.desc`;
        const res = await fetch(url, {
          headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
        });
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data)) {
          const mapped = data.map(t => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            genre: t.genre,
            coverUrl: t.cover_url || "",
            cops: t.cops || 0,
            passes: t.passes || 0,
            price: t.price || 0,
            licenseType: t.license_type || "lease",
            listedAt: t.listed_at,
          }));
          setMyUploads(mapped);
        } else {
          setMyUploads([]);
        }
      } catch (err) {
        console.error('Failed to load uploads:', err);
        if (!cancelled) setMyUploads([]);
      } finally {
        if (!cancelled) setUploadsLoading(false);
      }
    }

    loadUploads();
    return () => { cancelled = true; };
  }, [currentUser?.username]);

  if (!currentUser) return null;

  const voteEntries = Object.entries(userVotes || {});
  const seen = voteEntries.length;
  const copsGiven = voteEntries.filter(([, v]) => v === "right").length;
  const passCount = voteEntries.filter(([, v]) => v === "left").length;
  const copPct = seen > 0 ? Math.round((copsGiven / seen) * 100) : 0;
  const tasteScore = copsGiven * 10 + seen * 1;

  const coppedTrackIds = voteEntries.filter(([, v]) => v === "right").map(([id]) => String(id));
  const coppedTracks = (tracks || []).filter(t => coppedTrackIds.includes(String(t.id)));
  const coppedGenres = [...new Set(coppedTracks.map(t => t.genre))];

  const badgeStats = {
    totalHards: copsGiven,
    totalTrash: passCount,
    totalRated: seen,
    uniqueGenres: coppedGenres.length,
  };

  // tasteMatches loaded from real DB via useEffect

  function saveEdit() {
    setUserData("bio", editBio);
    setUserData("avatarColor", editColor);
    // Save extra fields to DB
    fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(profileExtra),
    }).catch(() => {});
    setEditing(false);
  }

  function handlePin(trackId) {
    const newId = pinnedId === trackId ? null : trackId;
    setPinnedId(newId);
    setPinnedTrack(currentUser.username, newId);
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    // Show cropper first
    setCropFile(file);
  }

  async function handleCroppedAvatar(croppedFile) {
    setCropFile(null);
    setUploadingAvatar(true);
    const file = croppedFile;
    try {
      const ext = file.name.split('.').pop();
      const path = `${currentUser.id || currentUser.username}/avatar.${ext}`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file,
      });
      if (uploadRes.ok) {
        const url = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;
        setAvatarUrl(url);
        // Save to profiles table via direct REST
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`, {
          method: 'PATCH',
          headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: url }),
        });
        // Save to localStorage session so it persists on reload
        try {
          const saved = localStorage.getItem('tsh_session');
          if (saved) {
            const session = JSON.parse(saved);
            session.avatarUrl = url;
            localStorage.setItem('tsh_session', JSON.stringify(session));
          }
        } catch {}
      }
    } catch (err) { console.error('Avatar upload error:', err); }
    finally { setUploadingAvatar(false); }
  }

  async function handleDeleteTrack(trackId) {
    setConfirmDelete(trackId);
  }

  async function confirmDeleteTrack() {
    const trackId = confirmDelete;
    setConfirmDelete(null);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/tracks?id=eq.${trackId}`,
        { method: 'DELETE', headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
      );
      if (res.ok || res.status === 204) {
        setMyUploads(prev => prev.filter(t => t.id !== trackId));
        if (pinnedId === trackId) { setPinnedId(null); setPinnedTrack(currentUser.username, null); }
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  function handleSnippetConfirm(result) {
    setSnippetConfirmed(result);
    setShowSnippetPicker(false);
  }

  const pinnedTrack = pinnedId
    ? (tracks || []).find(t => t.id === pinnedId) || myUploads.find(t => t.id === pinnedId)
    : null;

  // Total cops received on all uploads
  const totalCopsReceived = myUploads.reduce((sum, t) => sum + (t.cops || 0), 0);

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div
          className={`profile-avatar ${profileExtra.avatar_border !== 'none' ? `avatar-border-${profileExtra.avatar_border}` : ''}`}
          style={{ background: avatarUrl ? 'transparent' : currentUser.avatarColor, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
          onClick={() => avatarInputRef.current?.click()}
          title="Change profile picture"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            currentUser.username[0].toUpperCase()
          )}
          {uploadingAvatar && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '12px' }}>
              ⏳
            </div>
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>
        <div className="profile-info">
          <div className={`profile-username ${profileExtra.name_glow !== 'none' ? `name-glow-${profileExtra.name_glow}` : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser.username}
            {currentUser.role === 'admin' && (
              <span style={{
                background: 'linear-gradient(135deg, #00f5ff, #bf5fff)',
                color: '#000', fontSize: '9px', fontFamily: 'var(--font-head)',
                fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                letterSpacing: '1px', textTransform: 'uppercase',
              }}>ADMIN</span>
            )}
            {currentUser.isBetaTester && currentUser.role !== 'admin' && (
              <span style={{
                background: 'linear-gradient(135deg, #ff9900, #ff3366)',
                color: '#fff', fontSize: '9px', fontFamily: 'var(--font-head)',
                fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                letterSpacing: '1px', textTransform: 'uppercase',
              }}>BETA TESTER</span>
            )}
          </div>
          {/* Follower/Following counts - clickable */}
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', marginTop: '2px', marginBottom: '2px', display: 'flex', gap: '12px' }}>
            <span style={{ cursor: 'pointer' }} onClick={async () => {
              const data = await fetch(`${SUPABASE_URL}/rest/v1/follows?following_username=eq.${encodeURIComponent(currentUser.username)}&select=follower_username`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }).then(r => r.json());
              setFollowList({ type: 'followers', users: Array.isArray(data) ? data.map(d => d.follower_username) : [] });
            }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{followerCount}</span>
              <span style={{ marginLeft: '3px' }}>followers</span>
            </span>
            <span style={{ cursor: 'pointer' }} onClick={async () => {
              const data = await fetch(`${SUPABASE_URL}/rest/v1/follows?follower_username=eq.${encodeURIComponent(currentUser.username)}&select=following_username`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }).then(r => r.json());
              setFollowList({ type: 'following', users: Array.isArray(data) ? data.map(d => d.following_username) : [] });
            }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{followingCount}</span>
              <span style={{ marginLeft: '3px' }}>following</span>
            </span>
          </div>
          {!editing && (
            <>
              <div className="profile-bio">{currentUser.bio || "no bio yet..."}</div>
              {profileExtra.tagline && <div style={{ fontSize: '12px', color: 'var(--cyan)', fontFamily: 'var(--font-body)', marginTop: '2px', fontStyle: 'italic' }}>{profileExtra.tagline}</div>}
              {profileExtra.location && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>📍 {profileExtra.location}</div>}
              {profileExtra.influenced_by && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', marginTop: '4px' }}>
                  🎵 Influenced by: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{profileExtra.influenced_by}</span>
                </div>
              )}
              {(profileExtra.instagram || profileExtra.twitter || profileExtra.soundcloud || profileExtra.youtube) && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {profileExtra.instagram && <a href={`https://instagram.com/${profileExtra.instagram}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>📸 Instagram</a>}
                  {profileExtra.twitter && <a href={`https://x.com/${profileExtra.twitter}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>🐦 Twitter</a>}
                  {profileExtra.soundcloud && <a href={`https://soundcloud.com/${profileExtra.soundcloud}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>☁️ SoundCloud</a>}
                  {profileExtra.youtube && <a href={`https://youtube.com/@${profileExtra.youtube}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>▶️ YouTube</a>}
                </div>
              )}
            </>
          )}
          {/* Edit button only shown inline — form is a full-screen modal */}
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="profile-edit-btn" onClick={() => setEditing(true)} title="Edit profile">✏️</button>
            <button className="profile-edit-btn" title="Share profile" onClick={async () => {
              const url = `https://808market.app/u/${currentUser.username}`;
              try {
                if (navigator.share) {
                  await navigator.share({ title: `${currentUser.username} on 808market`, url });
                } else {
                  await navigator.clipboard.writeText(url);
                  alert('Profile link copied!');
                }
              } catch {}
            }}>📤</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--green)" }}>{totalCopsReceived}</div>
          <div className="stat-label">❤️ likes recv'd</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--purple)" }}>{myUploads.length}</div>
          <div className="stat-label">🎵 beats</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--cyan)" }}>{totalPlays}</div>
          <div className="stat-label">🎧 plays</div>
        </div>
      </div>

      {/* Pinned Track */}
      {pinnedTrack && (
        <div className="profile-section">
          <div className="section-title">📌 PINNED BEAT</div>
          <div className="pinned-track-card">
            <div
              className="pinned-track-thumb"
              style={{ backgroundImage: `url(${pinnedTrack.coverUrl})` }}
            />
            <div className="pinned-track-info">
              <div className="pinned-track-title">{pinnedTrack.title}</div>
              <div className="pinned-track-artist">{pinnedTrack.artist}</div>
              <span className="genre-tag" style={{ fontSize: "10px", padding: "2px 8px" }}>{pinnedTrack.genre}</span>
            </div>
            <div className="pinned-indicator">📌</div>
          </div>
        </div>
      )}

      {/* Taste tags */}


      {/* Badges */}
      <div className="profile-section">
        <div className="section-title">BADGES</div>
        <div className="badges-grid">
          {BADGES.map((badge) => {
            const earned = badge.check(badgeStats);
            return (
              <div
                key={badge.id}
                className={`badge-chip ${earned ? "badge-chip--earned" : "badge-chip--locked"}`}
                title={badge.desc}
              >
                <span className="badge-emoji">{earned ? badge.emoji : "🔒"}</span>
                <span className="badge-label">{badge.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Beats */}
      <div className="profile-section">
        <div className="section-title">🎵 MY BEATS</div>

        {uploadsLoading ? (
          <div style={{ color: "var(--cyan)", fontSize: "13px", padding: "8px 0", fontFamily: "var(--font-body)" }}>loading beats...</div>
        ) : myUploads.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: "13px", padding: "8px 0", fontFamily: "var(--font-body)" }}>no beats listed yet. drop something!</div>
        ) : (
          <div className="uploads-list">
            {myUploads.map((track) => {
              const total = (track.cops || 0) + (track.passes || 0);
              const hp = total > 0 ? Math.round(((track.cops || 0) / total) * 100) : 0;
              const reactions = uploadReactions[track.id] || {};
              const topRx = getTopReaction(reactions);
              const isPinned = pinnedId === track.id;
              const price = track.price || 0;
              const isFree = !price || price === 0;

              return (
                <div key={track.id} className="upload-track-card">
                  <div className="upload-track-header">
                    <div
                      className="upload-track-thumb"
                      style={{ backgroundImage: `url(${track.coverUrl})` }}
                    />
                    <div className="upload-track-meta">
                      <div className="upload-track-title">{track.title}</div>
                      <div className="upload-track-genre" style={{ display: "flex", gap: "6px", marginTop: "4px", alignItems: "center" }}>
                        <span className="genre-tag">{track.genre}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-head)", color: isFree ? "var(--cyan)" : "var(--green)" }}>
                          {isFree ? "FREE" : `$${price}`}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className={`btn-bevel pin-btn ${isPinned ? "pin-btn--active" : ""}`}
                        onClick={() => handlePin(track.id)}
                        title={isPinned ? "Unpin" : "Pin this beat"}
                      >
                        {isPinned ? "📌" : "PIN"}
                      </button>
                      <button
                        className="btn-bevel"
                        onClick={() => setEditingBeat(track)}
                        title="Edit beat"
                        style={{ fontSize: "12px", padding: "4px 8px" }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-bevel"
                        onClick={() => handleDeleteTrack(track.id)}
                        title="Delete beat"
                        style={{ color: "var(--red)", borderColor: "var(--red)", fontSize: "12px", padding: "4px 8px" }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="upload-analytics">
                    <div className="analytics-row">
                      <div className="analytics-item">
                        <span className="analytics-label">ratings</span>
                        <span className="analytics-value">{total}</span>
                      </div>
                      <div className="analytics-item">
                        <span className="analytics-label">like %</span>
                        <span className="analytics-value" style={{ color: "var(--green)" }}>{hp}%</span>
                      </div>
                      <div className="analytics-item">
                        <span className="analytics-label">likes</span>
                        <span className="analytics-value" style={{ color: "var(--cyan)" }}>{track.cops || 0}</span>
                      </div>
                      {topRx && (
                        <div className="analytics-item">
                          <span className="analytics-label">top react</span>
                          <span className="analytics-value">{topRx}</span>
                        </div>
                      )}
                    </div>
                    <div className="analytics-ratio-bar">
                      <div
                        className="analytics-ratio-fill"
                        style={{ width: total > 0 ? `${hp}%` : "50%" }}
                      />
                    </div>
                    <div className="analytics-ratio-labels">
                      <span style={{ color: "var(--green)" }}>❤️ {track.cops || 0} likes</span>
                      <span style={{ color: "var(--red)" }}>💨 {track.passes || 0} passes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          className="btn-primary"
          style={{ marginTop: "14px", fontSize: "14px", padding: "12px 24px", display: "block", width: "100%" }}
          onClick={() => onUpload?.()}
        >
          + Upload Beat
        </button>

        {snippetConfirmed && (
          <div className="snippet-confirmed">
            ✓ Snippet set: {Math.floor(snippetConfirmed.startSec / 60)}:{String(Math.floor(snippetConfirmed.startSec % 60)).padStart(2,"0")} → {Math.floor(snippetConfirmed.endSec / 60)}:{String(Math.floor(snippetConfirmed.endSec % 60)).padStart(2,"0")}
          </div>
        )}
      </div>


      {/* Saved Beats */}
      <div className="profile-section">
        <div className="section-title">🔖 SAVED BEATS</div>
        {savedLoading ? (
          <div style={{ color: 'var(--cyan)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>loading...</div>
        ) : savedBeats.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>No saved beats yet. Tap 🔖 on any beat to save it for later.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedBeats.map(beat => {
              const isFree = !beat.price || beat.price === 0;
              return (
                <div key={beat.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '8px', background: beat.cover_url ? `url(${beat.cover_url}) center/cover` : 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{beat.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: 'var(--font-body)' }}>by {beat.artist || beat.uploaded_by_username}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', color: isFree ? 'var(--cyan)' : 'var(--green)', flexShrink: 0 }}>{isFree ? 'FREE' : `$${beat.price}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Logout */}
      <div style={{ padding: "16px", textAlign: "center" }}>
        <button className="btn-secondary" onClick={logout} style={{ fontSize: "14px", padding: "10px 24px", color: "var(--red)", borderColor: "rgba(255,51,102,0.3)" }}>
          Log Out
        </button>
      </div>

      {showSnippetPicker && (
        <SnippetPicker
          onClose={() => setShowSnippetPicker(false)}
          onConfirm={handleSnippetConfirm}
        />
      )}

      {/* Followers/Following modal */}
      {followList && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '70vh', overflowY: 'auto', padding: '20px', animation: 'slideUp 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', textTransform: 'capitalize' }}>
                {followList.type}
              </h3>
              <button onClick={() => setFollowList(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            {followList.users.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>
                {followList.type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </div>
            ) : (
              followList.users.map(username => (
                <div key={username} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                  onClick={() => { setFollowList(null); onViewUser?.(username); }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '16px', color: '#000', flexShrink: 0 }}>
                    {username[0].toUpperCase()}
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px' }}>@{username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Full-screen edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 400, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '0 0 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '60px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: '#000', zIndex: 10 }}>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '16px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '16px' }}>Edit Profile</span>
            <button onClick={saveEdit} style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', color: '#000', borderRadius: '20px', padding: '6px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Save</button>
          </div>
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Name glow picker */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Name Glow {myUploads.length < 5 && <span style={{ color: '#ff3366', fontSize: '10px' }}>🔒 Upload 5 beats to unlock ({myUploads.length}/5)</span>}
              </label>
              {myUploads.length >= 5 ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'none', label: 'Off', style: { background: 'rgba(255,255,255,0.1)', color: '#fff' } },
                    { value: 'cyan', label: 'Cyan', style: { background: '#00f5ff', color: '#000' } },
                    { value: 'purple', label: 'Purple', style: { background: '#bf5fff', color: '#000' } },
                    { value: 'green', label: 'Green', style: { background: '#00ff88', color: '#000' } },
                    { value: 'gold', label: 'Gold', style: { background: '#ffd700', color: '#000' } },
                    { value: 'red', label: 'Red', style: { background: '#ff3366', color: '#fff' } },
                    { value: 'rainbow', label: '🌈', style: { background: 'linear-gradient(135deg, #ff3366, #ff9900, #00f5ff, #bf5fff)', color: '#000' } },
                  ].map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setProfileExtra(prev => ({ ...prev, name_glow: g.value }))}
                      style={{ ...g.style, border: `2px solid ${profileExtra.name_glow === g.value ? '#fff' : 'transparent'}`, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)' }}>
                  🔒 Upload {5 - myUploads.length} more beat{5 - myUploads.length !== 1 ? 's' : ''} to unlock name glow
                </div>
              )}
            </div>

            {/* Avatar border picker */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase' }}>Avatar Border</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {[
                  { value: 'none', bg: 'rgba(255,255,255,0.15)', label: '✕' },
                  { value: 'cyan', bg: '#00f5ff' },
                  { value: 'purple', bg: '#bf5fff' },
                  { value: 'green', bg: '#00ff88' },
                  { value: 'gold', bg: '#ffd700' },
                  { value: 'rainbow', bg: 'linear-gradient(135deg, #ff3366, #ff9900, #00f5ff, #bf5fff)' },
                ].map(b => (
                  <button key={b.value} type="button" onClick={() => setProfileExtra(prev => ({ ...prev, avatar_border: b.value }))}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${profileExtra.avatar_border === b.value ? '#fff' : 'transparent'}`, background: b.bg, cursor: 'pointer', fontSize: '12px', color: '#000', fontWeight: 700 }}>
                    {profileExtra.avatar_border === b.value ? '✓' : (b.label || '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar color picker */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase' }}>Avatar Color</label>
              <div className="avatar-color-picker">
                {AVATAR_COLORS.map(color => (
                  <button key={color} type="button"
                    className={`avatar-color-option ${editColor === color ? "avatar-color-option--selected" : ""}`}
                    style={{ background: color }} onClick={() => setEditColor(color)} />
                ))}
              </div>
            </div>
            {/* Fields */}
            {[
              { state: editBio, set: setEditBio, placeholder: 'Bio...', label: 'BIO', maxLen: 80, isExtra: false },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>{f.label}</label>
                <input className="auth-input" value={f.state} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} maxLength={f.maxLen} />
              </div>
            ))}
            {[
              { key: 'influenced_by', label: 'INFLUENCED BY', placeholder: 'e.g. Metro Boomin, Southside, Pi\'erre' },
              { key: 'tagline', label: 'TAGLINE', placeholder: 'e.g. Trap producer from ATL' },
              { key: 'location', label: 'LOCATION', placeholder: 'e.g. Atlanta, GA' },
              { key: 'instagram', label: 'INSTAGRAM', placeholder: 'handle (no @)' },
              { key: 'twitter', label: 'TWITTER / X', placeholder: 'handle (no @)' },
              { key: 'soundcloud', label: 'SOUNDCLOUD', placeholder: 'username' },
              { key: 'youtube', label: 'YOUTUBE', placeholder: 'channel name' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>{f.label}</label>
                <input className="auth-input" value={profileExtra[f.key]} onChange={e => setProfileExtra(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} maxLength={80} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image cropper */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          onCrop={handleCroppedAvatar}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Edit beat modal */}
      {editingBeat && (
        <EditBeatModal
          track={editingBeat}
          onClose={() => setEditingBeat(null)}
          onSave={(updated) => {
            setMyUploads(prev => prev.map(t => t.id === updated.id ? updated : t));
            setEditingBeat(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,51,102,0.4)', borderRadius: '16px', padding: '28px 24px', maxWidth: '320px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑</div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Delete this beat?</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px' }}>This can't be undone.</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Cancel
              </button>
              <button onClick={confirmDeleteTrack} style={{ flex: 1, padding: '12px', background: 'var(--red)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
