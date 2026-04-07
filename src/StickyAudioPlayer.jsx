import React, { useRef, useEffect, useState } from 'react';
import './StickyAudioPlayer.css';

export default function StickyAudioPlayer({ 
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  onClose 
}) {
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const [currentTime, setCurrentTime] = useState(0);

  if (!currentTrack) {
    return null;
  }

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      onPlayPause(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [currentTrack, onPlayPause]);

  const handlePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      onPlayPause(false);
    } else {
      // Get signed URL and load
      const audioUrl = currentTrack.audio_url || currentTrack.audioUrl;
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = currentTrack.snippet_start || 0;
        audioRef.current.play().catch(e => console.error('Play error:', e));
        onPlayPause(true);
      }
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="sticky-player">
      <audio ref={audioRef} />
      
      <div className="sticky-player__content">
        <div className="sticky-player__info">
          <div 
            className="sticky-player__cover"
            style={{ backgroundImage: `url(${currentTrack.cover_url || currentTrack.coverUrl})` }}
          />
          <div className="sticky-player__track-info">
            <div className="sticky-player__title">{currentTrack.title || 'Unknown Track'}</div>
            <div className="sticky-player__artist">{currentTrack.artist || 'Unknown Artist'}</div>
          </div>
        </div>

        <div className="sticky-player__controls">
          <button 
            className="sticky-player__btn sticky-player__play-btn"
            onClick={handlePlayPause}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button 
            className="sticky-player__btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="sticky-player__progress-wrapper">
        <div 
          className="sticky-player__progress"
          onClick={handleSeek}
          style={{ cursor: 'pointer' }}
        >
          <div 
            className="sticky-player__progress-bar"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="sticky-player__time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
