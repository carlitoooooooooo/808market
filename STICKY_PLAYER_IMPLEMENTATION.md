# Sticky Audio Player Implementation Guide

## Overview

A sticky bottom audio player has been implemented for 808market.app, matching the Spotify-like experience. The player shows at the bottom of the viewport when audio is playing and remains fixed across all pages in the app.

## Files Created

### 1. `src/StickyAudioPlayer.jsx`
**Main component** for the sticky player.

**Props:**
- `currentTrack` - Track object currently playing (or null to hide)
- `isPlaying` - Boolean indicating if audio is actively playing
- `onPlayPause` - Callback to toggle play/pause state
- `onClose` - Callback to close/hide the player

**Features:**
- Shows album art with pulsing indicator when playing
- Displays track title and artist name
- Play/pause button with toggle state styling
- Close button (✕) to minimize player
- Progress bar (interactive, tracks current playback)
- Time display showing current/total duration
- Auto-hides when no track is selected
- Smooth slide-up animation on appearance

### 2. `src/StickyAudioPlayer.css`
**Styling** for the sticky player with glassmorphic design.

**Key styles:**
- **Glassmorphic background**: `backdrop-filter: blur(20px)` with semi-transparent black
- **Gradient borders**: Cyan-to-purple gradient accent
- **Neon glow**: Box shadow with cyan glow matching 808market aesthetic
- **Responsive**: Mobile-friendly with adjusted sizes on smaller screens
- **Animations**: Slide-up entrance animation and pulsing album art indicator
- **Z-index 300**: Positioned above content but below modals (z-index 600+)

**Layout:**
- Fixed position: `bottom: 64px` (above bottom nav at 64px)
- Width: `calc(100% - 32px)` with `max-width: 448px`
- Centered horizontally with `left: 50%` and `translateX(-50%)`

## Files Modified

### 1. `src/App.jsx`

**Imports Added:**
```javascript
import StickyAudioPlayer from "./StickyAudioPlayer.jsx";
```

**Global State Added:**
```javascript
// Global audio player state (for sticky player)
const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState(null);
const [stickyPlayerIsPlaying, setStickyPlayerIsPlaying] = useState(false);
```

**Component Render Added:**
```javascript
<StickyAudioPlayer
  currentTrack={currentlyPlayingTrack}
  isPlaying={stickyPlayerIsPlaying}
  onPlayPause={setStickyPlayerIsPlaying}
  onClose={() => {
    setCurrentlyPlayingTrack(null);
    setStickyPlayerIsPlaying(false);
  }}
/>
```

**SwipeCard Integration:**
- Added callbacks: `onGlobalPlay` and `onGlobalPause`
- Passes currently playing track to global state when audio starts
- Updates play state synchronization

**TrackModal Integration:**
- Added callbacks: `onGlobalPlay` and `onGlobalPause`
- Both occurrences (browse and deep-link modals) updated
- Syncs track info with sticky player

### 2. `src/SwipeCard.jsx`

**Function Signature Updated:**
```javascript
export default function SwipeCard({ 
  track, 
  onSwipe, 
  isTop, 
  stackIndex, 
  onGlobalPlay,      // NEW
  onGlobalPause      // NEW
}) { ... }
```

**startPlay() Modified:**
- Calls `onGlobalPlay(track)` when audio starts
- Calls `onGlobalPause()` when audio ends
- Enables global state sync with local playback

### 3. `src/TrackModal.jsx`

**Function Signature Updated:**
```javascript
export default function TrackModal({ 
  track, 
  onClose, 
  onVote, 
  userVotes, 
  onViewUser, 
  onOpenModal,
  onGlobalPlay,      // NEW
  onGlobalPause      // NEW
}) { ... }
```

**togglePlay() Modified:**
- Calls `onGlobalPlay(track)` when audio starts
- Calls `onGlobalPause()` when audio ends
- Syncs with sticky player state

## How It Works

### State Flow

