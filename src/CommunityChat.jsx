import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const TEAM_MEMBERS = ['avalions', 'alex'];
const POLL_MS = 5000;
const ONLINE_NOW_MS = 5 * 60 * 1000;    // green: < 5 min
const ACTIVE_TODAY_MS = 24 * 60 * 60 * 1000; // sidebar: < 24h

const EMOJI_OPTIONS = ['❤️', '🔥', '💯', '😂', '🥶', '🎵', '👑', '💪'];

function isMod(u) {
  return u?.role?.toLowerCase() === 'admin' || TEAM_MEMBERS.includes(u?.username);
}

function UserBadge({ user }) {
  if (!user) return null;
  if (user.role?.toLowerCase() === 'admin') return (
    <span style={{ background: 'linear-gradient(135deg,#00f5ff,#bf5fff)', color: '#000', fontSize: '8px', fontWeight: 700, padding: '1px 5px', borderRadius: '8px', fontFamily: 'var(--font-head)', letterSpacing: '0.5px', verticalAlign: 'middle' }}>ADMIN</span>
  );
  if (TEAM_MEMBERS.includes(user.username)) return (
    <span style={{ background: 'linear-gradient(135deg,#00ff88,#00f5ff)', color: '#000', fontSize: '8px', fontWeight: 700, padding: '1px 5px', borderRadius: '8px', fontFamily: 'var(--font-head)', letterSpacing: '0.5px', verticalAlign: 'middle' }}>TEAM</span>
  );
  return null;
}

