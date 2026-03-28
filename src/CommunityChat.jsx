import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const TEAM_MEMBERS = ['avalions'];
const POLL_MS = 5000;

function isModeratable(currentUser) {
  return currentUser?.role?.toLowerCase() === 'admin' || TEAM_MEMBERS.includes(currentUser?.username);
}

export default function CommunityChat({ onViewUser }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [avatars, setAvatars] = useState({});
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const isMod = isModeratable(currentUser);

  const load = async (scroll = false) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/community_chat?order=created_at.asc&limit=200`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        if (scroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        // Load any missing avatars
        const unknowns = [...new Set(data.map(m => m.sender_username))].filter(u => !(u in avatars));
        if (unknowns.length > 0) {
          fetch(`${SUPABASE_URL}/rest/v1/profiles?username=in.(${unknowns.map(encodeURIComponent).join(',')})&select=username,avatar_url,avatar_color`, {
            headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
          }).then(r => r.json()).then(profiles => {
            if (Array.isArray(profiles)) {
              const map = {};
              profiles.forEach(p => { map[p.username] = { avatar_url: p.avatar_url, avatar_color: p.avatar_color }; });
              setAvatars(prev => ({ ...prev, ...map }));
            }
          }).catch(() => {});
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load(true);
    pollRef.current = setInterval(() => load(false), POLL_MS);
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
      await load(true);
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const deleteMsg = async (id) => {
    if (!isMod) return;
    await fetch(`${SUPABASE_URL}/rest/v1/community_chat?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwn = (msg) => msg.sender_username === currentUser?.username;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px' }}>🌐 808market Community</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>Network with producers & artists</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '40px 0' }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '40px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
            Be the first to say something!
          </div>
        ) : messages.map((msg) => {
          const own = isOwn(msg);
          const av = avatars[msg.sender_username];
          return (
            <div key={msg.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexDirection: own ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              {!own && (
                <div
                  onClick={() => onViewUser && onViewUser(msg.sender_username)}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: av?.avatar_color || '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-head)', cursor: 'pointer' }}
                >
                  {av?.avatar_url ? <img src={av.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (msg.sender_username[0] || '?').toUpperCase()}
                </div>
              )}
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: own ? 'flex-end' : 'flex-start' }}>
                {!own && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', paddingLeft: '4px', cursor: 'pointer' }}
                    onClick={() => onViewUser && onViewUser(msg.sender_username)}>
                    @{msg.sender_username}
                  </div>
                )}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', flexDirection: own ? 'row-reverse' : 'row' }}>
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
                  {isMod && !own && (
                    <button onClick={() => deleteMsg(msg.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,51,102,0.5)', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: 0, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                      title="Delete message">
                      🗑
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-body)', paddingLeft: own ? 0 : '4px', paddingRight: own ? '4px' : 0 }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Say something to the community..."
          maxLength={500}
          style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '10px 16px', color: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#000', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !input.trim() ? 0.4 : 1 }}>
          ➤
        </button>
      </div>
    </div>
  );
}
