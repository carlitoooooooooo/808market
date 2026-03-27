import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkapxykeryzxbqpgjgab.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { session_id, track_id } = req.query;

  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    // Verify session with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed' });
    }

    const trackId = track_id || session.metadata?.trackId;

    // Look up the track to get audio_url
    const trackRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tracks?id=eq.${trackId}&select=id,title,audio_url,artist`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const tracks = await trackRes.json();
    const track = tracks?.[0];

    if (!track || !track.audio_url) {
      return res.status(404).json({ error: 'Track not found' });
    }

    return res.status(200).json({
      success: true,
      trackTitle: track.title,
      artist: track.artist,
      audioUrl: track.audio_url,
      licenseType: session.metadata?.licenseType,
    });
  } catch (err) {
    console.error('get-purchase error:', err);
    return res.status(500).json({ error: err.message });
  }
}
