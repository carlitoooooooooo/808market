import React, { useState, useEffect, useMemo } from "react";
import { useAuth, AVATAR_COLORS } from "./AuthContext.jsx";
import { BADGES } from "./badges.js";
import { MOCK_USERS } from "./mockUsers.js";
import SnippetPicker from "./SnippetPicker.jsx";
import { supabase } from "./supabase.js";

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

  // Load avatar from DB
  useEffect(() => {
    if (!currentUser?.username) return;
    supabase.from('profiles').select('avatar_url').eq('username', currentUser.username).maybeSingle()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); });
  }, [currentUser?.username]);

  useEffect(() => {
    if (!currentUser?.id) return;

    setUploadsLoading(true);
    supabase
      .from('tracks')
      .select('*')
      .eq('uploaded_by_username', currentUser.username)
      .order('listed_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const mapped = data.map(t => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            genre: t.genre,
            coverUrl: t.cover_url || "",
            cops: t.cops || t.hards || 0,
            passes: t.passes || t.trash || 0,
            price: t.price || 0,
            licenseType: t.license_type || "lease",
            listedAt: t.listed_at,
          }));
          setMyUploads(mapped);

          mapped.forEach(async (track) => {
            const { data: rxData } = await supabase
              .from('reactions')
              .select('emoji')
              .eq('track_id', track.id);
            if (rxData) {
              const counts = {};
              rxData.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
              setUploadReactions(prev => ({ ...prev, [track.id]: counts }));
            }
          });
        }
        setUploadsLoading(false);
      });
  }, [currentUser?.id]);

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
    setUploadingAvatar(true);
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
        // Save to profiles table
        await supabase.from('profiles').update({ avatar_url: url }).eq('username', currentUser.username);
      }
    } catch (err) { console.error('Avatar upload error:', err); }
    finally { setUploadingAvatar(false); }
  }

  async function handleDeleteTrack(trackId) {
    if (!window.confirm("Delete this beat? This can't be undone.")) return;
    await supabase.from('tracks').delete().eq('id', trackId).eq('uploaded_by_username', currentUser.username);
    setMyUploads(prev => prev.filter(t => t.id !== trackId));
    if (pinnedId === trackId) {
      setPinnedId(null);
      setPinnedTrack(currentUser.username, null);
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
          <div className="profile-username">{currentUser.username}</div>
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
          <div className="stat-value">{seen}</div>
          <div className="stat-label">rated</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--cyan)" }}>{copPct}%</div>
          <div className="stat-label">cop %</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--green)" }}>{totalCopsReceived}</div>
          <div className="stat-label">cops recv'd</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--purple)" }}>{myUploads.length}</div>
          <div className="stat-label">beats listed</div>
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
            {copsGiven > 0 && <span className="taste-tag">🛒 Collector</span>}
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
                        <span className="analytics-label">cop %</span>
                        <span className="analytics-value" style={{ color: "var(--green)" }}>{hp}%</span>
                      </div>
                      <div className="analytics-item">
                        <span className="analytics-label">cops</span>
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
                      <span style={{ color: "var(--green)" }}>🛒 {track.cops || 0} cops</span>
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
    </div>
  );
}
