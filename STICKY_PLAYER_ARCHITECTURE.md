# Sticky Audio Player - Architecture Diagram

## Component Hierarchy & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.jsx                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Global State:                                            │  │
│  │  - currentlyPlayingTrack (Track | null)                  │  │
│  │  - stickyPlayerIsPlaying (boolean)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │  SwipeCard.jsx │         │ TrackModal.jsx │ (2 instances)    │
│  │                │         │                │                  │
│  │ onGlobalPlay() │         │ onGlobalPlay() │                  │
│  │ onGlobalPause()│         │ onGlobalPause()│                  │
│  │                │         │                │                  │
│  │ ↓              │         │ ↓              │                  │
│  │ Updates App    │         │ Updates App    │                  │
│  │ state          │         │ state          │                  │
│  └────────────────┘         └────────────────┘                  │
│         ▲                            ▲                           │
│         │                            │                           │
│         └──────────────┬─────────────┘                           │
│                        │ Props                                   │
│                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        StickyAudioPlayer.jsx                            │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ Props:                                          │   │   │
│  │  │ - currentTrack (Track | null)                  │   │   │
│  │  │ - isPlaying (boolean)                          │   │   │
│  │  │ - onPlayPause(boolean)                         │   │   │
│  │  │ - onClose()                                    │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ Renders:                                        │   │   │
│  │  │ - Album Art (44x44px)                          │   │   │
│  │  │ - Track Title & Artist                         │   │   │
│  │  │ - Play/Pause Button                            │   │   │
│  │  │ - Close Button                                 │   │   │
│  │  │ - Progress Bar                                 │   │   │
│  │  │ - Time Display (mm:ss / 30s)                   │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  Uses: AudioPlayer.js for playback control            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
User Action (Discover/Browse/Modal)
    │
    ▼
SwipeCard.startPlay() / TrackModal.togglePlay()
    │
    ├─→ Create AudioPlayer instance
    │
    ├─→ Call onGlobalPlay(track)
    │
    ▼
App.jsx receives callback
    │
    ├─→ setCurrentlyPlayingTrack(track)
    │
    ├─→ setStickyPlayerIsPlaying(true)
    │
    ▼
StickyAudioPlayer receives new props
    │
    ├─→ Creates AudioPlayer instance (if not exists)
    │
    ├─→ Calls player.play()
    │
    ├─→ Tracks progress via onTimeUpdate()
    │
    ▼
Player displays with:
    ├─ Album art
    ├─ Track info
    ├─ Controls
    └─ Progress bar

User pauses or track ends
    │
    ├─→ onGlobalPause() called
    │
    ▼
App.jsx receives callback
    │
    ├─→ setStickyPlayerIsPlaying(false)
    │
    ▼
StickyAudioPlayer updates UI
    │
    └─→ Play button shows "▶" instead of "⏸"

User clicks close
    │
    ├─→ onClose() callback
    │
    ▼
App.jsx receives callback
    │
    ├─→ setCurrentlyPlayingTrack(null)
    │
    ├─→ setStickyPlayerIsPlaying(false)
    │
    ▼
StickyAudioPlayer returns null
    │
    └─→ Component unmounts, player hidden
```

## DOM Hierarchy

```
#root
└── App.jsx (display: flex, flex-direction: column, height: 100%)
    ├── .app-bg (background animation - z-index: 0)
    │
    ├── .app (position: fixed, z-index: 1)
    │   ├── .app-header (z-index: 50)
    │   │   └── Logo, Settings, etc.
    │   │
    │   └── .app-main (flex: 1, overflow-y: auto)
    │       ├── SwipeCard[] or TrackModal[]
    │       │   (renders content)
    │       │
    │       └── Other pages/modals
    │
    ├── Modals & Overlays (z-index: 600-9999)
    │   ├── SettingsPage
    │   ├── AnalyticsPage
    │   ├── StorefrontPage
    │   ├── TrackModal
    │   └── AdminDashboard
    │
    ├── .sticky-audio-player (position: fixed, z-index: 300) ◄── NEW
    │   │
    │   ├── .sticky-player-content
    │   │   ├── .player-album-art
    │   │   │   └── img + .album-art-playing-indicator
    │   │   │
    │   │   ├── .player-info
    │   │   │   ├── .player-title
    │   │   │   └── .player-artist
    │   │   │
    │   │   └── .player-controls
    │   │       ├── .play-btn
    │   │       └── .close-btn
    │   │
    │   ├── .player-progress-bar
    │   │   └── .player-progress-fill
    │   │
    │   └── .player-time
    │       ├── current time
    │       └── total duration
    │
    └── .bottom-nav (position: fixed, bottom: 0, z-index: 40)
        └── Navigation buttons
