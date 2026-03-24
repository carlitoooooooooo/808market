const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const h = (key) => ({ 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' });

async function run() {
  // 1. Check actual like counts in DB vs votes table
  console.log('=== BUG 1: Like counts ===');
  const tracksRes = await fetch(`${URL}/rest/v1/tracks?select=id,title,cops,passes&order=listed_at.desc`, { headers: h(ANON) });
  const tracks = await tracksRes.json();
  console.log('Tracks in DB:');
  tracks.forEach(t => console.log(`  "${t.title}" - cops:${t.cops} passes:${t.passes}`));

  const votesRes = await fetch(`${URL}/rest/v1/votes?vote=eq.right&select=track_id`, { headers: h(ANON) });
  const votes = await votesRes.json();
  const voteCounts = {};
  votes.forEach(v => voteCounts[v.track_id] = (voteCounts[v.track_id] || 0) + 1);
  console.log('Actual right-votes from votes table:');
  Object.entries(voteCounts).forEach(([id, count]) => {
    const track = tracks.find(t => t.id === id);
    console.log(`  "${track?.title}" - actual votes: ${count}, cops column: ${track?.cops}`);
    if (count !== track?.cops) console.log(`  ❌ MISMATCH! votes=${count} but cops=${track?.cops}`);
  });

  // 2. Check a free beat's audio URL
  console.log('\n=== BUG 2: Free downloads ===');
  const freeTrack = tracks.find(t => !t.price || t.price === 0) || tracks[0];
  if (freeTrack) {
    const fullRes = await fetch(`${URL}/rest/v1/tracks?id=eq.${freeTrack.id}&select=id,title,price,audio_url`, { headers: h(ANON) });
    const full = await fullRes.json();
    const t = full[0];
    console.log(`Track: "${t.title}" price:${t.price}`);
    console.log(`Audio URL: ${t.audio_url}`);
    // Test if audio URL is accessible
    const audioRes = await fetch(t.audio_url, { method: 'HEAD' });
    console.log(`Audio accessible: ${audioRes.ok ? '✅' : '❌'} (${audioRes.status})`);
  }
}
run().catch(e => console.log('Fatal:', e.message));
