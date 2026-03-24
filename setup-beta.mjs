const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const d = await res.json();
  const ok = res.ok || JSON.stringify(d).includes('already exists');
  console.log(ok ? '✅' : '❌', query.slice(0, 60), ok ? '' : JSON.stringify(d).slice(0, 100));
  return ok;
}

// 1. Add is_beta_tester column
await sql(`alter table profiles add column if not exists is_beta_tester boolean default false`);

// 2. Create a function + trigger that auto-grants beta tester badge to first 50 users
await sql(`
  create or replace function grant_beta_tester()
  returns trigger as $$
  declare
    user_count integer;
  begin
    select count(*) into user_count from profiles where is_beta_tester = true;
    if user_count < 50 then
      new.is_beta_tester := true;
    end if;
    return new;
  end;
  $$ language plpgsql
`);

await sql(`drop trigger if exists auto_beta_tester on profiles`);
await sql(`
  create trigger auto_beta_tester
  before insert on profiles
  for each row execute function grant_beta_tester()
`);

// 3. Grant beta tester to all existing users (they're all early!)
const { default: { createClient } } = await import('@supabase/supabase-js');
const sb = createClient(`https://${PROJECT_REF}.supabase.co`, SK);
const { data: profiles } = await sb.from('profiles').select('id, username');
console.log(`\nGranting beta tester to ${profiles?.length} existing users...`);
for (const p of profiles || []) {
  const { error } = await sb.from('profiles').update({ is_beta_tester: true }).eq('id', p.id);
  console.log(error ? `❌ ${p.username}` : `✅ ${p.username} — beta tester!`);
}

console.log('\nDone! First 50 signups will automatically get the beta tester badge.');
