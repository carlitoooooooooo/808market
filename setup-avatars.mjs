const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const d = await res.json();
  const ok = res.ok || JSON.stringify(d).includes('already exists') || JSON.stringify(d).includes('does not exist');
  console.log(ok ? '✅' : '❌', query.slice(0, 60), ok ? '' : JSON.stringify(d).slice(0, 100));
  return ok;
}

async function run() {
  await sql(`alter table profiles add column if not exists avatar_url text`);
  
  // Create avatars bucket via REST
  const bucketRes = await fetch(`https://${PROJECT_REF}.supabase.co/storage/v1/bucket`, {
    method: 'POST',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'avatars', name: 'avatars', public: true }),
  });
  const bucketData = await bucketRes.json();
  console.log(bucketRes.ok || bucketData.error?.includes('already') ? '✅' : '❌', 'Create avatars bucket', bucketData.error || '');

  await sql(`create policy "Anyone can upload avatars" on storage.objects for insert with check (bucket_id = 'avatars')`);
  await sql(`create policy "Anyone can read avatars" on storage.objects for select using (bucket_id = 'avatars')`);
  await sql(`create policy "Anyone can update avatars" on storage.objects for update using (bucket_id = 'avatars')`);
  await sql(`create policy "Anyone can delete avatars" on storage.objects for delete using (bucket_id = 'avatars')`);

  console.log('\nDone!');
}
run().catch(e => console.log('Fatal:', e.message));
