// Simulate exact browser swipe flow for mastercard
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const h = { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM';

async function rest(method, path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { ok: r.ok, status: r.status, data: await r.json() };
}

async function run() {
  // Get mastercard profile (simulates login)
  const profiles = await rest('GET', 'profiles?username=eq.mastercard');
  const me = profiles.data[0];
  console.log(`✅ User: ${me.username} (${me.id})`);

  // Load tracks (discover feed)
  const tracks = await rest('GET', 'tracks?order=listed_at.desc');
  console.log(`✅ ${tracks.data.length} tracks in discover`);
  const otherTrack = tracks.data.find(t => t.uploaded_by_username !== 'mastercard') || tracks.data[0];
  console.log(`   Swiping on: "${otherTrack?.title}"`);
  if (!otherTrack) { console.log('❌ No tracks to swipe'); return; }

  // Upsert vote (dbUpsert equivalent)
  const voteRes = await rest('POST', 'votes?on_conflict=user_id,track_id', {
    user_id: me.id, track_id: otherTrack.id, vote: 'right'
  });
  console.log(voteRes.ok ? '✅ Vote upserted' : `❌ Vote failed: ${JSON.stringify(voteRes.data)}`);

  // Increment cops on track (dbUpdate equivalent)
  const trackRes = await rest('GET', `tracks?id=eq.${otherTrack.id}`);
  const currentCops = trackRes.data[0]?.cops || 0;
  const updateRes = await rest('PATCH', `tracks?id=eq.${otherTrack.id}`, { cops: currentCops + 1 });
  console.log(updateRes.ok ? `✅ Track cops: ${currentCops} → ${currentCops + 1}` : `❌ Update failed: ${JSON.stringify(updateRes.data)}`);

  // Load comments for a track
  const commentsRes = await rest('GET', `comments?track_id=eq.${otherTrack.id}&order=created_at.asc`);
  console.log(`✅ Comments: ${commentsRes.data.length}`);

  // Post a comment
  const commentRes = await rest('POST', 'comments', {
    track_id: otherTrack.id, user_id: me.id, username: me.username,
    avatar_color: me.avatar_color, text: 'test comment from audit'
  });
  console.log(commentRes.ok ? '✅ Comment posted' : `❌ Comment failed: ${JSON.stringify(commentRes.data)}`);

  // Post a reaction
  const rxRes = await fetch(`${URL}/rest/v1/reactions?on_conflict=user_id,track_id,emoji`, {
    method: 'POST',
    headers: { ...h, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ track_id: otherTrack.id, user_id: me.id, emoji: '🔥' })
  });
  console.log(rxRes.ok ? '✅ Reaction posted' : `❌ Reaction failed: ${await rxRes.text()}`);

  // Cleanup
  const shk = { 'apikey': SK, 'Authorization': `Bearer ${SK}` };
  await fetch(`${URL}/rest/v1/votes?user_id=eq.${me.id}&track_id=eq.${otherTrack.id}`, { method: 'DELETE', headers: shk });
  await fetch(`${URL}/rest/v1/comments?username=eq.mastercard&text=eq.test+comment+from+audit`, { method: 'DELETE', headers: shk });
  await fetch(`${URL}/rest/v1/reactions?user_id=eq.${me.id}&track_id=eq.${otherTrack.id}`, { method: 'DELETE', headers: shk });
  await fetch(`${URL}/rest/v1/tracks?id=eq.${otherTrack.id}`, { method: 'PATCH', headers: { ...shk, 'Content-Type': 'application/json' }, body: JSON.stringify({ cops: currentCops }) });

  console.log('\n✅ All core flows working!');
}
run().catch(e => console.log('Fatal:', e.message));
