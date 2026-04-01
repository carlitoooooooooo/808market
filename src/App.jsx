import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { useAuth } from "./AuthContext.jsx";
import AuthScreen from "./AuthScreen.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
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
import AnalyticsPage from "./AnalyticsPage.jsx";
import StorefrontPage from "./StorefrontPage.jsx";
import MessagesPage from "./MessagesPage.jsx";
import LandingPage from "./LandingPage.jsx";
import AuthPrompt from "./AuthPrompt.jsx";
import UserSearch from "./UserSearch.jsx";
import AchievementPopup from "./AchievementPopup.jsx";
import OnboardingModal from "./OnboardingModal.jsx";
import tracksData from "./tracks.js";
import { supabase } from "./supabase.js";
import { dbUpsert, dbSelect, dbUpdate, dbInsert } from "./dbHelper.js";


const TABS = [
  { id: "discover", label: "🎵 Discover" },
  { id: "leaderboard", label: "🔥 Top Beats" },
  { id: "profile", label: "👤 Profile" },
  { id: "notifications", label: "🔔 Notifs" },
  { id: "create", label: "🏪 Create" },
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

function BetaTag() {
  const [taps, setTaps] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const timerRef = React.useRef(null);

  function handleTap() {
    const next = taps + 1;
    setTaps(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTaps(0), 1200);
    if (next >= 3) {
      setTaps(0);
      setSpinning(true);
      setTimeout(() => setSpinning(false), 2500);
    }
  }

  return (
    <span
      className={`beta-tag${spinning ? ' beta-tag--spinning' : ''}`}
      onClick={handleTap}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {spinning ? 'STILL BETA' : <><span>BETA</span><span style={{ fontSize: '8px', opacity: 0.6, marginLeft: '3px', fontWeight: 500, letterSpacing: '0.5px' }}>v1.9</span></>}
    </span>
  );
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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]'); } catch { return []; }
  });
  const [storefrontUser, setStorefrontUser] = useState(null);
  const [messageThread, setMessageThread] = useState(null); // username to open DM with
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [guestMode, setGuestMode] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showUserSearch, setShowUserSearch] = useState(false); // for directing to login vs signup
  const [viewingUser, setViewingUser] = useState(null);
  const [deepLinkTrack, setDeepLinkTrack] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [discoverFeed, setDiscoverFeed] = useState("foryou"); // "foryou" | "following" | "browse"
  const [showStripeReminder, setShowStripeReminder] = useState(false);
  const [browseTrack, setBrowseTrack] = useState(null);
  const [browseLimit, setBrowseLimit] = useState(50); // Max cards to show, increases with "Show More"
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseBpmMin, setBrowseBpmMin] = useState('');
  const [browseBpmMax, setBrowseBpmMax] = useState('');
  const [followingList, setFollowingList] = useState([]); // usernames current user follows
  const [producerProfiles, setProducerProfiles] = useState({}); // username -> { name_glow, avatar_url, ... }
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');
    } catch {
      return [];
    }
  });
  const [showOnboarding, setShowOnboarding] = useState(false); // Show onboarding modal
  const toastTimer = useRef(null);
  const notifTimer = useRef(null);
  const startOverRef = useRef(false); // Flag to bypass queue rebuild during reset

  // Apply theme on mount
  useEffect(() => {
    try {
      const selectedTheme = localStorage.getItem('selectedTheme') || 'default';
      document.documentElement.setAttribute('data-theme', selectedTheme);
      const cursorAnim = JSON.parse(localStorage.getItem('cursorAnimation') || 'false');
      if (cursorAnim) {
        document.documentElement.classList.add('cursor-animation-enabled');
      }
    } catch {}
  }, []);



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
          const mapped = data.map(mapTrack);
          setTracks(mapped);
          // Load producer profiles for name glows
          const usernames = [...new Set(mapped.map(t => t.uploadedBy).filter(Boolean))];
          if (usernames.length > 0) {
            const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
            fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=in.(${usernames.join(',')})&select=username,name_glow,avatar_url,avatar_color`, {
              headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
            }).then(r => r.json()).then(profiles => {
              if (Array.isArray(profiles)) {
                const map = {};
                profiles.forEach(p => { map[p.username] = p; });
                setProducerProfiles(map);
              }
            }).catch(() => {});
          }
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

  // Poll unread DM count in background
  const loadUnreadMessages = useCallback(async () => {
    if (!currentUser?.username) return;
    try {
      const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
      const res = await fetch(
        `https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/messages?recipient=eq.${encodeURIComponent(currentUser.username)}&read=eq.false&select=id`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) setUnreadMessages(data.length);
    } catch {}
  }, [currentUser?.username]);

  useEffect(() => {
    loadUnreadCount();
    if (notifTimer.current) clearInterval(notifTimer.current);
    notifTimer.current = setInterval(loadUnreadCount, 30000);
    return () => { if (notifTimer.current) clearInterval(notifTimer.current); };
  }, [loadUnreadCount]);

  const msgPollTimer = useRef(null);
  useEffect(() => {
    loadUnreadMessages();
    if (msgPollTimer.current) clearInterval(msgPollTimer.current);
    msgPollTimer.current = setInterval(loadUnreadMessages, 15000);
    return () => { if (msgPollTimer.current) clearInterval(msgPollTimer.current); };
  }, [loadUnreadMessages]);

  // Deep link: /track/:id
  useEffect(() => {
    const match = window.location.pathname.match(/^\/track\/([^/]+)/);
    if (match && tracks.length > 0) {
      const trackId = match[1];
      const found = tracks.find(t => String(t.id) === trackId);
      if (found) { setDeepLinkTrack(found); history.replaceState(null, '', '/'); }
    }
  }, [tracks]);

  // Activity status: update last_seen every 2 minutes while app is open
  useEffect(() => {
    if (!currentUser?.username) return;
    const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
    const hideActivity = JSON.parse(localStorage.getItem('hideActivityStatus') || 'false');
    if (hideActivity) return; // don't update if user hides their status

    const ping = () => {
      fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`, {
        method: 'PATCH',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_seen: new Date().toISOString() }),
      }).catch(() => {});
    };

    ping(); // ping immediately on load
    const interval = setInterval(ping, 2 * 60 * 1000); // then every 2 min
    return () => clearInterval(interval);
  }, [currentUser?.username]);

  // Check if producer needs Stripe reminder
  useEffect(() => {
    if (!currentUser?.username) return;
    if (localStorage.getItem(`stripeReminderDismissed_${currentUser.username}`)) return;
    const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
    // Check if they have beats but no stripe account
    fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}&select=stripe_account_id`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
    }).then(r => r.json()).then(data => {
      const hasStripe = data?.[0]?.stripe_account_id;
      if (!hasStripe) {
        fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/tracks?uploaded_by_username=eq.${encodeURIComponent(currentUser.username)}&select=id&limit=1`, {
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
        }).then(r => r.json()).then(tracks => {
          if (Array.isArray(tracks) && tracks.length > 0) setShowStripeReminder(true);
        });
      }
    }).catch(() => {});
  }, [currentUser?.username]);

  // Handle /analytics route
  useEffect(() => {
    if (window.location.pathname === '/analytics') {
      history.replaceState(null, '', '/');
      setShowAnalytics(true);
    }
  }, []);

  // Handle /admin route — store intent, open after auth loads
  const adminIntentRef = useRef(window.location.pathname === '/admin');
  useEffect(() => {
    if (!adminIntentRef.current || authLoading) return;
    adminIntentRef.current = false;
    history.replaceState(null, '', '/');
    const TEAM_MEMBERS = ['avalions'];
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || TEAM_MEMBERS.includes(currentUser?.username);
    if (isAdmin) setShowAdmin(true);
    else setToast({ message: '🚫 Access denied', visible: true });
  }, [currentUser, authLoading]);



  // Load active announcements
  useEffect(() => {
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
    fetch('https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/announcements?is_active=eq.true&order=created_at.desc&limit=5', {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAnnouncements(data); })
      .catch(() => {});
  }, []);

  // Handle /store/:username route
  useEffect(() => {
    const match = window.location.pathname.match(/^\/store\/([^/]+)/);
    if (match) {
      const username = decodeURIComponent(match[1]);
      history.replaceState(null, '', '/');
      setStorefrontUser(username);
    }
  }, []);

  // PRO upgrade success handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pro') === 'success') {
      history.replaceState(null, '', '/');
      setToast({ message: '💎 Welcome to PRO! Your exclusive features are now unlocked.', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 6000);
    }
  }, []);

  // Stripe Connect return handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStatus = params.get('connect');
    if (connectStatus === 'success') {
      history.replaceState(null, '', '/');
      setToast({ message: '✅ Stripe connected! You\'ll now receive payouts automatically.', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
    } else if (connectStatus === 'refresh') {
      // Onboarding wasn't completed — re-open settings
      history.replaceState(null, '', '/');
      setToast({ message: '⚠️ Stripe setup incomplete. Open Settings → Tools to finish.', visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 6000);
    }
  }, []);

  // Purchase success handler
  const [purchaseModal, setPurchaseModal] = useState(null); // { trackTitle, artist, audioUrl, licenseType }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'success') {
      const sessionId = params.get('session_id');
      const trackId = params.get('track_id');
      history.replaceState(null, '', '/');

      // Try API first, fall back to direct Supabase lookup
      const fallback = () => {
        if (!trackId) return;
        fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/tracks?id=eq.${trackId}&select=id,title,audio_url,artist,license_type`, {
          headers: {
            apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA',
          }
        })
        .then(r => r.json())
        .then(data => {
          const track = Array.isArray(data) ? data[0] : data;
          if (track?.audio_url) {
            setPurchaseModal({ success: true, trackTitle: track.title, artist: track.artist, audioUrl: track.audio_url, licenseType: track.license_type });
          }
        })
        .catch(() => {});
      };

      if (sessionId) {
        fetch(`/api/get-purchase?session_id=${sessionId}&track_id=${trackId}`)
          .then(r => r.json())
          .then(data => {
            if (data.success) setPurchaseModal(data);
            else fallback();
          })
          .catch(() => fallback());
      } else if (trackId) {
        fallback();
      }
    }
  }, []);

  // Deep link: /u/:username
  useEffect(() => {
    const match = window.location.pathname.match(/^\/u\/([^/]+)/);
    if (match) {
      const username = decodeURIComponent(match[1]);
      setViewingUser(username);
      history.replaceState(null, '', '/');
    }
  }, []);

  // Build queue - SIMPLE VERSION (no smart algorithm - for testing)
  useEffect(() => {
    if (!currentUser || tracksLoading || votesLoading || tracks.length === 0) return;
    
    // Skip rebuild if Start Over just cleared votes (use manual shuffle instead)
    if (startOverRef.current) {
      startOverRef.current = false;
      return;
    }
    
    const votedIds = new Set(Object.keys(userVotes).map(String));
    const unvoted = tracks.filter(t => !votedIds.has(String(t.id)));
    
    // Just shuffle - no complex algorithm
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

  // Haptic feedback utility
  const triggerHaptic = useCallback((pattern = "light") => {
    try {
      const hapticEnabled = JSON.parse(localStorage.getItem('hapticEnabled') || 'true');
      if (!hapticEnabled) return;
      
      const patterns = {
        light: 10,
        medium: [30],
        strong: [50, 50, 50],
      };
      const vibrationPattern = patterns[pattern] || patterns.light;
      
      if (navigator.vibrate) {
        navigator.vibrate(vibrationPattern);
      } else if (navigator.webkitVibrate) {
        navigator.webkitVibrate(vibrationPattern);
      }
    } catch (e) {
      // Haptic not supported or disabled
    }
  }, []);

  // Achievement checking and unlock
  const checkAndUnlockAchievement = useCallback((achievementId) => {
    if (unlockedAchievements.includes(achievementId)) return;
    
    const newUnlocked = [...unlockedAchievements, achievementId];
    setUnlockedAchievements(newUnlocked);
    localStorage.setItem('unlockedAchievements', JSON.stringify(newUnlocked));
    setCurrentAchievement(achievementId);
    triggerHaptic('strong');
  }, [unlockedAchievements, triggerHaptic]);

  // Check achievements after vote or profile update
  const checkAchievements = useCallback(async (stats) => {
    if (!currentUser) return;
    
    const cops = stats?.cops || 0;
    const followers = stats?.followers || 0;
    const nameGlow = stats?.name_glow || false;
    
    if (cops >= 50 && !unlockedAchievements.includes('cops_50')) {
      checkAndUnlockAchievement('cops_50');
    }
    if (cops >= 100 && !unlockedAchievements.includes('cops_100')) {
      checkAndUnlockAchievement('cops_100');
    }
    if (followers >= 100 && !unlockedAchievements.includes('followers_100')) {
      checkAndUnlockAchievement('followers_100');
    }
    if (followers >= 500 && !unlockedAchievements.includes('followers_500')) {
      checkAndUnlockAchievement('followers_500');
    }
    if (nameGlow && !unlockedAchievements.includes('name_glow')) {
      checkAndUnlockAchievement('name_glow');
    }
  }, [currentUser, unlockedAchievements, checkAndUnlockAchievement]);

  const handleSwipe = useCallback(async (dir, track, cardRect) => {
    if (!currentUser) {
      // Guest — only allow passing, not liking
      if (dir === "right") { requireAuth(); return; }
      setQueue(prev => prev.filter(t => t.id !== track.id));
      return;
    }

    // Haptic feedback on vote
    triggerHaptic(dir === "right" ? "medium" : "light");

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

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            setShowOnboarding(false);
            if (currentUser?.username) {
              localStorage.setItem(`onboarding_completed_${currentUser.username}`, '1');
            }
          }}
          onSkip={() => {
            setShowOnboarding(false);
            if (currentUser?.username) {
              localStorage.setItem(`onboarding_completed_${currentUser.username}`, '1');
            }
          }}
        />
      )}

      {/* TEST BUTTON - ALWAYS VISIBLE */}
      <button 
        onClick={() => setShowOnboarding(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 20px',
          background: '#ff3366',
          color: '#fff',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 100,
          fontFamily: 'var(--font-head)',
        }}
      >
        📖 ONBOARDING
      </button>

      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Logo />
          <BetaTag />
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
          {currentUser && (
            <button onClick={() => setActiveTab("messages")} style={{
              background: unreadMessages > 0 ? 'rgba(0,245,255,0.12)' : 'none',
              border: `1px solid ${unreadMessages > 0 ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
              color: unreadMessages > 0 ? '#00f5ff' : 'rgba(255,255,255,0.5)',
              borderRadius: '50%', width: '32px', height: '32px', fontSize: '15px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              💬
              {unreadMessages > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ff3366', color: '#fff', fontSize: '9px', fontWeight: 700, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
          )}
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
            {/* TEST: Onboarding button (remove later) */}
            {currentUser && (
              <button 
                onClick={() => setShowOnboarding(true)}
                style={{
                  margin: '8px 12px 0',
                  padding: '10px 14px',
                  background: 'rgba(0,245,255,0.15)',
                  border: '1px solid rgba(0,245,255,0.4)',
                  borderRadius: '12px',
                  color: '#00f5ff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-head)',
                }}
              >
                📖 Show Onboarding
              </button>
            )}

            {/* Stripe Connect Reminder Banner */}
            {showStripeReminder && currentUser && (
              <div style={{ margin: '8px 12px 0', background: 'linear-gradient(135deg, rgba(99,91,255,0.15), rgba(0,245,255,0.1))', border: '1px solid rgba(99,91,255,0.4)', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px' }}>💳</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', color: '#fff' }}>Get paid automatically</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>Connect Stripe to receive 85% of every sale directly to your bank</div>
                </div>
                <button onClick={() => { setShowStripeReminder(false); setShowSettings(true); }}
                  style={{ background: 'linear-gradient(135deg, #635bff, #00f5ff)', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Connect →
                </button>
                <button onClick={() => { setShowStripeReminder(false); localStorage.setItem(`stripeReminderDismissed_${currentUser.username}`, '1'); }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', padding: '2px', flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            )}
            {/* For You / Following / Browse toggle */}
            {currentUser && (
              <div className="feed-toggle">
                <button
                  className={`feed-toggle-btn ${discoverFeed === "foryou" ? "feed-toggle-btn--active" : ""}`}
                  onClick={() => setDiscoverFeed("foryou")}
                >For You</button>
                <button
                  className={`feed-toggle-btn ${discoverFeed === "following" ? "feed-toggle-btn--active" : ""}`}
                  onClick={() => setDiscoverFeed("following")}
                >Following</button>
                <button
                  className={`feed-toggle-btn ${discoverFeed === "browse" ? "feed-toggle-btn--active" : ""}`}
                  onClick={() => setDiscoverFeed("browse")}
                >Browse</button>
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

            {/* ── Browse search + BPM filter ── */}
            {discoverFeed === "browse" && (
              <div style={{ display: 'flex', gap: '8px', padding: '0 0 12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Search beats or producers..."
                  value={browseSearch}
                  onChange={e => { setBrowseSearch(e.target.value); setBrowseLimit(50); }}
                  style={{
                    flex: '1 1 200px', padding: '9px 14px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px',
                    color: '#fff', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none',
                    minWidth: '150px'
                  }}
                />
                <input
                  type="number"
                  placeholder="BPM min"
                  value={browseBpmMin}
                  onChange={e => { setBrowseBpmMin(e.target.value); setBrowseLimit(50); }}
                  style={{
                    width: '90px', padding: '9px 12px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px',
                    color: '#fff', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none'
                  }}
                />
                <input
                  type="number"
                  placeholder="BPM max"
                  value={browseBpmMax}
                  onChange={e => { setBrowseBpmMax(e.target.value); setBrowseLimit(50); }}
                  style={{
                    width: '90px', padding: '9px 12px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px',
                    color: '#fff', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none'
                  }}
                />
                {(browseSearch || browseBpmMin || browseBpmMax) && (
                  <button onClick={() => { setBrowseSearch(''); setBrowseBpmMin(''); setBrowseBpmMax(''); setBrowseLimit(50); }}
                    style={{ padding: '9px 14px', background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '20px', color: '#ff3366', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-head)' }}>
                    ✕ Clear
                  </button>
                )}
              </div>
            )}

            {/* ── Browse grid ── */}
            {discoverFeed === "browse" && (
              <div className="browse-grid">
                {(() => {
                  const q = browseSearch.toLowerCase().trim();
                  const bpmMin = browseBpmMin ? parseInt(browseBpmMin) : null;
                  const bpmMax = browseBpmMax ? parseInt(browseBpmMax) : null;
                  const filtered = (activeGenre === "ALL" ? tracks : tracks.filter(t => t.genre === activeGenre))
                    .filter(t => {
                      if (q && !t.title?.toLowerCase().includes(q) && !t.artist?.toLowerCase().includes(q) && !(t.uploadedBy || '').toLowerCase().includes(q)) return false;
                      if (bpmMin && t.bpm < bpmMin) return false;
                      if (bpmMax && t.bpm > bpmMax) return false;
                      return true;
                    });
                  if (tracksLoading) return <div className="empty-queue"><div className="empty-queue__icon">⏳</div><div className="empty-queue__text">Loading beats...</div></div>;
                  if (filtered.length === 0) return <div className="empty-queue"><div className="empty-queue__icon">🎧</div><div className="empty-queue__text">No beats found</div></div>;
                  return filtered.slice(0, browseLimit).map(track => {
                  const isFree = !track.price || track.price === 0;
                  return (
                    <div key={track.id} className="browse-card" onClick={() => setBrowseTrack(track)}>
                      <div className="browse-card__cover" style={{ backgroundImage: `url(${track.coverUrl})` }} />
                      <div className="browse-card__info">
                        <div className="browse-card__title">{track.title}</div>
                        <div className={`browse-card__artist${producerProfiles[track.uploadedBy]?.name_glow && producerProfiles[track.uploadedBy].name_glow !== 'none' && (producerProfiles[track.uploadedBy]?.role === 'admin' || ['avalions'].includes(track.uploadedBy)) ? ` name-glow-${producerProfiles[track.uploadedBy].name_glow}` : ''}`}>@{track.artist}</div>
                        <div className="browse-card__meta">
                          <span className="genre-tag" style={{ fontSize: '9px', padding: '1px 6px' }}>{track.genre}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-head)', color: isFree ? 'var(--cyan)' : 'var(--green)' }}>{isFree ? 'FREE' : `$${track.price}`}</span>
                        </div>
                      </div>
                    </div>
                  );
                  });
                })()}
              </div>
            )}

            {browseTrack && (
              <TrackModal
                track={browseTrack}
                onClose={() => setBrowseTrack(null)}
                onVote={(dir, track) => { handleVoteFromModal(dir, track); setBrowseTrack(null); }}
                userVotes={userVotes}
                onViewUser={setViewingUser}
              />
            )}

            {/* Show More button for browse tab */}
            {discoverFeed === "browse" && (() => {
              const q = browseSearch.toLowerCase().trim();
              const bpmMin = browseBpmMin ? parseInt(browseBpmMin) : null;
              const bpmMax = browseBpmMax ? parseInt(browseBpmMax) : null;
              const filtered = (activeGenre === "ALL" ? tracks : tracks.filter(t => t.genre === activeGenre))
                .filter(t => {
                  if (q && !t.title?.toLowerCase().includes(q) && !t.artist?.toLowerCase().includes(q) && !(t.uploadedBy || '').toLowerCase().includes(q)) return false;
                  if (bpmMin && t.bpm < bpmMin) return false;
                  if (bpmMax && t.bpm > bpmMax) return false;
                  return true;
                });
              return browseLimit < filtered.length ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <button 
                  onClick={() => setBrowseLimit(prev => prev + 50)}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #00f5ff, #bf5fff)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '20px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-head)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  📦 Show More ({browseLimit} / {filtered.length})
                </button>
              </div>
              ) : null;
            })()}

            {discoverFeed !== "browse" && (tracksLoading ? (
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
                      startOverRef.current = true; // Prevent queue effect from rebuilding
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
            ))}

            {discoverFeed !== "browse" && !tracksLoading && !tracksError && filteredQueue.length > 0 && (
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
            onViewStorefront={(u) => setStorefrontUser(u)}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationsPage
            onNotificationsRead={loadUnreadCount}
            onOpenTrack={(trackId) => {
              const found = tracks.find(t => String(t.id) === String(trackId));
              if (found) setDeepLinkTrack(found);
            }}
            onOpenUser={(username) => setViewingUser(username)}
          />
        )}

        {activeTab === "profile" && (
          <ProfilePage userVotes={userVotes} tracks={tracks} onViewUser={(username) => setViewingUser(username)} onUpload={() => setShowUpload(true)} onOpenSettings={() => setShowSettings(true)} onOpenStorefront={(u) => setStorefrontUser(u)} />
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

      {/* Messages: full-screen overlay, sits above app-main but below modals */}
      {activeTab === "create" && currentUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto' }}>
          <StorefrontPage username={currentUser.username} onBack={() => setActiveTab("discover")} />
        </div>
      )}

      {activeTab === "messages" && currentUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Spacer for the app header */}
          <div style={{ height: '56px', flexShrink: 0, width: '100%' }} />
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '860px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <MessagesPage
              key={messageThread}
              initialThread={messageThread}
              onUnreadChange={setUnreadMessages}
              onViewUser={(username) => setViewingUser(username)}
            />
          </div>
          {/* Spacer for bottom nav on mobile */}
          <div style={{ height: '64px', flexShrink: 0 }} />
        </div>
      )}

      {showSettings && (
        <SettingsPage onClose={() => setShowSettings(false)} onOpenAnalytics={() => setShowAnalytics(true)} onOpenStorefront={() => setStorefrontUser(currentUser?.username)} onOpenAdmin={() => setShowAdmin(true)} onOpenAbout={() => setShowAbout(true)} />
      )}

      {showAnalytics && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'var(--bg)', overflowY: 'auto' }}>
          <AnalyticsPage onBack={() => setShowAnalytics(false)} />
        </div>
      )}

      {storefrontUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto' }}>
          <StorefrontPage username={storefrontUser} onBack={() => setStorefrontUser(null)} />
        </div>
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
          onSelectTrack={(trackId) => {
            const found = tracks.find(t => String(t.id) === String(trackId));
            if (found) setDeepLinkTrack(found);
          }}
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
          onOpenStorefront={(u) => { setViewingUser(null); setStorefrontUser(u); }}
          onMessageUser={(username) => {
            setViewingUser(null);
            setMessageThread(username);
            setActiveTab("messages");
          }}
        />
      )}

      <AchievementPopup
        achievement={currentAchievement}
        onAnimationEnd={() => setCurrentAchievement(null)}
      />

      {/* Admin Dashboard */}
      {showAdmin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000 }}>
          <AdminDashboard onClose={() => setShowAdmin(false)} />
        </div>
      )}

      {/* Active Announcements — Banner, Popup, or Notification based on type */}
      {announcements
        .filter(a => !dismissedAnnouncements.includes(a.id) && (!a.expires_at || new Date(a.expires_at) > new Date()))
        .slice(0, 1)
        .map(a => {
          const dismiss = () => {
            const next = [...dismissedAnnouncements, a.id];
            setDismissedAnnouncements(next);
            localStorage.setItem('dismissedAnnouncements', JSON.stringify(next));
          };
          if (a.type === 'popup') return (
            <div key={a.id} style={{ position: 'fixed', inset: 0, zIndex: 8999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: '#111', border: '1px solid rgba(0,245,255,0.3)', borderRadius: '16px', padding: '28px 24px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📢</div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', marginBottom: '12px', color: '#fff' }}>Announcement</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: '20px' }}>{a.body}</div>
                <button onClick={dismiss} style={{ background: 'linear-gradient(135deg,#00f5ff,#bf5fff)', border: 'none', borderRadius: '12px', color: '#000', fontWeight: 700, fontSize: '14px', padding: '12px 28px', cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Got it ✓</button>
              </div>
            </div>
          );
          // Banner (default) and notification both show as top banner
          return (
            <div key={a.id} style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 8999,
              background: 'linear-gradient(135deg, rgba(99,91,255,0.97), rgba(0,245,255,0.92))',
              color: '#000', padding: '10px 16px', display: 'flex', alignItems: 'center',
              gap: '10px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              boxShadow: '0 2px 12px rgba(0,245,255,0.3)',
            }}>
              <span style={{ fontSize: '16px' }}>{a.type === 'notification' ? '🔔' : '📢'}</span>
              <span style={{ flex: 1 }}>{a.body}</span>
              <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#000', padding: '2px 6px', fontWeight: 700 }}>✕</button>
            </div>
          );
        })}

      {/* Purchase Success Modal */}
      {purchaseModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
            padding: '32px 28px', maxWidth: '420px', width: '100%', textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              Purchase Complete!
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '6px' }}>
              {purchaseModal.trackTitle} — {purchaseModal.artist}
            </div>
            <div style={{ color: 'var(--cyan)', fontSize: '12px', fontFamily: 'var(--font-head)', marginBottom: '24px' }}>
              {purchaseModal.licenseType === 'exclusive' ? 'Exclusive License' : purchaseModal.licenseType === 'lease' ? 'Non-Exclusive Lease' : 'License'}
            </div>
            <a
              href={purchaseModal.audioUrl}
              download={`${purchaseModal.trackTitle} - ${purchaseModal.artist}.mp3`}
              onClick={() => setTimeout(() => setPurchaseModal(null), 1000)}
              style={{
                display: 'block', padding: '14px 20px',
                background: 'linear-gradient(135deg, #00f5ff, #bf5fff)',
                color: '#000', borderRadius: '12px', fontWeight: 700,
                fontSize: '15px', fontFamily: 'var(--font-head)',
                textDecoration: 'none', marginBottom: '12px'
              }}
            >
              ⬇️ Download Beat
            </a>
            <button
              onClick={() => setPurchaseModal(null)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

