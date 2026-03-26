# Spotify Profile Link Migration

## Required Database Changes

To add Spotify profile link support, run the following SQL in your Supabase project:

```sql
-- Add spotify_url column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_url TEXT;

-- Add a check constraint to validate spotify URLs (optional but recommended)
ALTER TABLE profiles ADD CONSTRAINT valid_spotify_url 
CHECK (spotify_url IS NULL OR spotify_url ~ '^https://open\.spotify\.com/(user|playlist|artist|track)/');
```

## Steps to Apply the Migration

1. Go to your Supabase dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Paste the SQL above
5. Click **Run** (or press Ctrl+Enter)
6. The migration is complete!

## Features

- ✅ Optional `spotify_url` field in user profiles
- ✅ Support for Spotify user/profile URLs: `https://open.spotify.com/user/...`
- ✅ Support for Spotify playlist URLs: `https://open.spotify.com/playlist/...`
- ✅ Support for Spotify artist URLs: `https://open.spotify.com/artist/...`
- ✅ Support for Spotify track URLs: `https://open.spotify.com/track/...`
- ✅ Input validation in the UI with error messages
- ✅ Spotify green button styling (#1DB954) for the link
- ✅ Display on both own profile (ProfilePage) and other users' profiles (UserProfilePage)
- ✅ Allow users to clear/remove the Spotify link

## Field Details

- **Column name**: `spotify_url`
- **Type**: TEXT (nullable)
- **Max length**: 200 characters (enforced in UI)
- **Valid formats**:
  - User profile: `https://open.spotify.com/user/userid`
  - Playlist: `https://open.spotify.com/playlist/playlistid`
  - Artist: `https://open.spotify.com/artist/artistid`
  - Track: `https://open.spotify.com/track/trackid`

## Frontend Changes

1. **ProfilePage.jsx**:
   - Added `spotify_url` to `profileExtra` state
   - Added validation function `isValidSpotifyUrl()`
   - Added Spotify URL input field in the edit modal
   - Display Spotify green button with validation feedback
   - Load/save spotify_url with other profile fields

2. **UserProfilePage.jsx**:
   - Display Spotify link when viewing other users' profiles
   - Green button styling (#1DB954) matching Spotify branding

## Testing the Feature

1. **Add a Spotify URL**:
   - Go to Edit Profile
   - Paste a valid Spotify URL in the "Spotify Profile" field
   - Click Save
   - Verify the green Spotify button appears on your profile

2. **Validation**:
   - Try entering an invalid URL - you should see a red error message
   - Try entering a non-Spotify URL - validation will reject it
   - Clear the field to remove the Spotify link

3. **View on Other Profiles**:
   - Visit another user's profile
   - If they have a Spotify URL set, you should see the green button

## Notes

- Users can have multiple social links (Instagram, Twitter, SoundCloud, YouTube, Spotify)
- The Spotify link is completely optional
- Invalid URLs are caught in the UI before being saved to the database
- The button opens in a new tab and uses `rel="noreferrer"` for security
