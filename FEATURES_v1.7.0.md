# 808market v1.7.0 - New Features

## Overview
Added 3 new Settings tabs plus comprehensive bug reporting system.

## 1. Creator Tools Tab 👨‍💻
Located in Settings > Creator Tools

**Features:**
- **Upload Count**: Displays total number of beats uploaded by the user
- **Total Beats Revenue**: Shows cumulative revenue from paid beats (future: calculated from price field)
- **Royalty Split Info**: 
  - 808market: 30%
  - Creator: 70%
- **Bulk Edit Beats**: Placeholder button for future implementation
- **Data Loading**: Fetches live data from tracks table filtered by current user

**Technical Implementation:**
- Loads track data on tab access via `loadCreatorData()`
- Displays upload count and revenue calculations
- Clean, professional UI with stat cards

## 2. Privacy & Safety Tab 🔒
Located in Settings > Privacy & Safety

**Features:**
- **Hide Activity Status**: Toggle to hide online/activity status from other users
  - Stored in localStorage as `hideActivityStatus`
  - Can be implemented in message threads and user profiles
  
- **Mute Notifications**: Silence all user notifications globally
  - Stored in localStorage as `muteNotifications`
  - Can be integrated with notification system
  
- **Block/Unblock Users**:
  - Input field to add usernames to blocklist
  - Database storage in `profiles.blocked_users` array
  - Visual list of blocked users with unblock buttons
  - Supports adding and removing users
  - Can be used in MessagesPage to filter conversations

**Technical Implementation:**
- `blocked_users` array field added to profiles table
- `loadBlockedUsers()` fetches current blocklist
- `handleBlockUser()` adds username to array
- `handleUnblockUser(username)` removes username from array
- All changes sync to database via Supabase REST API

## 3. About & Help Tab ℹ️
Located in Settings > About & Help

**Features:**
- **Version Info**: Displays current version (v1.7.0)
- **Credits Section**: Shows development team info and acknowledgments
- **Links**:
  - Discord Community: https://discord.gg/clawd
  - Changelog: Links to AboutPage component
- **Bug Report Form**:
  - Title input
  - Description textarea
  - Sends direct message to admin user "mastercard"
  - Creates admin thread with is_admin_message flag
  - Success/error feedback
  
- **Feedback Form**: Placeholder button for future implementation

**Technical Implementation:**
- `handleSubmitBugReport()` creates message with:
  - Thread ID: sorts usernames alphabetically (current_user + mastercard)
  - Formatted message with bug title and description
  - `is_admin_message: true` flag for visual distinction
  - Auto-clears form on success
  - Shows feedback message

## Database Changes

### Updated Tables

#### profiles
Added columns:
- `avatar_url text` - User's custom avatar image URL
- `role text` - User role (default: 'user')
- `is_beta_tester boolean` - Beta tester flag
- `blocked_users text[]` - Array of blocked usernames

#### messages (NEW)
Complete new table with structure:
```sql
CREATE TABLE messages (
  id uuid PRIMARY KEY
  thread_id text NOT NULL  -- Sorted usernames joined by "__"
  sender text NOT NULL     -- Username of sender
  recipient text NOT NULL  -- Username of recipient
  body text NOT NULL       -- Message content
  read boolean DEFAULT false
  is_admin_message boolean DEFAULT false  -- Marks admin/bug reports
  created_at timestamptz DEFAULT now()
)
```

### RLS Policies
- Messages: Public select, auth users can insert
- Profiles: Public select, users can update own profile

## UI/UX Updates

### SettingsPage.jsx
- Added 3 new section tabs to navigation
- New state management for each feature
- Responsive form layouts
- Visual feedback for toggles and blocks
- Loading states for async operations

### MessagesPage.jsx
- Admin messages now display with:
  - Gold/yellow background (#ffd700)
  - Left border accent
  - 🔧 ADMIN badge
  - Distinguishes from regular messages
- Supports `is_admin_message` flag from database

## Files Modified
1. `src/SettingsPage.jsx` - Added 3 tabs, forms, and logic (+500 lines)
2. `src/MessagesPage.jsx` - Enhanced message rendering for admin messages
3. `supabase-setup.sql` - Updated profiles schema, added messages table
4. `add-blocked-users.sql` - Migration file for database updates

## Build Status
✅ Successfully built with Vite
- No TypeScript errors
- All imports resolved
- Production bundle generated

## Git Commit
```
commit 7a5e73a
feat: Add 3 new Settings tabs + bug report feature
- Creator Tools tab
- Privacy & Safety tab with block/unblock
- About & Help tab with bug report form
- Database schema updates
- Visual enhancements for admin messages
```

## Future Enhancements
- [ ] Implement bulk edit for tracks in Creator Tools
- [ ] Integrate hideActivityStatus into user profiles
- [ ] Add notification filtering for muted users
- [ ] Implement feedback form backend
- [ ] Add admin dashboard for bug report management
- [ ] Enhance blocked users with block notifications
- [ ] Add statistics page for creators

## Notes
- Bug reports are sent as direct messages to username "mastercard"
- All privacy settings stored in localStorage for immediate UX
- Database blocking stored for server-side enforcement
- Admin messages visually distinct in message threads
- All new tables have RLS enabled for security
