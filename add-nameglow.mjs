const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const d = await res.json();
  console.log(res.ok ? '✅' : '❌', query.slice(0, 60));
}

await sql(`alter table profiles add column if not exists name_glow text default 'none'`);
console.log('Done!');
