const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const d = await res.json();
  const ok = res.ok || JSON.stringify(d).includes('already exists') || JSON.stringify(d).includes('does not exist');
  console.log(ok ? '✅' : '❌', query.slice(0, 70), ok ? '' : JSON.stringify(d).slice(0, 100));
}

async function run() {
  // Add DELETE policy for tracks
  await sql(`CREATE POLICY "Anyone can delete tracks" ON tracks FOR DELETE USING (true)`);

  // Verify anon can delete
  console.log('\nVerifying anon delete...');
  // Insert a test track first
  const insertRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/tracks`, {
    method: 'POST',
    headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ title: 'DELETE_TEST', artist: 'test', genre: 'Hip-Hop', bpm: 0, cover_url: '', audio_url: 'https://example.com/test.mp3', uploaded_by_username: 'test', cops: 0, passes: 0, listed_at: new Date().toISOString() })
  });
  const inserted = await insertRes.json();
  const testId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!testId) { console.log('❌ Could not insert test track'); return; }
  console.log('Inserted test track:', testId);

  // Now delete it with anon key
  const deleteRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/tracks?id=eq.${testId}`, {
    method: 'DELETE',
    headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}` }
  });
  console.log(deleteRes.ok || deleteRes.status === 204 ? '✅ Anon DELETE works!' : `❌ Delete failed: ${deleteRes.status}`);
}

run().catch(e => console.log('Fatal:', e.message));
