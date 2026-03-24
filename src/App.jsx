import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { useAuth } from "./AuthContext.jsx";
import AuthScreen from "./AuthScreen.jsx";
import SwipeCard from "./SwipeCard.jsx";
import LeaderboardPage from "./LeaderboardPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import TrackModal from "./TrackModal.jsx";
import ReactionPicker from "./ReactionPicker.jsx";
import Logo from "./Logo.jsx";
import TrackUpload from "./TrackUpload.jsx";
import NotificationsPage from "./NotificationsPage.jsx";
import UserProfilePage from "./UserProfilePage.jsx";
import { FireAnimation, TrashAnimation } from "./SwipeAnimations.jsx";
import tracksData from "./tracks.js";
import { supabase } from "./supabase.js";
import { dbUpsert, dbSelect, dbUpdate, dbInsert } from "./dbHelper.js";

const TABS = [
  { id: "discover", label: "🎵 Discover" },
  { id: "leaderboard", label: "🔥 Top Beats" },
  { id: "notifications", label: "🔔 Notifs" },
  { id: "profile", label: "👤 Profile" },
];

const GENRES = ["ALL", "Hip-Hop", "R&B", "Drill", "Trap", "Afrobeats", "Jersey Club", "Hyperpop", "Indie", "Electronic", "Soul"];

const SEEN_KEY = (username) => `tsh_seen_${username}`;

function loadSeen(username) {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY(username)) || "[]"); } catch { return []; }
}
function saveSeen(username, seen) {
  localStorage.setItem(SEEN_KEY(username), JSON.stringify(seen));
}

// Map DB snake_case to camelCase for UI
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
    licenseType: t.license_type || "lease",
    beatKey: t.beat_key || "",
    paymentLink: t.payment_link || "",
    soundcloudUrl: t.soundcloud_url || null,
    embedUrl: t.embed_url || null,
    isSoundCloud: !!(t.soundcloud_url),
  };
}

