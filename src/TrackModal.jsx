import React, { useState, useRef, useEffect } from "react";
import AudioPlayer from "./AudioPlayer.js";
import WaveformVisualizer from "./WaveformVisualizer.jsx";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabase.js";
import { dbInsert, dbSelect, dbUpsert } from "./dbHelper.js";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

function mapTrackMini(t) {
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
    producerNotes: t.producer_notes || "",
  };
}

async function insertNotification(data) {
  try {
    await dbInsert('notifications', data);
  } catch (err) {
    console.error('Notification insert error:', err);
  }
}

const REACTIONS_EMOJIS = ["🔥", "😤", "💯", "🥶", "😭", "💀"];

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TrackModal({ track, onClose, onVote, userVotes, onViewUser, onOpenModal }) {
  const { currentUser } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [shareToast, setShareToast] = useState("");
  const shareToastTimer = useRef(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef(null);
  const [reactionCounts, setReactionCounts] = useState({});
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Check if beat is saved
  useEffect(() => {
    if (!currentUser?.username || !track?.id) return;
    fetch(`${SUPABASE_URL}/rest/v1/saved_beats?user_username=eq.${encodeURIComponent(currentUser.username)}&track_id=eq.${track.id}&select=id`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(d => setIsSaved(Array.isArray(d) && d.length > 0)).catch(() => {});
  }, [track?.id, currentUser?.username]);

  async function toggleSave() {
    if (!currentUser?.username) return;
    setSaveLoading(true);
    try {
      if (isSaved) {
        await fetch(`${SUPABASE_URL}/rest/v1/saved_beats?user_username=eq.${encodeURIComponent(currentUser.username)}&track_id=eq.${track.id}`, {
          method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
        });
        setIsSaved(false);
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/saved_beats`, {
          method: 'POST',
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({ user_username: currentUser.username, track_id: track.id }),
        });
        setIsSaved(true);
      }
    } catch (err) { console.error(err); }
    setSaveLoading(false);
  }
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentsEndRef = useRef(null);
  const channelRef = useRef(null);
  const [moreTracks, setMoreTracks] = useState([]);

  useEffect(() => {
    setCommentsLoading(true);
    const LS_KEY = `tsh_comments_${track.id}`;

    dbSelect('comments', { track_id: track.id })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setComments(data);
          localStorage.setItem(LS_KEY, JSON.stringify(data));
        } else {
          try {
            const cached = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
            if (cached.length > 0) setComments(cached);
          } catch { }
        }
        setCommentsLoading(false);
      })
      .catch(() => {
        try {
          const cached = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
          setComments(cached);
        } catch { }
        setCommentsLoading(false);
      });

    channelRef.current = supabase
      .channel(`comments:${track.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `track_id=eq.${track.id}`,
      }, (payload) => {
        setComments(prev => {
          const exists = prev.some(c => c.id === payload.new.id);
          if (exists) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (shareToastTimer.current) clearTimeout(shareToastTimer.current);
    };
  }, [track.id]);

  useEffect(() => {
    dbSelect('reactions', { track_id: track.id })
      .then((data) => {
        if (Array.isArray(data)) {
          const counts = {};
          data.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
          setReactionCounts(counts);
        }
      })
      .catch(err => console.error('Load reactions error:', err));
  }, [track.id]);

  // Load more from this producer
  useEffect(() => {
    if (!track.uploadedBy) return;
    setMoreTracks([]);
    fetch(
      `${SUPABASE_URL}/rest/v1/tracks?uploaded_by_username=eq.${encodeURIComponent(track.uploadedBy)}&id=neq.${track.id}&order=cops.desc&limit=3`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMoreTracks(data.slice(0, 3).map(mapTrackMini));
      })
      .catch(() => {});
  }, [track.id, track.uploadedBy]);

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || !currentUser || commentSubmitting) return;

    setCommentSubmitting(true);

    const optimistic = {
      id: `local_${Date.now()}`,
      track_id: track.id,
      user_id: currentUser.id,
      username: currentUser.username,
      avatar_color: currentUser.avatarColor || "#00f5ff",
      text,
      created_at: new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    setCommentText("");

    const LS_KEY = `tsh_comments_${track.id}`;

    try {
      const data = await dbInsert('comments', {
        track_id: track.id,
        user_id: currentUser.id,
        username: currentUser.username,
        avatar_color: currentUser.avatarColor || "#00f5ff",
        text,
      });
      if (data) {
        setComments(prev => {
          const updated = prev.map(c => c.id === optimistic.id ? data : c);
          try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch { }
          return updated;
        });
      }
      if (track.uploadedBy && track.uploadedBy !== currentUser.username) {
        insertNotification({
          user_username: track.uploadedBy,
          type: 'comment',
          from_username: currentUser.username,
          track_id: track.id,
          track_title: track.title,
          message: `${currentUser.username} commented on "${track.title}"`,
        });
      }
    } catch (err) {
      console.error('Comment save error (stored locally):', err);
      setComments(prev => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(prev)); } catch { }
        return prev;
      });
    }

    setCommentSubmitting(false);
  };

  function togglePlay() {
    if (!playerRef.current) {
      const p = new AudioPlayer(track.audioUrl, track.snippetStart);
      p.onTimeUpdate((prog) => setProgress(prog));
      p.onEnded(() => { setIsPlaying(false); setProgress(0); });
      playerRef.current = p;
      p.play();
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  }

  const cops = track.cops || track.hards || 0;
  const passes = track.passes || track.trash || 0;
  const total = cops + passes;
  const copPct = total > 0 ? Math.round((cops / total) * 100) : 50;
  const userVote = userVotes?.[track.id];

  const price = track.price || 0;
  const isFree = !price || price === 0;
  const priceLabel = isFree ? "FREE" : `$${price}`;

  function handleVote(dir) {
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    setIsPlaying(false);
    onVote(dir, track);
    onClose();
  }

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleCopIt() {
    if (isFree) {
      // Free download — trigger file download directly
      if (track.audioUrl) {
        const a = document.createElement('a');
        a.href = track.audioUrl;
        a.download = `${track.title} - ${track.artist}.mp3`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      handleVote("right");
      return;
    }

    // Paid — Stripe checkout (full price collected by 808market, producer paid manually)
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          trackTitle: track.title,
          artist: track.artist,
          price: track.price,
          licenseType: track.licenseType,
          buyerUsername: currentUser?.username || 'anonymous',
        }),
      });
      const data = await res.json();
      if (data.url) {
        handleVote("right");
        window.location.href = data.url;
      } else {
        // Fallback to producer's payment link
        if (track.paymentLink) window.open(track.paymentLink, '_blank');
        handleVote("right");
      }
    } catch {
      // Fallback to producer's payment link
      if (track.paymentLink) window.open(track.paymentLink, '_blank');
      else alert(`Contact @${track.uploadedBy} to purchase this beat.`);
      handleVote("right");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const hasReactions = Object.keys(reactionCounts).length > 0;

  async function handleShare() {
    const url = `https://808market.app/track/${track.id}`;
    const shareData = {
      title: track.title,
      text: `Check out "${track.title}" by ${track.artist} on 808market`,
      url,
    };
    let msg = "🔗 Link copied!";
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        msg = "📤 Shared!";
      } else {
        await navigator.clipboard.writeText(url);
        msg = "🔗 Link copied!";
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        msg = "🔗 Link copied!";
      } catch {
        msg = "🔗 " + url;
      }
    }
    setShareToast(msg);
    if (shareToastTimer.current) clearTimeout(shareToastTimer.current);
    shareToastTimer.current = setTimeout(() => setShareToast(""), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="track-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="track-modal">

        {/* Cover */}
        <div
          className="track-modal__cover"
          style={{ backgroundImage: `url(${track.coverUrl})` }}
        />

        <div className="track-modal__body">
          {/* Badges */}
          <div className="beat-badges">
            <span className="beat-badge beat-badge--genre">{track.genre}</span>
            {track.bpm > 0 && <span className="beat-badge beat-badge--bpm">{track.bpm} BPM</span>}
            {track.beatKey && <span className="beat-badge beat-badge--key">{track.beatKey}</span>}
            {track.licenseType && (
              <span className="beat-badge beat-badge--license">
                {track.licenseType === 'free' ? 'Free Download' :
                 track.licenseType === 'lease' ? 'Non-Exclusive Lease' :
                 track.licenseType === 'exclusive' ? 'Exclusive' : track.licenseType}
              </span>
            )}
          </div>

          {/* Title & artist */}
          <div className="track-modal__title">{track.title}</div>
          <div className="track-modal__artist">
            by{" "}
            <span
              className="track-modal__uploader-link"
              onClick={() => onViewUser && onViewUser(track.uploadedBy)}
            >
              @{track.uploadedBy}
            </span>
          </div>

          {/* Price */}
          <div className={`beat-price ${isFree ? "beat-price--free" : ""}`}>
            {priceLabel}
          </div>

          {/* Producer Notes */}
          {track.producerNotes && track.producerNotes.trim() && (
            <div style={{
              margin: '10px 0',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)',
              borderLeft: '2px solid rgba(0,245,255,0.3)',
              borderRadius: '0 8px 8px 0',
            }}>
              <div style={{
                fontSize: '10px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                color: 'rgba(0,245,255,0.6)',
                letterSpacing: '1px',
                marginBottom: '5px',
              }}>🎹 Producer's note</div>
              <div style={{
                fontSize: '13px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: '1.5',
              }}>"{track.producerNotes}"</div>
            </div>
          )}

          {/* Tags */}
          {(track.tags || []).length > 0 && (
            <div className="track-modal__tags">
              {(track.tags || []).map((tag) => (
                <span key={tag} className="track-tag">#{tag}</span>
              ))}
            </div>
          )}

          {/* Waveform player */}
          <div className="track-modal__player">
            <WaveformVisualizer isPlaying={isPlaying} progress={progress} />
            <button className="swipe-card__play-btn" onClick={togglePlay}>
              {isPlaying ? "⏸" : "▶"}
            </button>
          </div>

          {/* Reaction counts */}
          {hasReactions && (
            <div className="modal-reactions">
              {REACTIONS_EMOJIS.map((emoji) => {
                const count = reactionCounts[emoji];
                if (!count) return null;
                return (
                  <span key={emoji} className="reaction-badge">
                    {emoji} <span className="reaction-badge-count">{count}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Cops/Passes ratio bar */}
          <div className="track-modal__ratio">
            <div className="ratio-label">
              <span className="ratio-hard">❤️ {cops} likes</span>
              <span className="ratio-trash">💨 {passes} passes</span>
            </div>
            <div className="ratio-bar">
              <div className="ratio-bar__fill" style={{ width: `${copPct}%` }} />
            </div>
          </div>

          {/* COP IT / PASS buttons */}
          {!userVote ? (
            <div>
              <button className="btn-cop-it" onClick={handleCopIt} disabled={checkoutLoading}>
                {checkoutLoading ? "Opening checkout..." : isFree ? "🎁 FREE DOWNLOAD" : `🛒 COP IT — ${priceLabel}`}
              </button>
              <button className="btn-pass-it" onClick={() => handleVote("left")}>
                💨 Pass
              </button>
            </div>
          ) : (
            <div className="track-modal__voted">
              {userVote === "right" ? "❤️ You liked this" : "💨 You passed"}
            </div>
          )}

          {/* Share button */}
          <div style={{ marginTop: "12px", position: "relative" }}>
            <button
              className="btn-bevel track-modal__share-btn"
              onClick={handleShare}
            >
              📤 SHARE
            </button>
            {currentUser && (
              <button
                className="btn-bevel track-modal__share-btn"
                onClick={toggleSave}
                disabled={saveLoading}
                style={{ color: isSaved ? '#ffd700' : undefined, borderColor: isSaved ? '#ffd700' : undefined }}
              >
                {isSaved ? '🔖 SAVED' : '🔖 SAVE'}
              </button>
            )}
            {shareToast && (
              <div className="share-toast">{shareToast}</div>
            )}
          </div>

          {/* More from this producer */}
          {moreTracks.length > 0 && (
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                More from @{track.uploadedBy}
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
                {moreTracks.map(t => {
                  const mPrice = t.price || 0;
                  const mFree = !mPrice || mPrice === 0;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (onOpenModal) { onOpenModal(t); }
                      }}
                      style={{
                        flexShrink: 0, cursor: onOpenModal ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column', gap: '5px', width: '72px',
                      }}
                    >
                      <div style={{
                        width: '72px', height: '72px', borderRadius: '10px',
                        backgroundImage: `url(${t.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
                        border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)',
                        position: 'relative',
                      }}>
                        <span style={{
                          position: 'absolute', bottom: '3px', right: '4px',
                          fontSize: '9px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                          color: mFree ? '#00f5ff' : '#00ff88',
                          background: 'rgba(0,0,0,0.65)', borderRadius: '8px', padding: '1px 5px',
                        }}>
                          {mFree ? 'FREE' : `$${mPrice}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72px' }}>
                        {t.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="comments-section">
            <div className="comments-header">
              💬 <span>COMMENTS</span>
              <span className="comments-count">{comments.length}</span>
            </div>

            <div className="comments-list">
              {commentsLoading ? (
                <div className="comments-empty">loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="comments-empty">no comments yet. say something.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="comment">
                    <div
                      className="comment-avatar"
                      style={{ background: c.avatar_color || c.avatarColor }}
                    >
                      {(c.username || "?")[0].toUpperCase()}
                    </div>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <span className="comment-username">@{c.username}</span>
                        <span className="comment-time">{timeAgo(c.created_at || c.createdAt)}</span>
                      </div>
                      <div className="comment-text">{c.text}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            <div className="comment-input-row">
              <input
                className="comment-input"
                type="text"
                placeholder="drop a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                maxLength={200}
                disabled={commentSubmitting}
              />
              <button
                className="btn-bevel btn-pink comment-submit"
                onClick={submitComment}
                disabled={!commentText.trim() || commentSubmitting}
              >
                →
              </button>
            </div>
          </div>
        </div>
        </div>{/* end track-modal */}
      </div>{/* end track-modal-wrapper */}
    </div>
  );
}
