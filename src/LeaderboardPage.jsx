import React, { useState } from "react";
import TrackModal from "./TrackModal.jsx";

const RANK_STYLE = {
  1: { label: "🥇", color: "#ffd700", border: "1px solid rgba(255,215,0,0.5)" },
  2: { label: "🥈", color: "#c0c0c0", border: "1px solid rgba(192,192,192,0.5)" },
  3: { label: "🥉", color: "#cd7f32", border: "1px solid rgba(205,127,50,0.5)" },
};

export default function LeaderboardPage({ tracks, onVote, userVotes, onViewUser }) {
  const [selectedTrack, setSelectedTrack] = useState(null);

  const sorted = [...tracks].sort((a, b) => (b.cops || 0) - (a.cops || 0));

  return (
    <div className="leaderboard-page">
      <div className="page-header">
        <h1 className="page-title">🔥 Top Beats</h1>
        <p className="page-subtitle">Fan Favorites ❤️</p>
      </div>

      <div className="leaderboard-list">
        {sorted.map((track, idx) => {
          const rank = idx + 1;
          const rankStyle = RANK_STYLE[rank] || {};
          const cops = track.cops || 0;
          const price = track.price || 0;
          const isFree = !price || price === 0;

          return (
            <div
              key={track.id}
              className={`leaderboard-row ${rank <= 3 ? "leaderboard-row--top" : ""}`}
              style={rank <= 3 ? { border: rankStyle.border } : {}}
              onClick={() => setSelectedTrack(track)}
            >
              <div
                className="leaderboard-rank"
                style={rank <= 3 ? { color: rankStyle.color } : {}}
              >
                {rank <= 3 ? rankStyle.label : `#${rank}`}
              </div>

              <div
                className="leaderboard-thumb"
                style={{ backgroundImage: `url(${track.coverUrl})` }}
              />

              <div className="leaderboard-info">
                <div className="leaderboard-title">{track.title}</div>
                <div className="leaderboard-artist">{track.artist}</div>
                <div className="leaderboard-genre">{track.genre}</div>
              </div>

              <div className="leaderboard-hards" style={{ textAlign: "right" }}>
                <div className="hards-count">❤️ {cops.toLocaleString()}</div>
                <div style={{ fontSize: "12px", marginTop: "3px", color: isFree ? "var(--cyan)" : "var(--green)", fontWeight: 600, fontFamily: "var(--font-head)" }}>
                  {isFree ? "FREE" : `$${price}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTrack && (
        <TrackModal
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onVote={(dir, track) => { onVote(dir, track); setSelectedTrack(null); }}
          userVotes={userVotes}
          onViewUser={onViewUser}
        />
      )}
    </div>
  );
}
