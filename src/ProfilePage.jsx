import React, { useState, useEffect, useMemo } from "react";
import { useAuth, AVATAR_COLORS } from "./AuthContext.jsx";
import { BADGES } from "./badges.js";
import { MOCK_USERS } from "./mockUsers.js";
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

export default function ProfilePage({ userVotes, tracks }) {
  const { currentUser, setUserData, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState(currentUser?.bio || "");
  const [editColor, setEditColor] = useState(currentUser?.avatarColor || AVATAR_COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef(null);
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [snippetConfirmed, setSnippetConfirmed] = useState(null);
  const [pinnedId, setPinnedId] = useState(() => getPinnedTrack(currentUser?.username));

  const [myUploads, setMyUploads] = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [uploadReactions, setUploadReactions] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingBeat, setEditingBeat] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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

  function calcMatch(otherVotes) {
    const otherCopIds = Object.entries(otherVotes)
      .filter(([, v]) => v === "right")
      .map(([id]) => String(id));
    const otherCopTracks = (tracks || []).filter(t => otherCopIds.includes(String(t.id)));
    const otherGenres = new Set(otherCopTracks.map(t => t.genre));
    const myGenres = new Set(coppedGenres);
    const shared = [...myGenres].filter(g => otherGenres.has(g));
    const total = new Set([...myGenres, ...otherGenres]).size;
    const pct = total > 0 ? Math.round((shared.length / total) * 100) : 0;
    return { pct, shared };
  }

  const tasteMatches = MOCK_USERS.map(u => ({
    ...u,
    ...calcMatch(u.votes),
  })).sort((a, b) => b.pct - a.pct).slice(0, 3);

  function saveEdit() {
    setUserData("bio", editBio);
    setUserData("avatarColor", editColor);
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
          className="profile-avatar"
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
          <div className="profile-username" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          {/* Follower/Following counts */}
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', marginTop: '2px', marginBottom: '2px' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{followerCount}</span> followers
            {' · '}
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{followingCount}</span> following
          </div>
          {!editing && (
            <div className="profile-bio">{currentUser.bio || "no bio yet..."}</div>
          )}
          {editing && (
            <div className="profile-edit-form">
              <input
                className="auth-input"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="your bio..."
                maxLength={80}
              />
              <div className="avatar-color-picker" style={{ marginTop: "8px" }}>
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`avatar-color-option ${editColor === color ? "avatar-color-option--selected" : ""}`}
                    style={{ background: color }}
                    onClick={() => setEditColor(color)}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button className="btn-primary" onClick={saveEdit} style={{ fontSize: "13px", padding: "8px 16px" }}>
                  Save
                </button>
                <button className="btn-secondary" onClick={() => setEditing(false)} style={{ fontSize: "13px", padding: "8px 16px" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {!editing && (
          <button className="profile-edit-btn" onClick={() => setEditing(true)}>
            ✏️
          </button>
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
          <div className="stat-value" style={{ color: "var(--cyan)" }}>0</div>
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
      {copsGiven > 0 && (
        <div className="profile-section">
          <div className="section-title">🎯 YOUR TASTE</div>
          <div className="taste-tags">
            {copsGiven > 0 && <span className="taste-tag">❤️ Collector</span>}
            {copPct > 70 && <span className="taste-tag">💎 Picky AF</span>}
            {copPct < 30 && <span className="taste-tag">🎯 Discerning</span>}
            {seen > 10 && <span className="taste-tag">👀 Deep Diver</span>}
            {tasteScore > 100 && <span className="taste-tag">⚡ Taste God</span>}
            {coppedGenres.map((g) => (
              <span key={g} className="taste-tag" style={{ borderColor: "var(--purple)", color: "var(--purple)" }}>{g}</span>
            ))}
          </div>
        </div>
      )}

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

      {/* Taste Match */}
      <div className="profile-section">
        <div className="section-title">💞 TASTE MATCH</div>
        {coppedGenres.length === 0 ? (
          <div className="taste-match-empty">Cop some beats to see your matches!</div>
        ) : (
          <div className="taste-match-list">
            {tasteMatches.map((u) => (
              <div key={u.username} className="taste-match-card">
                <div
                  className="taste-match-avatar"
                  style={{ background: u.avatarColor }}
                >
                  {u.username[0].toUpperCase()}
                </div>
                <div className="taste-match-info">
                  <div className="taste-match-username">@{u.username}</div>
                  <div className="taste-match-bar-wrap">
                    <div className="taste-match-bar">
                      <div
                        className="taste-match-fill"
                        style={{ width: `${u.pct}%` }}
                      />
                    </div>
                    <span className="taste-match-pct">{u.pct}%</span>
                  </div>
                  {u.shared.length > 0 && (
                    <div className="taste-match-genres">
                      {u.shared.map((g) => (
                        <span key={g} className="taste-match-genre-tag">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
          onClick={() => setShowSnippetPicker(true)}
        >
          + Upload Beat
        </button>

        {snippetConfirmed && (
          <div className="snippet-confirmed">
            ✓ Snippet set: {Math.floor(snippetConfirmed.startSec / 60)}:{String(Math.floor(snippetConfirmed.startSec % 60)).padStart(2,"0")} → {Math.floor(snippetConfirmed.endSec / 60)}:{String(Math.floor(snippetConfirmed.endSec % 60)).padStart(2,"0")}
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