export default function CommunityChat({ onViewUser }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState({}); // username -> { avatar_url, avatar_color, role }
  const [sidebarUsers, setSidebarUsers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 600);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [mentionSearch, setMentionSearch] = useState(''); // current @mention search
  const [mentionResults, setMentionResults] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // message id
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const editRef = useRef(null);
  const canMod = isMod(currentUser);

  // ── Load profiles for a list of usernames ─────────────────────────────────
  const loadProfiles = useCallback(async (usernames) => {
    const unknowns = usernames.filter(u => !(u in profiles));
    if (!unknowns.length) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?username=in.(${unknowns.map(encodeURIComponent).join(',')})&select=username,avatar_url,avatar_color,role`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(p => { map[p.username] = p; });
        setProfiles(prev => ({ ...prev, ...map }));
      }
    } catch {}
  }, [profiles]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (scroll = false) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/community_chat?order=created_at.asc&limit=300`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        setPinnedMsg(data.filter(m => m.is_pinned).slice(-1)[0] || null);
        if (scroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        loadProfiles([...new Set(data.map(m => m.sender_username))]);
      }
    } catch {}
    setLoading(false);
  }, [loadProfiles]);

  // ── Load sidebar users (active in last 24h) ────────────────────────────────
  const loadSidebar = async () => {
    try {
      const cutoff = new Date(Date.now() - ACTIVE_TODAY_MS).toISOString();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?last_seen=gte.${cutoff}&hide_activity=eq.false&select=username,avatar_url,avatar_color,role,last_seen&order=last_seen.desc&limit=100`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) setSidebarUsers(data);
    } catch {}
  };

  useEffect(() => {
    loadMessages(true);
    loadSidebar();
    pollRef.current = setInterval(() => { loadMessages(false); loadSidebar(); }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Mention autocomplete ───────────────────────────────────────────────────
  useEffect(() => {
    const match = input.match(/@(\w*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      setMentionSearch(q);
      const results = sidebarUsers.filter(u => u.username.toLowerCase().startsWith(q) && u.username !== currentUser?.username).slice(0, 5);
      setMentionResults(results);
    } else {
      setMentionSearch('');
      setMentionResults([]);
    }
  }, [input, sidebarUsers]);

  const insertMention = (username) => {
    const newInput = input.replace(/@\w*$/, `@${username} `);
    setInput(newInput);
    setMentionResults([]);
    inputRef.current?.focus();
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || !currentUser?.username || sending) return;
    setSending(true);
    setInput('');
    const payload = { sender_username: currentUser.username, body: text };
    if (replyTo) payload.reply_to_id = replyTo.id;
    setReplyTo(null);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/community_chat`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(payload),
      });
      await loadMessages(true);
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteMsg = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    setMessages(prev => prev.filter(m => m.id !== id));
    if (pinnedMsg?.id === id) setPinnedMsg(null);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.body); setTimeout(() => editRef.current?.focus(), 50); };
  const saveEdit = async (id) => {
    const text = editText.trim();
    if (!text) return;
    await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, body: text } : m));
    setEditingId(null); setEditText('');
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  // ── React ──────────────────────────────────────────────────────────────────
  const toggleReaction = async (msgId, emoji) => {
    if (!currentUser?.username) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] ? [...reactions[emoji]] : [];
    const idx = users.indexOf(currentUser.username);
    if (idx >= 0) users.splice(idx, 1); else users.push(currentUser.username);
    if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m));
    setShowEmojiPicker(null);
    await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${msgId}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactions }),
    });
  };

  // ── Pin ────────────────────────────────────────────────────────────────────
  const togglePin = async (msg) => {
    const newVal = !msg.is_pinned;
    // Unpin all first
    if (newVal && pinnedMsg) {
      await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${pinnedMsg.id}`, {
        method: 'PATCH',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: false }),
      });
    }
    await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${msg.id}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: newVal }),
    });
    setMessages(prev => prev.map(m => ({ ...m, is_pinned: m.id === msg.id ? newVal : false })));
    setPinnedMsg(newVal ? msg : null);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwn = (msg) => msg.sender_username === currentUser?.username;

  const onlineCount = sidebarUsers.filter(u => Date.now() - new Date(u.last_seen).getTime() < ONLINE_NOW_MS).length;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px' }}>🌐 808market Community</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
              <span style={{ color: '#00ff88' }}>●</span> {onlineCount} online · {sidebarUsers.length} active today
            </div>
          </div>
          <button onClick={() => setShowSidebar(s => !s)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-head)' }}>
            👥
          </button>
        </div>

        {/* Pinned message */}
        {pinnedMsg && (
          <div style={{ background: 'rgba(0,245,255,0.07)', borderBottom: '1px solid rgba(0,245,255,0.15)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', flexShrink: 0 }}>📌</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: 'var(--cyan)', fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: '1px' }}>PINNED · @{pinnedMsg.sender_username}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pinnedMsg.body}</div>
            </div>
            {canMod && <button onClick={() => togglePin(pinnedMsg)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px' }}>✕</button>}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '40px 0' }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Be the first to say something!</div>
            </div>
          ) : messages.map((msg) => {
            const own = isOwn(msg);
            const av = profiles[msg.sender_username];
            const isEditing = editingId === msg.id;
            const replyMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
            const reactions = msg.reactions || {};
            const bodyHighlighted = msg.body.replace(/@(\w+)/g, '<span style="color:var(--cyan);font-weight:700">@$1</span>');

            return (
              <div key={msg.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: own ? 'row-reverse' : 'row' }}>
                {/* Avatar */}
                {!own && (
                  <div onClick={() => onViewUser && onViewUser(msg.sender_username)}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: av?.avatar_color || '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '2px' }}>
                    {av?.avatar_url ? <img src={av.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (msg.sender_username[0] || '?').toUpperCase()}
                  </div>
                )}

                <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: own ? 'flex-end' : 'flex-start' }}>
                  {/* Sender name + badge */}
                  {!own && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '4px', cursor: 'pointer' }}
                      onClick={() => onViewUser && onViewUser(msg.sender_username)}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-head)', fontWeight: 600 }}>@{msg.sender_username}</span>
                      <UserBadge user={av} />
                    </div>
                  )}

                  {/* Reply quote */}
                  {replyMsg && (
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderLeft: '3px solid rgba(0,245,255,0.5)', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px', marginLeft: own ? 0 : '4px', marginRight: own ? '4px' : 0 }}>
                      <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>@{replyMsg.sender_username}</span>: {replyMsg.body}
                    </div>
                  )}

                  {/* Editing */}
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') cancelEdit(); }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(0,245,255,0.4)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', resize: 'none', minWidth: '200px' }}
                        rows={2} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => saveEdit(msg.id)} style={{ padding: '5px 12px', background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Save</button>
                        <button onClick={cancelEdit} style={{ padding: '5px 12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Message bubble + action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexDirection: own ? 'row-reverse' : 'row' }}
                        onMouseEnter={e => { const a = e.currentTarget.querySelector('.msg-actions'); if (a) { a.style.opacity = 1; a.style.visibility = 'visible'; } }}
                        onMouseLeave={e => { const a = e.currentTarget.querySelector('.msg-actions'); if (a) { a.style.opacity = 0; a.style.visibility = 'hidden'; } }}>
                        <div style={{ background: own ? 'linear-gradient(135deg,#00f5ff,#bf5fff)' : 'rgba(255,255,255,0.08)', color: own ? '#000' : '#fff', padding: '9px 13px', borderRadius: own ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '14px', fontFamily: 'var(--font-body)', lineHeight: 1.4, wordBreak: 'break-word' }}
                          dangerouslySetInnerHTML={{ __html: bodyHighlighted }} />

                        {/* Action buttons */}
                        <div className="msg-actions" style={{ display: 'flex', gap: '5px', opacity: 0, visibility: 'hidden', transition: 'opacity 0.15s', flexDirection: 'column', position: 'absolute', [own ? 'left' : 'right']: '-68px', top: 0, zIndex: 10 }}>
                          <button onClick={() => setReplyTo(msg)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '11px', padding: '6px 10px' }} title="Reply">↩</button>
                          <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '11px', padding: '6px 10px' }} title="React">😊</button>
                          {own && <button onClick={() => startEdit(msg)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '11px', padding: '6px 10px' }} title="Edit">✏️</button>}
                          {canMod && <button onClick={() => togglePin(msg)} style={{ background: 'rgba(0,245,255,0.1)', border: 'none', borderRadius: '6px', color: 'var(--cyan)', cursor: 'pointer', fontSize: '11px', padding: '6px 10px' }} title={msg.is_pinned ? "Unpin" : "Pin"}>📌</button>}
                          {(canMod || own) && <button onClick={() => deleteMsg(msg.id)} style={{ background: 'rgba(255,51,102,0.12)', border: 'none', borderRadius: '6px', color: '#ff3366', cursor: 'pointer', fontSize: '11px', padding: '6px 10px' }} title="Delete">🗑</button>}
                        </div>
                      </div>

                      {/* Emoji picker */}
                      {showEmojiPicker === msg.id && (
                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '5px 8px', marginTop: '2px' }}>
                          {EMOJI_OPTIONS.map(e => (
                            <button key={e} onClick={() => toggleReaction(msg.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px', borderRadius: '6px' }}>{e}</button>
                          ))}
                        </div>
                      )}

                      {/* Reaction counts */}
                      {Object.keys(reactions).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px', paddingLeft: own ? 0 : '4px', paddingRight: own ? '4px' : 0 }}>
                          {Object.entries(reactions).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              style={{ background: users.includes(currentUser?.username) ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${users.includes(currentUser?.username) ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', padding: '2px 8px', cursor: 'pointer', fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {emoji} <span style={{ fontSize: '11px', fontFamily: 'var(--font-head)', fontWeight: 700 }}>{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
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

        {/* Reply bar */}
        {replyTo && (
          <div style={{ padding: '6px 14px', background: 'rgba(0,245,255,0.06)', borderTop: '1px solid rgba(0,245,255,0.15)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>↩ Replying to <strong>@{replyTo.sender_username}</strong>: <span style={{ color: 'rgba(255,255,255,0.5)' }}>{replyTo.body.slice(0, 60)}{replyTo.body.length > 60 ? '…' : ''}</span></span>
            <button onClick={() => setReplyTo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
        )}

        {/* Mention autocomplete */}
        {mentionResults.length > 0 && (
          <div style={{ padding: '4px 8px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f0f12', flexShrink: 0 }}>
            {mentionResults.map(u => (
              <div key={u.username} onClick={() => insertMention(u.username)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: profiles[u.username]?.avatar_color || '#333', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                  {profiles[u.username]?.avatar_url ? <img src={profiles[u.username].avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.username[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-head)', fontWeight: 600 }}>@{u.username}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Say something... (@ to mention)"
            maxLength={500}
            style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '10px 16px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <button onClick={send} disabled={!input.trim() || sending}
            style={{ background: 'linear-gradient(135deg,#00f5ff,#bf5fff)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#000', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !input.trim() ? 0.4 : 1, transition: 'opacity 0.15s' }}>
            ➤
          </button>
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {showSidebar && window.innerWidth < 600 && (
        <div onClick={() => setShowSidebar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 499 }} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      {showSidebar && (
        <div style={{ width: '150px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', background: 'rgba(10,10,10,0.97)', position: window.innerWidth < 600 ? 'fixed' : 'relative', top: window.innerWidth < 600 ? '56px' : 'auto', right: window.innerWidth < 600 ? 0 : 'auto', bottom: window.innerWidth < 600 ? '64px' : 'auto', zIndex: window.innerWidth < 600 ? 500 : 'auto', width: window.innerWidth < 600 ? '200px' : '150px', boxShadow: window.innerWidth < 600 ? '-4px 0 20px rgba(0,0,0,0.8)' : 'none' }}>
          {/* Online now */}
          <div style={{ padding: '10px 10px 6px', fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-head)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            🟢 Online Now ({sidebarUsers.filter(u => Date.now() - new Date(u.last_seen).getTime() < ONLINE_NOW_MS).length})
          </div>
          {sidebarUsers.filter(u => Date.now() - new Date(u.last_seen).getTime() < ONLINE_NOW_MS).map(u => (
            <SidebarUser key={u.username} u={u} dotColor="#00ff88" profiles={profiles} onViewUser={onViewUser} />
          ))}

          {/* Active today */}
          <div style={{ padding: '10px 10px 6px', fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-head)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '6px' }}>
            🕐 Active Today ({sidebarUsers.filter(u => Date.now() - new Date(u.last_seen).getTime() >= ONLINE_NOW_MS).length})
          </div>
          {sidebarUsers.filter(u => Date.now() - new Date(u.last_seen).getTime() >= ONLINE_NOW_MS).map(u => (
            <SidebarUser key={u.username} u={u} dotColor="#ffd700" profiles={profiles} onViewUser={onViewUser} />
          ))}

          {/* Close button — always visible at bottom on mobile */}
          {window.innerWidth < 600 && (
            <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', position: 'sticky', bottom: 0, background: 'rgba(10,10,10,0.97)' }}>
              <button onClick={() => setShowSidebar(false)} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px' }}>
                ✕ Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarUser({ u, dotColor, profiles, onViewUser }) {
  const av = profiles[u.username];
  return (
    <div onClick={() => onViewUser && onViewUser(u.username)}
      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 10px', cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: u.avatar_color || '#333', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-head)' }}>
          {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.username[0] || '?').toUpperCase()}
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '7px', height: '7px', borderRadius: '50%', background: dotColor, border: '1.5px solid #000' }} />
      </div>
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {u.username}
      </span>
    </div>
  );
}


