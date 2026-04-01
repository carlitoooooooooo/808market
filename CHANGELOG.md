# 808market — Changelog

## [1.6.0] — 2026-04-01
### Added
- **Smart Discover Algorithm**: Personalized queue building based on genre/engagement/producer diversity (35% genre + 25% engagement + 20% producer + 10% freshness + 10% serendipity)
- **Onboarding Modal**: 8-step interactive tutorial for new users (swipe, discover, leaderboard, list beats, storefront, Stripe, analytics)
- **Haptic Feedback**: Vibrations on swipe gestures and onboarding buttons (Android functional, iOS unsupported)
- **PRO User Features**:
  - PRO badge on profile
  - Bypass feature locks (name glow, profile background, cover image, animation tiers)
  - 10 new PRO exclusive name glows: Neon Cyan, Neon Purple, Hologram, Plasma, Void, Cosmic (+ Diamond, Aurora, Platinum, Solar)
  - 6 animated profile backgrounds: Neon Grid, Gradient Shift, Waves, Particles, Aurora, Plasma
  - 6 animated avatar borders: Neon Pulse, Purple Pulse, Rainbow Glow, Gold Glow, Fire Glow, Cyan Glow
- **Login Fix**: Auto-reload on successful sign-in (no more manual refresh needed)
- **Admin Glow**: Eclipse (dark red/pink) replaces hologram for admin/team only

### Fixed
- Login now automatically redirects to app after credentials are verified
- PRO users can unlock all appearance options immediately without hitting upload/play thresholds

---

## [1.5.0] — 2026-03-24
### Added
- Card flip: tap a swipe card to flip it and see beat details + COP IT button
- Browse mode: grid view of all beats in the discover feed
- DM messaging: send direct messages to producers from their profile
- Unread DM badge on Messages nav tab
- Tags: add tags when uploading a beat, search beats by tag
- Liked beats list on your profile (private)
- Notifications are now clickable — takes you to the beat or profile
- Settings gear: change password, account info
- Name glow effects show on Browse grid cards
- Edit beat: snippet picker and producer notes, payment link removed
- Stripe checkout for paid beats (full price collected by 808market)
- Badges now persist on reload (loaded from DB)

### Fixed
- Admin/Beta Tester pills always visible, no more text disappearing
- Profile layout fixed on mobile (buttons no longer cramped)
- Modal close button always accessible when scrolled
- Track modal COP IT always visible regardless of vote status
- Reaction picker removed from swipe flow (was causing beat skip bug)

---

## [1.4.0] — 2026-03-24
### Added
- Desktop optimization: top header nav, two-column leaderboard, two-column profile
- Arrow key swipe on desktop (later removed for stability)
- Leaderboard loads both Top Beats and Top Producers simultaneously on desktop
- Edit profile popup on desktop (compact modal)
- Settings gear in header (desktop) / profile page (mobile)

### Fixed
- Desktop profile: edit/share buttons no longer overlap content
- Producers column loads on mount instead of waiting for tab click
- Username no longer breaks mid-word on mobile

---

## [1.3.0] — 2026-03-24
### Added
- Name glow customization (unlocked by upload count: 5/10/20)
  - Cyan, Purple, Green, Gold, Red, Rainbow (5 uploads)
  - Pulse, Flicker (10 uploads)
  - Fire, Ice (20 uploads)
- Avatar border styles
- Profile tagline, location, social links, influenced by
- User search now searches both producers and beats
- Saves/bookmarks on beats
- Follow/unfollow producers
- Follower/following counts on profiles
- Taste Match powered by real DB votes
- Notifications for likes, comments, follows

---

## [1.2.0] — 2026-03-24
### Added
- Real Stripe checkout (test mode)
- Free download — triggers direct MP3 download
- Beat analytics: like %, ratio bar, plays
- Edit beat modal (title, cover, genre, price, license, notes)
- Delete beat with confirmation
- Pin a beat on your profile
- Admin badge (mastercard), Beta Tester badge
- About page with CJ's message
- Share beat/profile links (/track/:id, /u/:username)
- Deep linking via URL
- Image cropper for profile pictures
- Avatar upload to Supabase Storage
- Custom avatar color picker
- Guest browse mode + landing page

---

## [1.1.0] — 2026-03-23
### Added
- Real Supabase backend: profiles, tracks, votes, comments, reactions, notifications
- Supabase Auth (username-based email pattern)
- MP3 upload with progress bar
- SoundCloud embed integration
- Cover art upload
- Snippet picker (set 15s preview start point)
- Leaderboard with Top Beats + Top Producers tabs
- Profile page with stats and badges
- Genre filter bar
- BPM, key, license type fields
- Producer notes
- Weekly charts

---

## [1.0.0] — 2026-03-22
### Added
- Initial launch as 808market
- Tinder-style swipe UI for beats
- Like / Pass mechanic with atomic DB counters
- Waveform visualizer
- Bottom tab navigation
- Animated background
- Deployed to 808market.app
