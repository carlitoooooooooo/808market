import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { useAuth } from "./AuthContext.jsx";
import AuthScreen from "./AuthScreen.jsx";
import SwipeCard from "./SwipeCard.jsx";
import LeaderboardPage from "./LeaderboardPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import TrackModal from "./TrackModal.jsx";
import Logo from "./Logo.jsx";
import TrackUpload from "./TrackUpload.jsx";
import NotificationsPage from "./NotificationsPage.jsx";
import UserProfilePage from "./UserProfilePage.jsx";
import { FireAnimation, TrashAnimation } from "./SwipeAnimations.jsx";
import AboutPage from "./AboutPage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import LandingPage from "./LandingPage.jsx";
import AuthPrompt from "./AuthPrompt.jsx";
import UserSearch from "./UserSearch.jsx";
import tracksData from "./tracks.js";
import { supabase } from "./supabase.js";
import { dbUpsert, dbSelect, dbUpdate, dbInsert } from "./dbHelper.js";

const TABS = [
  { id: "discover", label: "🎵 Discover" },
  { id: "leaderboard", label: "🔥 Top Beats" },
  { id: "notifications", label: "🔔 Notifs" },
  { id: "profile", label: "👤 Profile" },
];

const GENRES = ["ALL", "Hip-Hop", "Drill", "Trap", "R&B", "Electronic", "Other"];

