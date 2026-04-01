/**
 * AudioPlayer — wraps HTMLAudioElement for 30-second snippet playback.
 * Uses HTMLAudioElement (widely supported) instead of Web Audio API
 * to avoid cross-origin fetch restrictions on audio files.
 */
export default class AudioPlayer {
  constructor(audioUrl, snippetStart = 0, trackId = null) {
    this.audioUrl = audioUrl;
    this.trackId = trackId;
    this.snippetStart = snippetStart;
    this.snippetDuration = 30;
    this._timeUpdateCb = null;
    this._endedCb = null;
    this._audio = null;
    this._stopTimer = null;
    this._rafId = null;
    this._startTime = null;
    this._isPlaying = false;
    this._destroyed = false;
  }

  _ensureAudio() {
    if (!this._audio) {
      this._audio = new Audio();
      this._audio.src = this.audioUrl;
      this._audio.preload = "auto";

      this._audio.addEventListener("ended", () => {
        this._cleanup();
        if (this._endedCb) this._endedCb();
      });
    }
    return this._audio;
  }

  async _getPlayUrl() {
    // If we have a track ID, fetch signed URL by track ID
    if (this.trackId && !this.audioUrl) {
      try {
        const res = await fetch('/api/sign-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: this.trackId }),
        });
        const data = await res.json();
        if (data.signedUrl) return data.signedUrl;
      } catch {}
      return null;
    }
    // If we have a raw URL, sign it
    if (!this.audioUrl || this.audioUrl.includes('/sign/') || !this.audioUrl.includes('/object/public/')) {
      return this.audioUrl;
    }
    try {
      const res = await fetch('/api/sign-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: this.audioUrl }),
      });
      const data = await res.json();
      if (data.signedUrl) return data.signedUrl;
    } catch {}
    return this.audioUrl;
  }

  play() {
    if (this._destroyed) return;
    // Fetch signed URL then play
    this._getPlayUrl().then(url => {
      if (this._destroyed) return;
      if (this._audio) {
        this._audio.src = url;
      } else {
        this.audioUrl = url;
      }
      this._playInternal();
    });
  }

  _playInternal() {
    if (this._destroyed) return;
    const audio = this._ensureAudio();

    // Seek to snippet start
    try {
      if (audio.readyState >= 1 && isFinite(audio.duration)) {
        audio.currentTime = this.snippetStart;
      } else {
        const onCanPlay = () => {
          audio.removeEventListener("canplay", onCanPlay);
          audio.currentTime = this.snippetStart;
        };
        audio.addEventListener("canplay", onCanPlay);
      }
    } catch (e) {
      console.warn("AudioPlayer seek error:", e);
    }

    const playPromise = audio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch((e) => {
        console.error("AudioPlayer play error:", e.name, e.message, this.audioUrl);
      });
    }

    this._isPlaying = true;
    this._startTime = Date.now();

    // Auto-stop after 15 seconds
    if (this._stopTimer) clearTimeout(this._stopTimer);
    this._stopTimer = setTimeout(() => {
      this._cleanup();
      if (this._endedCb) this._endedCb();
    }, this.snippetDuration * 1000);

    // RAF loop for progress
    this._startRAF();
  }

  _startRAF() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    const tick = () => {
      if (!this._isPlaying || this._destroyed) return;
      if (this._timeUpdateCb && this._startTime !== null) {
        const elapsed = (Date.now() - this._startTime) / 1000;
        const progress = Math.min(elapsed / this.snippetDuration, 1);
        this._timeUpdateCb(progress);
      }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  pause() {
    if (!this._audio) return;
    this._audio.pause();
    this._isPlaying = false;
    if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  stop() {
    this._cleanup();
  }

  _cleanup() {
    this._isPlaying = false;
    if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._audio) {
      this._audio.pause();
      try { this._audio.currentTime = 0; } catch (_) {}
    }
  }

  onTimeUpdate(callback) {
    this._timeUpdateCb = callback;
  }

  onEnded(callback) {
    this._endedCb = callback;
  }

  destroy() {
    this._destroyed = true;
    this._cleanup();
    if (this._audio) {
      this._audio.src = "";
      this._audio = null;
    }
    this._timeUpdateCb = null;
    this._endedCb = null;
  }
}
