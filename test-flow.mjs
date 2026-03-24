// Simulate full browser user flow as carlitobot
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const h = { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

async function get(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}` } });
  return r.json();
}
async function post(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  const d = await r.json();
  return { ok: r.ok, status: r.status, data: d };
}

async function run() {
  console.log('=== Testing as carlitobot ===\n');

  // 1. Login — get profile
  console.log('1. Login...');
  const profiles = await get('profiles?username=eq.carlitobot');
  if (!profiles.length) { console.log('❌ Profile not found'); return; }
  const me = profiles[0];
  console.log(`✅ Logged in as ${me.username} (id: ${me.id})`);

  // 2. Load tracks (discover feed)
  console.log('\n2. Load tracks...');
  const tracks = await get('tracks?order=listed_at.desc');
  console.log(`✅ ${tracks.length} tracks loaded`);
  if (!tracks.length) { console.log('❌ No tracks — discover feed would be empty'); return; }
  tracks.forEach(t => console.log(`   - "${t.title}" by ${t.uploaded_by_username} | $${t.price || 'FREE'} | audio: ${t.audio_url ? '✅' : '❌'}`));

  // 3. Like a track (right swipe)
  const track = tracks[0];
  console.log(`\n3. Like "${track.title}"...`);
  const voteRes = await post('votes', { user_id: me.id, track_id: track.id, vote: 'right' });
  console.log(voteRes.ok ? '✅ Vote saved' : `❌ Vote failed: ${JSON.stringify(voteRes.data)}`);

  // 4. Add a comment
  console.log(`\n4. Comment on "${track.title}"...`);
  const commentRes = await post('comments', {
    track_id: track.id, user_id: me.id, username: me.username,
    avatar_color: me.avatar_color, text: 'this beat is hard 🔥'
  });
  console.log(commentRes.ok ? '✅ Comment saved' : `❌ Comment failed: ${JSON.stringify(commentRes.data)}`);

  // 5. Add a reaction
  console.log(`\n5. React to "${track.title}"...`);
  const rxRes = await post('reactions', { track_id: track.id, user_id: me.id, emoji: '🔥' });
  console.log(rxRes.ok ? '✅ Reaction saved' : `❌ Reaction failed: ${JSON.stringify(rxRes.data)}`);

  // 6. Load comments back
  console.log(`\n6. Load comments for "${track.title}"...`);
  const comments = await get(`comments?track_id=eq.${track.id}&order=created_at.asc`);
  console.log(`✅ ${comments.length} comment(s) found`);
  comments.forEach(c => console.log(`   @${c.username}: "${c.text}"`));

  // 7. Check notifications
  console.log(`\n7. Check notifications for ${track.uploaded_by_username}...`);
  const notifs = await get(`notifications?user_username=eq.${track.uploaded_by_username}&order=created_at.desc`);
  console.log(`✅ ${notifs.length} notification(s)`);
  notifs.slice(0,3).forEach(n => console.log(`   [${n.type}] ${n.message}`));

  // 8. Audio URL test
  console.log('\n8. Checking audio URLs...');
  for (const t of tracks) {
    if (!t.audio_url) { console.log(`❌ "${t.title}" has no audio URL`); continue; }
    const ar = await fetch(t.audio_url, { method: 'HEAD' });
    console.log(`${ar.ok ? '✅' : '❌'} "${t.title}" — ${t.audio_url.substring(0,60)}... (${ar.status})`);
  }

  // Cleanup test data
  const sk = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM';
  await fetch(`${URL}/rest/v1/votes?user_id=eq.${me.id}`, { method: 'DELETE', headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` } });
  await fetch(`${URL}/rest/v1/comments?user_id=eq.${me.id}`, { method: 'DELETE', headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` } });
  await fetch(`${URL}/rest/v1/reactions?user_id=eq.${me.id}`, { method: 'DELETE', headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` } });

  console.log('\n=== Test complete ===');
}
run().catch(e => console.log('Fatal:', e.message));
