import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://bkapxykeryzxbqpgjgab.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI4MTc3OCwiZXhwIjoyMDg5ODU3Nzc4fQ.9KpyKmhEc5U1tYdiCZIcTSbiyic4M4vuO-rxCxNe8UM'
);

// 1. Delete older duplicate "soulja boy type beat"
const { error: e1 } = await sb.from('tracks').delete().eq('id', '771356d0-88de-41fb-ae30-f42578ca72da');
console.log('Deleted duplicate track:', e1?.message || 'OK');

// 2. Clean all stale/bad notifications
const { error: e2 } = await sb.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000').like('message', '%hard%d%');
console.log('Cleaned stale notifications:', e2?.message || 'OK');

// 3. Check current state
const { data: tracks } = await sb.from('tracks').select('id,title,cops,passes').order('listed_at', { ascending: false });
console.log('Current tracks:', tracks?.map(t => `"${t.title}" (likes:${t.cops})`));
