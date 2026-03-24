const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
const URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const h = { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

// Get mastercard's first track
const tracksRes = await fetch(`${URL}/rest/v1/tracks?uploaded_by_username=eq.mastercard&order=listed_at.desc&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const tracks = await tracksRes.json();
const track = tracks[0];
console.log('Track before edit:', { title: track.title, price: track.price, genre: track.genre });

// Simulate exact PATCH from EditBeatModal
const patchRes = await fetch(`${URL}/rest/v1/tracks?id=eq.${track.id}`, {
  method: 'PATCH',
  headers: h,
  body: JSON.stringify({
    title: track.title + ' (edited)',
    artist: track.artist,
    genre: track.genre,
    price: 99,
    license_type: 'Exclusive',
    payment_link: 'https://cashapp.com/test',
    cover_url: track.cover_url,
  }),
});
const updated = await patchRes.json();
const saved = Array.isArray(updated) ? updated[0] : updated;
console.log('Patch status:', patchRes.status, patchRes.ok ? '✅' : '❌');
console.log('Track after edit:', { title: saved?.title, price: saved?.price, license_type: saved?.license_type });

// Verify by re-fetching
const verifyRes = await fetch(`${URL}/rest/v1/tracks?id=eq.${track.id}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const verified = await verifyRes.json();
console.log('Verified from DB:', { title: verified[0]?.title, price: verified[0]?.price });

// Restore original
await fetch(`${URL}/rest/v1/tracks?id=eq.${track.id}`, {
  method: 'PATCH', headers: h,
  body: JSON.stringify({ title: track.title, price: track.price, license_type: track.license_type, payment_link: track.payment_link }),
});
console.log('Restored original ✅');
