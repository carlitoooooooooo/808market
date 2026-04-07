import React, { useRef, useEffect, useState } from 'react';
import './StickyAudioPlayer.css';
import AudioPlayer from './AudioPlayer.js';

/**
 * StickyAudioPlayer - Fixed bottom player for global audio playback
 * Shows/hides based on whether audio is playing
 * Syncs with global audio state from App.jsx
 */
export default function StickyAudioPlayer({ 
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  onClose 
}) {
  const playerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30); // 30 second snippets
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const audioInstanceRef = useRef(null);

  // If no current track, don't render
  if (!currentTrack) {
    return null;
  }

  // Initialize audio player when track changes
  useEffect(() => {
    // Clean up old player
    if (audioInstanceRef.current) {
      audioInstanceRef.current.destroy();
      audioInstanceRef.current = null;
    }

    if (currentTrack && currentTrack.audioUrl) {
      const player = new AudioPlayer(currentTrack.audioUrl, currentTrack.snippetStart);
      
      player.onTimeUpdate((prog) => {
        setProgress(prog);
        setCurrentTime(prog * duration);
      });

      player.onEnded(() => {
        onPlayPause(false);
      });

      audioInstanceRef.current = player;

      // Auto-play if isPlaying is true
      if (isPlaying) {
        player.play();
      }
    }

    return () => {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.destroy();
        audioInstanceRef.current = null;
      }
    };
  }, [currentTrack?.id]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioInstanceRef.current) return;

    if (isPlaying) {
      audioInstanceRef.current.play();
    } else {
      audioInstanceRef.current.pause();
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    onPlayPause(!isPlaying);
  };

  const handleProgressClick = (e) => {
    if (!audioInstanceRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    // We can't actually seek in AudioPlayer as implemented, 
    // but we can track intent for future enhancement
    setProgress(percentage);
    setCurrentTime(percentage * duration);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const coverUrl = currentTrack.coverUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23bf5fff" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="30"%3E♪%3C/text%3E%3C/svg%3E';

  return (
    <div className="sticky-audio-player">
      <div className="sticky-player-content">
        {/* Album Art */}
        <div className="player-album-art">
          <img 
            src={coverUrl} 
            alt={currentTrack.title}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23bf5fff" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="30"%3E♪%3C/text%3E%3C/svg%3E';
            }}
          />
          {isPlaying && <div className="album-art-playing-indicator" />}
        </div>

        {/* Track Info */}
        <div className="player-info">
          <div className="player-title">{currentTrack.title}</div>
          <div className="player-artist">{currentTrack.artist || 'Unknown Artist'}</div>
        </div>

        {/* Controls */}
        <div className="player-controls">
          <button 
            className={`player-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button 
            className="player-btn close-btn"
            onClick={onClose}
            aria-label="Close player"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="player-progress-bar"
        onClick={handleProgressClick}
        style={{ cursor: 'pointer' }}
      >
        <div 
          className="player-progress-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Time Display */}
      <div className="player-time">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
