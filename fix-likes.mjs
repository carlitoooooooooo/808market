// Fix 1: Sync cops column with actual vote counts
const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

// 1. Sync cops/passes columns from actual vote counts
console.log('Syncing like counts from votes table...');
const syncResult = await sql(`
  UPDATE tracks t
  SET 
    cops = (SELECT COUNT(*) FROM votes v WHERE v.track_id = t.id AND v.vote = 'right'),
    passes = (SELECT COUNT(*) FROM votes v WHERE v.track_id = t.id AND v.vote = 'left')
`);
console.log('Sync result:', JSON.stringify(syncResult));

// 2. Replace increment logic with SQL atomic increment via RPC
// Create a function that atomically increments
const rpcResult = await sql(`
  CREATE OR REPLACE FUNCTION increment_track_field(track_id uuid, field_name text, amount int)
  RETURNS void AS $$
  BEGIN
    IF field_name = 'cops' THEN
      UPDATE tracks SET cops = cops + amount WHERE id = track_id;
    ELSIF field_name = 'passes' THEN
      UPDATE tracks SET passes = passes + amount WHERE id = track_id;
    END IF;
  END;
  $$ LANGUAGE plpgsql;
`);
console.log('RPC created:', JSON.stringify(rpcResult));

// Verify
const tracksRes = await fetch(`${URL}/rest/v1/tracks?select=title,cops,passes&order=listed_at.desc`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
});
const tracks = await tracksRes.json();
console.log('\nUpdated counts:');
tracks.forEach(t => console.log(`  "${t.title}" - ❤️ ${t.cops} | 💨 ${t.passes}`));
