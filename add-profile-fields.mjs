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

await sql(`alter table profiles add column if not exists location text default ''`);
await sql(`alter table profiles add column if not exists tagline text default ''`);
await sql(`alter table profiles add column if not exists instagram text default ''`);
await sql(`alter table profiles add column if not exists twitter text default ''`);
await sql(`alter table profiles add column if not exists soundcloud text default ''`);
await sql(`alter table profiles add column if not exists youtube text default ''`);
console.log('Done!');
