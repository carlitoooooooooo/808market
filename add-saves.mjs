const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const d = await res.json();
  console.log(res.ok ? '✅' : '❌', query.slice(0, 70));
}

await sql(`
  create table if not exists saved_beats (
    id uuid default gen_random_uuid() primary key,
    user_username text not null,
    track_id uuid references tracks(id) on delete cascade,
    created_at timestamptz default now(),
    unique(user_username, track_id)
  )
`);
await sql(`alter table saved_beats enable row level security`);
await sql(`create policy "Anyone can read saved_beats" on saved_beats for select using (true)`);
await sql(`create policy "Anyone can insert saved_beats" on saved_beats for insert with check (true)`);
await sql(`create policy "Anyone can delete saved_beats" on saved_beats for delete using (true)`);

console.log('Done!');