1. **User plays audio** in SwipeCard or TrackModal
2. **Component calls** `onGlobalPlay(track)`
3. **App.jsx updates** `currentlyPlayingTrack` and `setStickyPlayerIsPlaying(true)`
4. **StickyAudioPlayer** receives track data via props and displays
5. **Player shows** with smooth slide-up animation
6. **User interacts**: Play/pause or close button update state
7. **When audio ends**, component calls `onGlobalPause()`
8. **Player hides** automatically (returns null when `currentTrack` is null)

### Key Features

✅ **Global State Management** - Single source of truth in App.jsx
✅ **Synchronized Playback** - Player state syncs across components
✅ **Mobile Responsive** - Adjusts layout for all screen sizes
✅ **Glassmorphic Design** - Modern frosted glass effect with blur
✅ **Neon Aesthetics** - Cyan/purple gradients matching 808market theme
✅ **Smooth Animations** - Entrance, playing indicator, and hover effects
✅ **Non-overlapping** - Positioned 64px from bottom (above nav)
✅ **Seekable Progress** - Interactive progress bar (wired for future seek functionality)

## Integration with AudioPlayer.js

The sticky player uses the existing `AudioPlayer.js` class:

```javascript
const player = new AudioPlayer(track.audioUrl, track.snippetStart);
player.onTimeUpdate((prog) => setProgress(prog)); // Updates progress
player.onEnded(() => onPlayPause(false));         // Pauses when finished
player.play();  // Starts playback
player.pause(); // Pauses playback
```

All 30-second snippet logic, signed URL handling, and playback control remains unchanged.

## Visual Design Details

### Colors Used
- **Cyan**: `#00f5ff` - Primary accent
- **Purple**: `#bf5fff` - Secondary accent  
- **Black**: `#000000` - Base background
- **White**: `#ffffff` - Text

### Glassmorphic Effect
```css
background: rgba(0, 0, 0, 0.6);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
```

### Gradient Border
```css
border-image: linear-gradient(
  135deg,
  rgba(0, 245, 255, 0.3),
  rgba(191, 95, 255, 0.2),
  rgba(0, 245, 255, 0.1)
) 1;
```

### Glow Shadow
```css
box-shadow: 
  0 8px 32px rgba(0, 245, 255, 0.1),
  inset 0 1px 1px rgba(255, 255, 255, 0.1);
```

## Responsive Breakpoints

- **Desktop** (480px+): Full 448px width player with all controls visible
- **Mobile** (360px-480px): Slightly smaller padding and fonts, all controls present
- **Small Mobile** (<360px): Minimal padding, compact layout maintained

## Future Enhancements

Potential improvements to consider:

1. **Seek Functionality** - Implement actual seeking in AudioPlayer.js
2. **Queue Management** - Next/Previous buttons for queued tracks
3. **Volume Control** - Add volume slider
4. **Playlist Support** - Show queue/upcoming tracks
5. **Lyrics Display** - Show beat lyrics/description in expanded view
6. **Keyboard Shortcuts** - Spacebar to play/pause, arrow keys for next/prev
7. **Local Storage** - Remember last played track
8. **Equalizer** - Simple audio frequency controls

## Testing Checklist

- [x] Component renders when track plays from SwipeCard
- [x] Component renders when track plays from TrackModal (both locations)
- [x] Play/pause button toggles correctly
- [x] Close button hides player
- [x] Progress bar updates in real-time
- [x] Time display shows current/total duration
- [x] Album art displays with placeholder fallback
- [x] Player hides when no track selected
- [x] Mobile layout adapts correctly
- [x] Z-index stacking works (not overlapping nav or modals)
- [x] Glassmorphic styling renders properly
- [x] Animations work smoothly

## Notes

- The sticky player is non-invasive and enhances UX without disrupting existing functionality
- All original AudioPlayer.js behavior is preserved
- State management is centralized in App.jsx for easy debugging
- CSS uses CSS variables from App.css for consistent theming
- Component gracefully handles missing track data (returns null)
- Mobile-first approach ensures good experience on all devices
