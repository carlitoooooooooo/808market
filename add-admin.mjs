const PAT = 'sbp_27491860a14f81d09feae6c52d6693a236652a08';
const PROJECT_REF = 'bkapxykeryzxbqpgjgab';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM';

// Add role column to profiles
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `alter table profiles add column if not exists role text default 'user'` }),
});
const d = await res.json();
console.log(res.ok ? '✅ Added role column' : '❌', d?.message || '');

// Set mastercard as admin
const updateRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/profiles?username=eq.mastercard`, {
  method: 'PATCH',
  headers: { 'apikey': SK, 'Authorization': `Bearer ${SK}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'admin' }),
});
console.log(updateRes.ok ? '✅ mastercard is now admin' : '❌ Failed to set role');
