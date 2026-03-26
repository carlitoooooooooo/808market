// Sound utility for 808market notifications and messages

const SOUNDS_KEY = 'soundsEnabled';

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
 * Play a notification sound (retro beep / coin ding)
 * Types: 'like', 'comment', 'follow', 'reaction'
 */
export function playNotificationSound(type = 'like') {
  if (!isSoundsEnabled()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // Resume audio context if suspended (required for user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notificationSounds = {
      like: () => playRetroBeep(ctx, now, 800, 0.15),
      comment: () => playRetroBeep(ctx, now, 600, 0.15),
      follow: () => playCoinDing(ctx, now),
      reaction: () => playRetroBeep(ctx, now, 1000, 0.1),
    };

    const soundFn = notificationSounds[type] || notificationSounds.like;
    soundFn();
  } catch (e) {
    console.warn('Notification sound error:', e);
  }
}

/**
 * Play a message sound (notification chime or swoosh)
 */
export function playMessageSound() {
  if (!isSoundsEnabled()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    playNotificationChime(ctx, now);
  } catch (e) {
    console.warn('Message sound error:', e);
  }
}

/**
 * Retro beep sound
 */
function playRetroBeep(ctx, now, freq = 800, duration = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.value = freq;
  osc.type = 'square';
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Coin ding sound (bright metallic sound)
 */
function playCoinDing(ctx, now) {
  const duration = 0.3;
  
  // High freq chirp
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  
  osc1.frequency.setValueAtTime(1200, now);
  osc1.frequency.exponentialRampToValueAtTime(800, now + duration);
  osc1.type = 'sine';
  
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
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
  
  gain2.gain.setValueAtTime(0.08, now);
  gain2.gain.exponentialRampToValueAtTime(0.005, now + duration);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  
  osc2.start(now);
  osc2.stop(now + duration);
}

/**
 * Notification chime sound (pleasant ascending tones)
 */
function playNotificationChime(ctx, now) {
  const duration = 0.4;
  
  // First tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  
  osc1.frequency.value = 800;
  osc1.type = 'sine';
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);
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
  gain2.gain.setValueAtTime(0.12, secondStart);
  gain2.gain.exponentialRampToValueAtTime(0.01, secondStart + duration);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  
  osc2.start(secondStart);
  osc2.stop(secondStart + duration);
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