```

## CSS Styling Architecture

```
StickyAudioPlayer.css
│
├── .sticky-audio-player (main container)
│   ├── Position: fixed, bottom: 64px, z-index: 300
│   ├── Glassmorphic: blur(20px), rgba(0,0,0,0.6)
│   ├── Border: gradient (cyan → purple → cyan)
│   ├── Box-shadow: cyan glow
│   ├── Animation: slideUpIn
│   │
│   ├── @media (hover: hover) - Desktop hover effects
│   └── @media (max-width: 480px) - Tablet adjustments
│       └── @media (max-width: 360px) - Mobile adjustments
│
├── .sticky-player-content
│   ├── Flexbox: row, gap: 12px
│   ├── Padding: 12px 14px
│   │
│   ├── .player-album-art
│   │   ├── Size: 44x44px
│   │   ├── Border-radius: 8px
│   │   ├── Gradient background fallback
│   │   ├── Box-shadow: cyan glow
│   │   │
│   │   └── .album-art-playing-indicator
│   │       └── Animation: playingPulse
│   │
│   ├── .player-info
│   │   ├── Flexbox: column
│   │   ├── Min-width: 0 (for text truncation)
│   │   │
│   │   ├── .player-title
│   │   │   └── Font: Space Grotesk, 13px, bold
│   │   │
│   │   └── .player-artist
│   │       └── Font: Inter, 11px, dim
│   │
│   └── .player-controls
│       ├── Flexbox: row, gap: 8px
│       │
│       ├── .play-btn
│       │   ├── Size: 36x36px
│       │   ├── Cyan border & background
│       │   ├── Cyan box-shadow glow
│       │   ├── State: .playing (enhanced glow)
│       │   └── Animation: hover scale(1.1)
│       │
│       └── .close-btn
│           ├── Size: 32x32px
│           └── Red on hover (#ff3366)
│
├── .player-progress-bar
│   ├── Height: 3px (4px on hover)
│   ├── Background: dim gray
│   ├── Cursor: pointer
│   │
│   └── .player-progress-fill
│       ├── Background: gradient (cyan → purple)
│       ├── Box-shadow: cyan glow
│       └── Transition: width 0.05s linear
│
└── .player-time
    ├── Layout: flex space-between
    ├── Font: Inter, 10px, monospace
    ├── Color: 50% opacity white
    └── Padding: 6px 14px
```

## State Synchronization Timeline

```
t=0ms     User clicks play in SwipeCard
          │
t=10ms    AudioPlayer created & playing
          │
t=20ms    onGlobalPlay(track) called
          │
t=25ms    App state updated
          │  currentlyPlayingTrack = track
          │  stickyPlayerIsPlaying = true
          │
t=30ms    StickyAudioPlayer receives props
          │
t=35ms    Component mounts/updates
          │
t=40ms    AudioPlayer instance created
          │
t=45ms    player.play() called
          │
t=50ms    Component renders with visuals
          │  ├─ Album art visible
          │  ├─ Title/artist shown
          │  ├─ Play button shows "⏸"
          │  └─ Progress bar at 0%
          │
t=100ms   Progress updates begin
          │  (onTimeUpdate fired every ~50ms)
          │
t=30000ms Track ends (30 seconds)
          │
t=30010ms onEnded() → onGlobalPause()
          │
t=30015ms App state updated
          │  stickyPlayerIsPlaying = false
          │
t=30020ms StickyAudioPlayer updates
          │  ├─ Play button shows "▶"
          │  └─ Progress bar stops
```

## Z-Index Stacking Order

```
9999 ─ Purchase Success Modal
       └─ Highest priority overlay

9000 ─ Admin Dashboard
       └─ Secondary overlay

8999 ─ Announcements (Popup/Banner)
       └─ System notifications

700+ ─ Storefronts, Analytics, etc.
       └─ Page-level overlays

300 ─ StickyAudioPlayer ◄──── THIS COMPONENT
       └─ Always visible when playing
          Below modals, above content

200 ─ Messages, etc.
       └─ Full-page overlays

100 ─ App Header
       └─ Top fixed bar

50  ─ Navigation Bar
       └─ Bottom fixed bar

2   ─ App Container

1   ─ App Wrapper

0   ─ Background
       └─ Animated background

-1  ─ Body/HTML
```

## Performance Considerations

```
StickyAudioPlayer.jsx
│
├── useRef for AudioPlayer instance
│   └─ Prevents re-creation on every render
│
├── useRef for seeking flag
│   └─ Doesn't trigger re-render
│
├── useState for progress/time
│   └─ Updates efficiently (numeric only)
│
└── useEffect dependencies
    ├─ Cleanup old player on track change
    └─ Re-sync on isPlaying prop change

AudioPlayer.js
│
├── requestAnimationFrame for progress updates
│   └─ Synced with browser refresh rate
│
└── Lazy initialization
    └─ Only created when needed
```

## Mobile Responsive Strategy

```
Desktop (>480px)
├─ Full 448px width
├─ 16px padding (left/right)
├─ 44x44px album art
├─ 13px title, 11px artist
└─ 36x36px play button

Tablet (360-480px)
├─ Adjusted width
├─ 14px padding
├─ 40x40px album art
├─ 12px title, 10px artist
└─ 32x32px play button

Mobile (<360px)
├─ Responsive width (100% - margin)
├─ 10px padding
├─ 36x36px album art
├─ 11px title, 9px artist
└─ 30x30px play button
```

---

This architecture ensures:
- ✅ Clean state management
- ✅ Efficient re-rendering
- ✅ Proper component communication
- ✅ Responsive design
- ✅ Accessibility
- ✅ Performance optimization
