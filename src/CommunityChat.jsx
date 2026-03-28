import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const TEAM_MEMBERS = ['avalions'];
const POLL_MS = 5000;
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isMod(currentUser) {
  return currentUser?.role?.toLowerCase() === 'admin' || TEAM_MEMBERS.includes(currentUser?.username);
}

export default function CommunityChat({ onViewUser }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [avatars, setAvatars] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const editRef = useRef(null);
  const canMod = isMod(currentUser);

  const loadAvatars = async (usernames) => {
    const unknowns = usernames.filter(u => !(u in avatars));
    if (unknowns.length === 0) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?username=in.(${unknowns.map(encodeURIComponent).join(',')})&select=username,avatar_url,avatar_color`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const profiles = await res.json();
      if (Array.isArray(profiles)) {
        const map = {};
        profiles.forEach(p => { map[p.username] = { avatar_url: p.avatar_url, avatar_color: p.avatar_color }; });
        setAvatars(prev => ({ ...prev, ...map }));
      }
    } catch {}
  };

  const loadMessages = async (scroll = false) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/community_chat?order=created_at.asc&limit=200`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        if (scroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        loadAvatars([...new Set(data.map(m => m.sender_username))]);
      }
    } catch {}
    setLoading(false);
  };

  const loadOnlineUsers = async () => {
    try {
      const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?last_seen=gte.${cutoff}&hide_activity=eq.false&select=username,avatar_url,avatar_color,last_seen&order=last_seen.desc&limit=50`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) setOnlineUsers(data);
    } catch {}
  };

  useEffect(() => {
    loadMessages(true);
    loadOnlineUsers();
    pollRef.current = setInterval(() => {
      loadMessages(false);
      loadOnlineUsers();
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || !currentUser?.username || sending) return;
    setSending(true);
    setInput('');
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/community_chat`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ sender_username: currentUser.username, body: text }),
      });
      await loadMessages(true);
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const deleteMsg = async (id) => {
    if (!canMod) return;
    await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.body);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const saveEdit = async (id) => {
    const text = editText.trim();
    if (!text) return;
    await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, body: text } : m));
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwn = (msg) => msg.sender_username === currentUser?.username;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px' }}>🌐 808market Community</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{onlineUsers.length} online now</div>
          </div>
          <button onClick={() => setShowSidebar(s => !s)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-head)' }}>
            {showSidebar ? '👥 Hide' : '👥 Online'}
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '40px 0' }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Be the first to say something!</div>
            </div>
          ) : messages.map((msg) => {
            const own = isOwn(msg);
            const av = avatars[msg.sender_username];
            const isEditing = editingId === msg.id;

            return (
              <div key={msg.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexDirection: own ? 'row-reverse' : 'row' }}>
                {/* Avatar */}
                {!own && (
                  <div onClick={() => onViewUser && onViewUser(msg.sender_username)}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: av?.avatar_color || '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                    {av?.avatar_url ? <img src={av.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (msg.sender_username[0] || '?').toUpperCase()}
                  </div>
                )}

                <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: own ? 'flex-end' : 'flex-start' }}>
                  {!own && (
                    <div onClick={() => onViewUser && onViewUser(msg.sender_username)}
                      style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', paddingLeft: '4px', cursor: 'pointer' }}>
                      @{msg.sender_username}
                    </div>
                  )}

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                      <textarea
                        ref={editRef}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') cancelEdit(); }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(0,245,255,0.4)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', resize: 'none', minWidth: '200px' }}
                        rows={2}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => saveEdit(msg.id)} style={{ padding: '5px 12px', background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Save</button>
                        <button onClick={cancelEdit} style={{ padding: '5px 12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', flexDirection: own ? 'row-reverse' : 'row' }}>
                      <div style={{
                        background: own ? 'linear-gradient(135deg, #00f5ff, #bf5fff)' : 'rgba(255,255,255,0.08)',
                        color: own ? '#000' : '#fff',
                        padding: '9px 13px',
                        borderRadius: own ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '14px',
                        fontFamily: 'var(--font-body)',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}>
                        {msg.body}
                      </div>
                      {/* Action buttons on hover */}
                      <div className="msg-actions" style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                        {own && (
                          <button onClick={() => startEdit(msg)}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '11px', padding: '3px 7px' }}
                            title="Edit">✏️</button>
                        )}
                        {(canMod || own) && (
                          <button onClick={() => deleteMsg(msg.id)}
                            style={{ background: 'rgba(255,51,102,0.15)', border: 'none', borderRadius: '6px', color: '#ff3366', cursor: 'pointer', fontSize: '11px', padding: '3px 7px' }}
                            title="Delete">🗑</button>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-body)', paddingLeft: own ? 0 : '4px', paddingRight: own ? '4px' : 0 }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Say something..."
            maxLength={500}
            style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '10px 16px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#000', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !input.trim() ? 0.4 : 1, transition: 'opacity 0.15s' }}>
            ➤
          </button>
        </div>
      </div>

      {/* ── Online Users Sidebar ── */}
      {showSidebar && (
        <div style={{ width: '140px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-head)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
            🟢 Online ({onlineUsers.length})
          </div>
          {onlineUsers.length === 0 && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)', paddingLeft: '4px' }}>No one online</div>
          )}
          {onlineUsers.map(u => {
            const minsAgo = (Date.now() - new Date(u.last_seen).getTime()) / 1000 / 60;
            const dotColor = minsAgo < 3 ? '#00ff88' : '#ffd700';
            return (
              <div key={u.username} onClick={() => onViewUser && onViewUser(u.username)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 4px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: u.avatar_color || '#333', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-head)' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.username[0] || '?').toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: dotColor, border: '1.5px solid #000', boxShadow: `0 0 4px ${dotColor}` }} />
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.username}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
