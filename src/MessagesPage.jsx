import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";

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
        setMessages(data);
        // Mark received messages as read
        const unread = data.filter(m => m.recipient === currentUser.username && !m.read);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>←</button>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px' }}>@{otherUsername}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', scrollbarWidth: 'none' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', paddingTop: '40px' }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', paddingTop: '40px' }}>
            No messages yet. Say something! 👋
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender === currentUser.username;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                background: isMe ? 'linear-gradient(135deg, var(--cyan), var(--purple))' : 'rgba(255,255,255,0.08)',
                color: isMe ? '#000' : '#fff',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '10px 14px',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.4,
              }}>
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
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Message..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)', borderRadius: '22px', padding: '10px 16px', color: '#fff', fontSize: '15px', fontFamily: 'var(--font-body)', outline: 'none' }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{ background: 'linear-gradient(135deg, var(--cyan), var(--purple))', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !input.trim() || sending ? 0.4 : 1 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ── Inbox ─────────────────────────────────────────────────────────
export default function MessagesPage({ initialThread, onUnreadChange }) {
  const { currentUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(initialThread || null);
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
      setThreads(sorted);

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
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px' }}>Messages</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontSize: '14px' }}>Loading...</div>
      ) : threads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>No messages yet</div>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>Visit a producer's profile to start a convo</div>
        </div>
      ) : threads.map(t => (
        <div key={t.threadId}
          onClick={() => setActiveThread(t.other)}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', color: '#000', flexShrink: 0 }}>
            {t.other[0].toUpperCase()}
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
    </div>
  );
}