function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? "toast--visible" : ""} ${message?.includes("Liked") ? "toast--hard" : "toast--trash"}`}>
      {message}
    </div>
  );
}

export default function App() {
  const { currentUser, authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("discover");
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [tracksError, setTracksError] = useState(null);
  const [queue, setQueue] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false });
  const [activeGenre, setActiveGenre] = useState("ALL");
  const [reactionTarget, setReactionTarget] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [deepLinkTrack, setDeepLinkTrack] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const toastTimer = useRef(null);
  const notifTimer = useRef(null);

  // Load tracks via direct REST (bypasses Supabase JS client auth)
  useEffect(() => {
    async function loadTracks() {
      setTracksLoading(true);
      try {
        const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
        const res = await fetch('https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/tracks?order=listed_at.desc', {
          headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}` }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTracks(data.map(mapTrack));
        } else {
          setTracks([]);
        }
      } catch (err) {
        console.error('Load tracks error:', err);
        setTracks([]);
      } finally {
        setTracksLoading(false);
      }
    }
    loadTracks();
  }, []);

  // Load user votes via direct REST
  useEffect(() => {
    if (!currentUser?.id) return;
    async function loadUserVotes() {
      try {
        const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
        const res = await fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/votes?user_id=eq.${currentUser.id}&select=track_id,vote`, {
          headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}` }
        });
        const data = await res.json();
        const votesMap = {};
        if (Array.isArray(data)) data.forEach(v => { votesMap[v.track_id] = v.vote; });
        setUserVotes(votesMap);
      } catch (err) {
        console.error('Load votes error:', err);
      }
    }
    loadUserVotes();
  }, [currentUser?.id]);

  // Load unread notification count
  const loadUnreadCount = useCallback(async () => {
    if (!currentUser?.username) return;
    try {
      const data = await dbSelect('notifications', { user_username: currentUser.username, read: false });
      if (Array.isArray(data)) setUnreadCount(data.length);
    } catch {}
  }, [currentUser?.username]);

  useEffect(() => {
    loadUnreadCount();
    if (notifTimer.current) clearInterval(notifTimer.current);
    notifTimer.current = setInterval(loadUnreadCount, 30000);
    return () => { if (notifTimer.current) clearInterval(notifTimer.current); };
  }, [loadUnreadCount]);

  // Deep link: /track/:id
  useEffect(() => {
    const match = window.location.pathname.match(/^\/track\/([^/]+)/);
    if (match && tracks.length > 0) {
      const trackId = match[1];
      const found = tracks.find(t => String(t.id) === trackId);
      if (found) {
        setDeepLinkTrack(found);
        history.replaceState(null, '', '/');
      }
    }
  }, [tracks]);

  // Build queue
  useEffect(() => {
    if (!currentUser || tracksLoading || tracks.length === 0) return;
    const votedIds = new Set(Object.keys(userVotes).map(String));
    const unvoted = tracks.filter(t => !votedIds.has(String(t.id)));
    const shuffled = [...unvoted].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
  }, [currentUser?.id, tracksLoading, tracks.length > 0, Object.keys(userVotes).length]);

  const showToast = useCallback((msg) => {
    setToast({ message: msg, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 1500);
  }, []);

  const handleSwipe = useCallback(async (dir, track) => {
    if (!currentUser) return;

    // Optimistic update
    setUserVotes(prev => ({ ...prev, [track.id]: dir }));
    setTracks(prev =>
      prev.map(t => {
        if (t.id !== track.id) return t;
        return {
          ...t,
          cops: (t.cops || 0) + (dir === "right" ? 1 : 0),
          passes: (t.passes || 0) + (dir === "left" ? 1 : 0),
        };
      })
    );
    setQueue(prev => prev.filter(t => t.id !== track.id));

    const seen = loadSeen(currentUser.username);
    if (!seen.includes(track.id)) {
      saveSeen(currentUser.username, [...seen, track.id]);
    }

    showToast(dir === "right" ? "❤️ Liked!" : "💨 PASSED");
    setReactionTarget({ trackId: track.id });

    // Persist vote
    try {
      await dbUpsert('votes', {
        user_id: currentUser.id,
        track_id: track.id,
        vote: dir,
      }, 'user_id,track_id');

      // Increment the relevant counter on the track
      const field = dir === "right" ? "cops" : "passes";
      const trackRows = await dbSelect('tracks', { id: track.id });
      const trackData = Array.isArray(trackRows) ? trackRows[0] : trackRows;
      if (trackData) {
        const currentVal = trackData[field] || trackData['hards'] || trackData['trash'] || 0;
        await dbUpdate('tracks', { id: track.id }, { [field]: currentVal + 1 });
      }

      // Send "cop" notification to uploader
      if (dir === "right" && track.uploadedBy && track.uploadedBy !== currentUser.username) {
        try {
          await dbInsert('notifications', {
            user_username: track.uploadedBy,
            type: 'like',
            from_username: currentUser.username,
            track_id: track.id,
            track_title: track.title,
            message: `${currentUser.username} liked your beat "${track.title}" ❤️`,
          });
        } catch (err) {
          console.error('Notification insert error:', err);
        }
      }
    } catch (err) {
      console.error('Vote save error (DB down, localStorage only):', err);
    }
  }, [currentUser, showToast]);

  const handleVoteFromModal = useCallback((dir, track) => {
    handleSwipe(dir, track);
  }, [handleSwipe]);

  const handleSoundCloudSubmit = useCallback((track) => {
    setTracks(prev => [track, ...prev]);
    setQueue(prev => [track, ...prev]);
    setShowUpload(false);
    showToast("🔥 BEAT LISTED!");
  }, [showToast]);

  const handleReactionDismiss = useCallback(() => {
    setReactionTarget(null);
  }, []);

  if (authLoading) {
    return (
      <div className="app">
        <div className="app-bg" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--cyan)", fontSize: "16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const filteredQueue = activeGenre === "ALL"
    ? queue
    : queue.filter((t) => t.genre === activeGenre);

  const stackedCards = filteredQueue.slice(0, 4);

  return (
    <div className="app">
      <div className="app-bg" />

      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Logo />
          <span className="beta-tag">BETA</span>
        </div>
        <button className="btn-upload" onClick={() => setShowUpload(true)}>
          + LIST BEAT
        </button>
      </header>

      <main className="app-main">
        {activeTab === "discover" && (
          <div className="discover-view">
            {/* Genre Filter Bar */}
            <div className="genre-filter-bar">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  className={`genre-pill ${activeGenre === genre ? "genre-pill--active" : ""}`}
                  onClick={() => setActiveGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>

            {tracksLoading ? (
              <div className="empty-queue">
                <div className="empty-queue__icon">⏳</div>
                <div className="empty-queue__text">Loading beats...</div>
              </div>
            ) : tracksError ? (
              <div className="empty-queue">
                <div className="empty-queue__icon">⚠️</div>
                <div className="empty-queue__text">Failed to load</div>
                <div className="empty-queue__sub">{tracksError}</div>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="empty-queue">
                <div className="empty-queue__icon">🎧</div>
                <div className="empty-queue__text">
                  {activeGenre === "ALL" ? "You've heard it all!" : `No more ${activeGenre}`}
                </div>
                <div className="empty-queue__sub">
                  {activeGenre === "ALL" ? "Check the top beats 🔥" : "Try another genre 👆"}
                </div>
                {activeGenre === "ALL" && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: "20px" }}
                    onClick={() => {
                      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                      setQueue(shuffled);
                      saveSeen(currentUser.username, []);
                      setUserVotes({});
                    }}
                  >
                    🔄 Start Over
                  </button>
                )}
                {activeGenre !== "ALL" && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: "20px" }}
                    onClick={() => setActiveGenre("ALL")}
                  >
                    Show All
                  </button>
                )}
              </div>
            ) : (
              <div className="card-stack">
                {stackedCards.map((track, idx) => (
                  <SwipeCard
                    key={track.id}
                    track={track}
                    isTop={idx === 0}
                    stackIndex={idx}
                    onSwipe={handleSwipe}
                  />
                ))}
              </div>
            )}

            {!tracksLoading && !tracksError && filteredQueue.length > 0 && (
              <div className="discover-swipe-hint">
                <span>← Pass</span>
                <span className="hint-count">{filteredQueue.length} beats</span>
                <span>Like →</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardPage
            tracks={tracks}
            onVote={handleVoteFromModal}
            userVotes={userVotes}
            onViewUser={setViewingUser}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationsPage
            onNotificationsRead={loadUnreadCount}
          />
        )}

        {activeTab === "profile" && (
          <ProfilePage userVotes={userVotes} tracks={tracks} />
        )}
      </main>

      <nav className="bottom-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? "nav-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ position: "relative" }}
          >
            {tab.label}
            {tab.id === "notifications" && unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <Toast message={toast.message} visible={toast.visible} />

      {reactionTarget && (
        <ReactionPicker
          trackId={reactionTarget.trackId}
          username={currentUser.username}
          onDismiss={handleReactionDismiss}
        />
      )}

      {showUpload && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <TrackUpload
              onSubmit={handleSoundCloudSubmit}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        </div>
      )}

      {deepLinkTrack && (
        <TrackModal
          track={deepLinkTrack}
          onClose={() => setDeepLinkTrack(null)}
          onVote={handleVoteFromModal}
          userVotes={userVotes}
          onViewUser={(username) => { setDeepLinkTrack(null); setViewingUser(username); }}
        />
      )}

      {viewingUser && (
        <UserProfilePage
          username={viewingUser}
          onClose={() => setViewingUser(null)}
          onOpenModal={(track) => { setViewingUser(null); setDeepLinkTrack(track); }}
          userVotes={userVotes}
        />
      )}
    </div>
  );
}