// Normalize old license_type values to new display format
function normalizeLicense(val) {
  if (!val || val === 'lease') return 'Non-Exclusive Lease';
  if (val === 'exclusive') return 'Exclusive';
  if (val === 'free') return 'Free Download';
  return val;
}

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
    licenseType: normalizeLicense(t.license_type),
    beatKey: t.beat_key || "",
    paymentLink: t.payment_link || "",
    soundcloudUrl: t.soundcloud_url || null,
    embedUrl: t.embed_url || null,
    isSoundCloud: !!(t.soundcloud_url),
    producerNotes: t.producer_notes || "",
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

  const [showUpload, setShowUpload] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showUserSearch, setShowUserSearch] = useState(false); // for directing to login vs signup
  const [viewingUser, setViewingUser] = useState(null);
  const [deepLinkTrack, setDeepLinkTrack] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [discoverFeed, setDiscoverFeed] = useState("foryou"); // "foryou" | "following"
  const [followingList, setFollowingList] = useState([]); // usernames current user follows
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

  // Load following list for current user
  useEffect(() => {
    if (!currentUser?.username) return;
    async function loadFollowing() {
      try {
        const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
        const res = await fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/follows?follower_username=eq.${encodeURIComponent(currentUser.username)}&select=following_username`, {
          headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setFollowingList(data.map(r => r.following_username));
        }
      } catch (err) {
        console.error('Load following list error:', err);
      }
    }
    loadFollowing();
  }, [currentUser?.username]);

  // Load user votes via direct REST
  const [votesLoading, setVotesLoading] = useState(true);
  useEffect(() => {
    if (!currentUser?.id) { setVotesLoading(false); return; }
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
      } finally {
        setVotesLoading(false);
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
      if (found) { setDeepLinkTrack(found); history.replaceState(null, '', '/'); }
    }
  }, [tracks]);

  // Deep link: /u/:username
  useEffect(() => {
    const match = window.location.pathname.match(/^\/u\/([^/]+)/);
    if (match) {
      const username = decodeURIComponent(match[1]);
      setViewingUser(username);
      history.replaceState(null, '', '/');
    }
  }, []);

  // Build queue
  useEffect(() => {
    if (!currentUser || tracksLoading || votesLoading || tracks.length === 0) return;
    const votedIds = new Set(Object.keys(userVotes).map(String));
    const unvoted = tracks.filter(t => !votedIds.has(String(t.id)));
    const shuffled = [...unvoted].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
  }, [currentUser?.id, tracksLoading, votesLoading, tracks.length, JSON.stringify(userVotes)]);

  const showToast = useCallback((msg) => {
    setToast({ message: msg, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 1500);
  }, []);

  const requireAuth = useCallback(() => {
    setShowAuthPrompt(true);
  }, []);

  const handleSwipe = useCallback(async (dir, track, cardRect) => {
    if (!currentUser) {
      // Guest — only allow passing, not liking
      if (dir === "right") { requireAuth(); return; }
      setQueue(prev => prev.filter(t => t.id !== track.id));
      return;
    }

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

    // Persist vote
    try {
      await dbUpsert('votes', {
        user_id: currentUser.id,
        track_id: track.id,
        vote: dir,
      }, 'user_id,track_id');

      // Atomically increment the counter using RPC (no race condition)
      const field = dir === "right" ? "cops" : "passes";
      const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
      await fetch('https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/rpc/increment_track_field', {
        method: 'POST',
        headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: track.id, field_name: field, amount: 1 }),
      });

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

  if (!currentUser && !guestMode && !showAuth) {
    return (
      <LandingPage
        onGetStarted={() => setShowAuth(true)}
        onBrowseAsGuest={() => setGuestMode(true)}
        onLogin={() => setShowAuth(true)}
      />
    );
  }

  if (!currentUser && showAuth) {
    return <AuthScreen />;
  }

  const followingQueue = discoverFeed === "following" && currentUser
    ? queue.filter(t => followingList.includes(t.uploadedBy))
    : queue;

  const filteredQueue = activeGenre === "ALL"
    ? followingQueue
    : followingQueue.filter((t) => t.genre === activeGenre);

  const stackedCards = filteredQueue.slice(0, 4);

  return (
    <div className="app">
      <div className="app-bg" />

      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Logo />
          <span className="beta-tag">BETA</span>
        </div>

        {/* Desktop inline nav — hidden on mobile via CSS */}
        <nav className="desktop-nav">
          {(currentUser ? TABS : TABS.filter(t => t.id === 'discover')).map((tab) => (
            <button
              key={tab.id}
              className={`desktop-nav-tab ${activeTab === tab.id ? "desktop-nav-tab--active" : ""}`}
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowUserSearch(true)} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.5)', borderRadius: '50%',
            width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>🔍</button>
          <button onClick={() => setShowAbout(true)} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.5)', borderRadius: '20px',
            padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
          }}>About</button>
          {currentUser ? (
            <>
              <button className="btn-upload" onClick={() => setShowUpload(true)}>
                + LIST BEAT
              </button>
              <button className="header-settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
            </>
          ) : (
            <>
              <button onClick={() => { setGuestMode(false); setShowAuth(true); }} style={{
                background: 'none', border: '1px solid rgba(0,245,255,0.4)',
                color: '#00f5ff', borderRadius: '20px', padding: '5px 14px',
                fontSize: '12px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
              }}>Log In</button>
              <button onClick={() => { setGuestMode(false); setShowAuth(true); }} style={{
                background: 'linear-gradient(135deg, #00f5ff, #bf5fff)',
                border: 'none', color: '#000', borderRadius: '20px',
                padding: '5px 14px', fontSize: '12px', cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
              }}>Sign Up</button>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        {activeTab === "discover" && (
          <div className="discover-view">
            {/* For You / Following toggle */}
            {currentUser && (
              <div className="feed-toggle">
                <button
                  className={`feed-toggle-btn ${discoverFeed === "foryou" ? "feed-toggle-btn--active" : ""}`}
                  onClick={() => setDiscoverFeed("foryou")}
                >
                  For You
                </button>
                <button
                  className={`feed-toggle-btn ${discoverFeed === "following" ? "feed-toggle-btn--active" : ""}`}
                  onClick={() => setDiscoverFeed("following")}
                >
                  Following
                </button>
              </div>
            )}

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
            ) : discoverFeed === "following" && followingList.length === 0 ? (
              <div className="empty-queue">
                <div className="empty-queue__icon">👥</div>
                <div className="empty-queue__text">No one followed yet</div>
                <div className="empty-queue__sub">Follow some producers to see their beats here</div>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="empty-queue">
                <div className="empty-queue__icon">🎧</div>
                <div className="empty-queue__text">
                  {discoverFeed === "following" ? "No new beats from who you follow" : activeGenre === "ALL" ? "You've heard it all!" : `No more ${activeGenre}`}
                </div>
                <div className="empty-queue__sub">
                  {discoverFeed === "following" ? "Check back later or explore more producers" : activeGenre === "ALL" ? "Check the top beats 🔥" : "Try another genre 👆"}
                </div>
                {discoverFeed === "foryou" && activeGenre === "ALL" && (
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
                {discoverFeed === "foryou" && activeGenre !== "ALL" && (
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
          <ProfilePage userVotes={userVotes} tracks={tracks} onViewUser={(username) => setViewingUser(username)} onUpload={() => setShowUpload(true)} onOpenSettings={() => setShowSettings(true)} />
        )}
      </main>

      {/* Guest mode banner */}
      {guestMode && !currentUser && (
        <div style={{ background: 'rgba(0,245,255,0.08)', borderTop: '1px solid rgba(0,245,255,0.2)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif" }}>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>👀 Browsing as guest</span>
          <button onClick={() => { setGuestMode(false); setShowAuth(true); }} style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', color: '#000', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            Join Free
          </button>
        </div>
      )}

      <nav className="bottom-nav">
        {(currentUser ? TABS : TABS.filter(t => t.id === 'discover')).map((tab) => (
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

      {showSettings && (
        <SettingsPage onClose={() => setShowSettings(false)} />
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

      {showAbout && <AboutPage onClose={() => setShowAbout(false)} />}

      {showUserSearch && (
        <UserSearch
          onSelectUser={(username) => { setViewingUser(username); }}
          onClose={() => setShowUserSearch(false)}
        />
      )}

      <AuthPrompt
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSignUp={() => { setShowAuthPrompt(false); setGuestMode(false); setShowAuth(true); }}
        onLogIn={() => { setShowAuthPrompt(false); setGuestMode(false); setShowAuth(true); }}
      />

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
