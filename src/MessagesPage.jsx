import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { playMessageSound } from "./soundUtils.js";
import CommunityChat from "./CommunityChat.jsx";

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Chat Thread ───────────────────────────────────────────────────
function ChatThread({ otherUsername, onBack, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const threadId = [currentUser.username, otherUsername].sort().join("__");

  async function loadMessages() {
    try {
      const res = await fetch(
        `${URL}/rest/v1/messages?thread_id=eq.${encodeURIComponent(threadId)}&order=created_at.asc`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        // Check for new unread messages to play sound
        const unread = data.filter(m => m.recipient === currentUser.username && !m.read);
        const prevUnreadCount = messages.filter(m => m.recipient === currentUser.username && !m.read).length;
        
        setMessages(data);
        
        // Play sound if new unread messages arrived
        if (unread.length > prevUnreadCount && unread.length > 0) {
          playMessageSound();
        }
        
        // Mark received messages as read
        if (unread.length > 0) {
          fetch(`${URL}/rest/v1/messages?thread_id=eq.${encodeURIComponent(threadId)}&recipient=eq.${encodeURIComponent(currentUser.username)}`, {
            method: 'PATCH',
            headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true }),
          }).catch(() => {});
        }
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await fetch(`${URL}/rest/v1/messages`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          thread_id: threadId,
          sender: currentUser.username,
          recipient: otherUsername,
          body: text,
          read: false,
        }),
      });
      await loadMessages();
    } catch {}
    setSending(false);
  }

  return (
    <div className="chat-thread">
      {/* Header */}
      <div className="chat-thread__header">
        <button onClick={onBack} className="chat-thread__back">←</button>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px' }}>@{otherUsername}</div>
      </div>

      {/* Messages */}
      <div className="chat-thread__messages">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', paddingTop: '40px' }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', paddingTop: '40px' }}>No messages yet. Say something! 👋</div>
        ) : messages.map(msg => {
          const isMe = msg.sender === currentUser.username;
          const isAdmin = msg.is_admin_message || (msg.body && msg.body.startsWith('🐛 BUG REPORT'));
          
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                background: isAdmin 
                  ? 'rgba(255,215,0,0.1)' 
                  : isMe 
                    ? 'linear-gradient(135deg, var(--cyan), var(--purple))'
                    : 'rgba(255,255,255,0.08)',
                color: isAdmin ? '#ffd700' : isMe ? '#000' : '#fff',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                borderLeft: isAdmin ? '3px solid #ffd700' : 'none',
                padding: '10px 14px', fontSize: '14px',
                fontFamily: 'var(--font-body)', lineHeight: 1.4,
              }}>
                {isAdmin && <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px', opacity: 0.8 }}>🔧 ADMIN</div>}
                {msg.body}
                <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                  {timeAgo(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-thread__input-row">
        <input
          className="chat-thread__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 350)}
          placeholder="Message..."
        />
        <button
          className="chat-thread__send"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
        >➤</button>
      </div>
    </div>
  );
}

// ── Inbox ─────────────────────────────────────────────────────────
export default function MessagesPage({ initialThread, onUnreadChange, onViewUser }) {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('dms'); // 'dms' | 'community'
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(initialThread || null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);
  const pollRef = useRef(null);

  async function loadThreads() {
    if (!currentUser?.username) return;
    try {
      // Get all messages involving current user
      const res = await fetch(
        `${URL}/rest/v1/messages?or=(sender.eq.${encodeURIComponent(currentUser.username)},recipient.eq.${encodeURIComponent(currentUser.username)})&order=created_at.desc`,
        { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
      );
      const data = await res.json();
      if (!Array.isArray(data)) return;

      // Group into threads by thread_id, keep only latest message per thread
      const threadMap = {};
      data.forEach(msg => {
        if (!threadMap[msg.thread_id]) {
          const other = msg.sender === currentUser.username ? msg.recipient : msg.sender;
          threadMap[msg.thread_id] = { threadId: msg.thread_id, other, lastMsg: msg, unread: 0 };
        }
        if (msg.recipient === currentUser.username && !msg.read) {
          threadMap[msg.thread_id].unread++;
        }
      });

      const sorted = Object.values(threadMap).sort((a, b) =>
        new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at)
      );
      
      // Load avatar data for each thread
      const enriched = await Promise.all(sorted.map(async (t) => {
        try {
          const profileRes = await fetch(`${URL}/rest/v1/profiles?username=eq.${encodeURIComponent(t.other)}&select=avatar_url,avatar_color`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
          const profiles = await profileRes.json();
          if (Array.isArray(profiles) && profiles[0]) {
            return { ...t, avatarUrl: profiles[0].avatar_url, avatarColor: profiles[0].avatar_color };
          }
        } catch {}
        return t;
      }));
      
      setThreads(enriched);

      const totalUnread = sorted.reduce((s, t) => s + t.unread, 0);
      onUnreadChange?.(totalUnread);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadThreads();
    pollRef.current = setInterval(loadThreads, 8000);
    return () => clearInterval(pollRef.current);
  }, [currentUser?.username]);

  useEffect(() => {
    if (initialThread) setActiveThread(initialThread);
  }, [initialThread]);

  function handleSearchChange(e) {
    const q = e.target.value;
    setSearch(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${URL}/rest/v1/profiles?username=ilike.*${encodeURIComponent(q.trim())}*&select=username,avatar_color,avatar_url&limit=8&username=neq.${encodeURIComponent(currentUser.username)}`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {}
      setSearching(false);
    }, 300);
  }

  if (activeThread) {
    return (
      <ChatThread
        otherUsername={activeThread}
        onBack={() => { setActiveThread(null); loadThreads(); }}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="messages-page">
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <button onClick={() => setTab('dms')} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: `2px solid ${tab === 'dms' ? '#00f5ff' : 'transparent'}`, color: tab === 'dms' ? '#00f5ff' : 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
          💬 Messages
        </button>
        <button onClick={() => setTab('community')} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: `2px solid ${tab === 'community' ? '#bf5fff' : 'transparent'}`, color: tab === 'community' ? '#bf5fff' : 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
          🌐 Community
        </button>
      </div>

      {/* Community chat tab */}
      {tab === 'community' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <CommunityChat onViewUser={onViewUser} />
        </div>
      )}

      {/* DMs tab */}
      {tab === 'dms' && <React.Fragment>
      {/* Header + search */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', marginBottom: '10px' }}>Messages</div>
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="🔍 New conversation..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px', padding: '9px 16px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
          />
          {/* Search results dropdown */}
          {search.trim() && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f0f12', border: '1px solid var(--border)', borderRadius: '12px', marginTop: '6px', zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {searching ? (
                <div style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>No users found</div>
              ) : searchResults.map(u => (
                <div key={u.username}
                  onClick={() => { setActiveThread(u.username); setSearch(''); setSearchResults([]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatar_color || 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: '#000', flexShrink: 0, overflow: 'hidden' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.username[0].toUpperCase()}
                  </div>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '14px' }}>@{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontSize: '14px' }}>Loading...</div>
      ) : threads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>No messages yet</div>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>Search for a producer above to start a convo</div>
        </div>
      ) : threads.map(t => (
        <div key={t.threadId}
          onClick={() => setActiveThread(t.other)}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div 
            style={{ width: 46, height: 46, borderRadius: '50%', background: t.avatarColor || 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', color: '#000', flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onViewUser && onViewUser(t.other); }}
          >
            {t.avatarUrl ? <img src={t.avatarUrl} alt={t.other} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : t.other[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px' }}>@{t.other}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{timeAgo(t.lastMsg.created_at)}</span>
            </div>
            <div style={{ fontSize: '13px', color: t.unread > 0 ? '#fff' : 'var(--text-dim)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: t.unread > 0 ? 600 : 400 }}>
              {t.lastMsg.sender === currentUser.username ? 'You: ' : ''}{t.lastMsg.body}
            </div>
          </div>
          {t.unread > 0 && (
            <div style={{ background: 'var(--cyan)', color: '#000', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
              {t.unread}
            </div>
          )}
        </div>
      ))}
    </React.Fragment>}
    </div>
  );
}
