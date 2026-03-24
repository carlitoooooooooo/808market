const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const d = await res.json();
  console.log(res.ok ? '✅' : '❌', query.slice(0, 60), !res.ok ? JSON.stringify(d).slice(0,80) : '');
}

await sql(`alter table profiles add column if not exists avatar_border text default 'none'`);
await sql(`alter table profiles add column if not exists influenced_by text default ''`);
await sql(`alter table tracks add column if not exists play_count integer default 0`);

// Create atomic play count increment function
await sql(`
  CREATE OR REPLACE FUNCTION increment_play_count(track_id uuid)
  RETURNS void AS $$
  BEGIN
    UPDATE tracks SET play_count = play_count + 1 WHERE id = track_id;
  END;
  $$ LANGUAGE plpgsql;
`);

console.log('Done!');
