// Sound utility for 808market notifications and messages

const SOUNDS_KEY = 'soundsEnabled';
const SOUND_TYPE_KEY = 'notificationSoundType';
const SOUND_VOLUME_KEY = 'notificationSoundVolume';
const AUTO_MUTE_KEY = 'autoMuteWhenFocused';

// Get audio context (create once)
let audioContext = null;
function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }
  return audioContext;
}

/**
 * Check if sounds are enabled in localStorage
 */
export function isSoundsEnabled() {
  try {
    return JSON.parse(localStorage.getItem(SOUNDS_KEY) ?? 'true');
  } catch {
    return true;
  }
}

/**
 * Toggle sounds on/off
 */
export function setSoundsEnabled(enabled) {
  localStorage.setItem(SOUNDS_KEY, JSON.stringify(enabled));
}

/**
 * Get the selected notification sound type
 * Returns one of: 'retro-beep', 'coin-ding', 'chime', 'sci-fi-blip'
 */
export function getNotificationSoundType() {
  try {
    return localStorage.getItem(SOUND_TYPE_KEY) || 'retro-beep';
  } catch {
    return 'retro-beep';
  }
}

/**
 * Set the notification sound type
 */
export function setNotificationSoundType(type) {
  localStorage.setItem(SOUND_TYPE_KEY, type);
}

/**
 * Get notification sound volume (0-100)
 */
export function getNotificationVolume() {
  try {
    return parseInt(localStorage.getItem(SOUND_VOLUME_KEY) || '25', 10);
  } catch {
    return 25;
  }
}

/**
 * Set notification sound volume (0-100)
 */
export function setNotificationVolume(volume) {
  const clamped = Math.max(0, Math.min(100, volume));
  localStorage.setItem(SOUND_VOLUME_KEY, String(clamped));
}

/**
 * Check if auto-mute is enabled (mute sounds when tab is focused)
 */
export function isAutoMuteEnabled() {
  try {
    return JSON.parse(localStorage.getItem(AUTO_MUTE_KEY) ?? 'false');
  } catch {
    return false;
  }
}

/**
 * Set auto-mute setting
 */
export function setAutoMute(enabled) {
  localStorage.setItem(AUTO_MUTE_KEY, JSON.stringify(enabled));
}

/**
 * Check if we should play sounds (considering auto-mute)
 */
function shouldPlaySound() {
  if (!isSoundsEnabled()) return false;
  
  // If auto-mute is enabled and document is focused, don't play
  if (isAutoMuteEnabled() && document.hasFocus && document.hasFocus()) {
    return false;
  }
  
  return true;
}

/**
 * Play a notification sound
 * Types: 'like', 'comment', 'follow', 'reaction'
 */
export function playNotificationSound(type = 'like') {
  if (!shouldPlaySound()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // Resume audio context if suspended (required for user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const soundType = getNotificationSoundType();
    const volume = getNotificationVolume();
    
    // Map type to frequency adjustments, but use selected sound type
    const freqMap = {
      like: 800,
      comment: 600,
      follow: 1000,
      reaction: 1000,
    };
    const freq = freqMap[type] || 800;
    
    // Call appropriate sound function based on selected type
    const soundFunctions = {
      'retro-beep': () => playRetroBeep(ctx, now, freq, 0.15, volume),
      'coin-ding': () => playCoinDing(ctx, now, volume),
      'chime': () => playNotificationChime(ctx, now, volume),
      'sci-fi-blip': () => playSciFiBlip(ctx, now, freq, volume),
    };
    
    const soundFn = soundFunctions[soundType] || soundFunctions['retro-beep'];
    soundFn();
  } catch (e) {
    console.warn('Notification sound error:', e);
  }
}

/**
 * Play a message sound
 */
export function playMessageSound() {
  if (!shouldPlaySound()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const volume = getNotificationVolume();
    playNotificationChime(ctx, now, volume);
  } catch (e) {
    console.warn('Message sound error:', e);
  }
}

/**
 * Retro beep sound
 */
function playRetroBeep(ctx, now, freq = 800, duration = 0.15, volume = 50) {
  const volumeFactor = volume / 100;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.value = freq;
  osc.type = 'square';
  gain.gain.setValueAtTime(0.1 * volumeFactor, now);
  gain.gain.exponentialRampToValueAtTime(0.01 * volumeFactor, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Coin ding sound (bright metallic sound)
 */
function playCoinDing(ctx, now, volume = 50) {
  const volumeFactor = volume / 100;
  const duration = 0.3;
  
  // High freq chirp
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  
  osc1.frequency.setValueAtTime(1200, now);
  osc1.frequency.exponentialRampToValueAtTime(800, now + duration);
  osc1.type = 'sine';
  
  gain1.gain.setValueAtTime(0.15 * volumeFactor, now);
  gain1.gain.exponentialRampToValueAtTime(0.01 * volumeFactor, now + duration);
  
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  osc1.start(now);
  osc1.stop(now + duration);
  
  // Add a small harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  
  osc2.frequency.setValueAtTime(600, now);
  osc2.frequency.exponentialRampToValueAtTime(400, now + duration);
  osc2.type = 'sine';
  
  gain2.gain.setValueAtTime(0.08 * volumeFactor, now);
  gain2.gain.exponentialRampToValueAtTime(0.005 * volumeFactor, now + duration);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  
  osc2.start(now);
  osc2.stop(now + duration);
}

/**
 * Notification chime sound (pleasant ascending tones)
 */
function playNotificationChime(ctx, now, volume = 50) {
  const volumeFactor = volume / 100;
  const duration = 0.4;
  
  // First tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  
  osc1.frequency.value = 800;
  osc1.type = 'sine';
  gain1.gain.setValueAtTime(0.1 * volumeFactor, now);
  gain1.gain.exponentialRampToValueAtTime(0.01 * volumeFactor, now + duration * 0.6);
  gain1.gain.setValueAtTime(0, now + duration * 0.6);
  
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  osc1.start(now);
  osc1.stop(now + duration * 0.6);
  
  // Second tone (higher)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  
  const secondStart = now + duration * 0.2;
  osc2.frequency.value = 1200;
  osc2.type = 'sine';
  gain2.gain.setValueAtTime(0.12 * volumeFactor, secondStart);
  gain2.gain.exponentialRampToValueAtTime(0.01 * volumeFactor, secondStart + duration);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  
  osc2.start(secondStart);
  osc2.stop(secondStart + duration);
}

/**
 * Sci-fi blip sound (futuristic notification)
 */
function playSciFiBlip(ctx, now, freq = 800, volume = 50) {
  const volumeFactor = volume / 100;
  const duration = 0.2;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // Pitch bend effect (freq down then up)
  osc.frequency.setValueAtTime(freq + 400, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + duration * 0.5);
  osc.frequency.exponentialRampToValueAtTime(freq + 200, now + duration);
  
  osc.type = 'triangle';
  
  gain.gain.setValueAtTime(0.12 * volumeFactor, now);
  gain.gain.exponentialRampToValueAtTime(0.01 * volumeFactor, now + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Resume audio context (call on first user interaction)
 */
export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
