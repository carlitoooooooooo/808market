import React, { useState, useRef, useEffect } from "react";
import AudioPlayer from "./AudioPlayer.js";
import WaveformVisualizer from "./WaveformVisualizer.jsx";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabase.js";
import { dbInsert, dbSelect, dbUpsert } from "./dbHelper.js";

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

export default function TrackModal({ track, onClose, onVote, userVotes, onViewUser }) {
  const { currentUser } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [shareToast, setShareToast] = useState("");
  const shareToastTimer = useRef(null);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef(null);
  const [reactionCounts, setReactionCounts] = useState({});
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentsEndRef = useRef(null);
  const channelRef = useRef(null);

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

  function handleCopIt() {
    if (!isFree && track.paymentLink) {
      window.open(track.paymentLink, '_blank');
    }
    handleVote("right");
  }

  const hasReactions = Object.keys(reactionCounts).length > 0;

  async function handleShare() {
    const url = `https://808market.vercel.app/track/${track.id}`;
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
      <div className="track-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

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
              <span className="ratio-hard">🛒 {cops} cops</span>
              <span className="ratio-trash">💨 {passes} passes</span>
            </div>
            <div className="ratio-bar">
              <div className="ratio-bar__fill" style={{ width: `${copPct}%` }} />
            </div>
          </div>

          {/* COP IT / PASS buttons */}
          {!userVote ? (
            <div>
              <button className="btn-cop-it" onClick={handleCopIt}>
                {isFree ? "🎁 FREE DOWNLOAD" : `🛒 COP IT — ${priceLabel}`}
              </button>
              <button className="btn-pass-it" onClick={() => handleVote("left")}>
                💨 Pass
              </button>
            </div>
          ) : (
            <div className="track-modal__voted">
              {userVote === "right" ? "🛒 You copped this" : "💨 You passed"}
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
            {shareToast && (
              <div className="share-toast">{shareToast}</div>
            )}
          </div>

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
      </div>
    </div>
  );
}
