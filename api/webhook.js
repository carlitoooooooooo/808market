import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkapxykeryzxbqpgjgab.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // needs service role key (not anon)
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { trackId, trackTitle, artist, licenseType, buyerUsername } = session.metadata || {};
    const amountPaid = session.amount_total / 100;
    const buyerEmail = session.customer_details?.email || null;

    try {
      // 1. Look up the track's audio_url from Supabase
      const trackRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tracks?id=eq.${trackId}&select=id,title,audio_url,uploaded_by_username`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const tracks = await trackRes.json();
      const track = tracks?.[0];

      if (!track) {
        console.error('Track not found for id:', trackId);
        return res.status(200).json({ received: true }); // still ack to Stripe
      }

      // 2. Record purchase in DB
      await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          track_id: trackId,
          track_title: trackTitle || track.title,
          artist,
          license_type: licenseType,
          buyer_username: buyerUsername || null,
          buyer_email: buyerEmail,
          amount_paid: amountPaid,
          audio_url: track.audio_url,
          stripe_session_id: session.id,
          producer_username: track.uploaded_by_username,
          purchased_at: new Date().toISOString(),
        }),
      });

      console.log(`Purchase recorded: ${buyerUsername || buyerEmail} bought "${trackTitle}" for $${amountPaid}`);
    } catch (err) {
      console.error('Error recording purchase:', err);
    }
  }

  res.status(200).json({ received: true });
}
