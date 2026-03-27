import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkapxykeryzxbqpgjgab.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
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
    const {
      trackId, trackTitle, artist, licenseType, buyerUsername,
      producerUsername, producerStripeAccountId, producerPayoutCents, holdDays
    } = session.metadata || {};

    const amountPaid = session.amount_total / 100;
    const buyerEmail = session.customer_details?.email || null;
    const paymentIntentId = session.payment_intent;

    try {
      // 1. Look up the track's audio_url
      const trackRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tracks?id=eq.${trackId}&select=id,title,audio_url,uploaded_by_username`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const tracks = await trackRes.json();
      const track = tracks?.[0];

      // 2. Record purchase in DB
      const transferScheduledAt = producerStripeAccountId
        ? new Date(Date.now() + parseInt(holdDays || 7) * 24 * 60 * 60 * 1000).toISOString()
        : null;

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
          track_title: trackTitle || track?.title,
          artist,
          license_type: licenseType,
          buyer_username: buyerUsername || null,
          buyer_email: buyerEmail,
          amount_paid: amountPaid,
          audio_url: track?.audio_url || null,
          stripe_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          producer_username: producerUsername || track?.uploaded_by_username,
          producer_stripe_account_id: producerStripeAccountId || null,
          producer_payout_cents: producerPayoutCents ? parseInt(producerPayoutCents) : null,
          payout_transferred: false,
          transfer_after: transferScheduledAt,
          purchased_at: new Date().toISOString(),
        }),
      });

      // 3. Schedule delayed transfer to producer if they have Stripe Connect
      // This runs immediately but Stripe transfers at the scheduled time via delayed_days
      if (producerStripeAccountId && producerPayoutCents && paymentIntentId) {
        const holdDaysInt = parseInt(holdDays || 7);
        // Stripe supports delayed transfers via transfer_data when creating a transfer
        // We schedule it holdDays in the future by storing in DB and running a cron
        // For now: create the transfer immediately but note it in DB as pending
        // In production, use a cron job to call /api/process-payouts daily
        console.log(`Payout scheduled: ${producerPayoutCents}¢ to ${producerStripeAccountId} after ${holdDaysInt} days`);
      }

      console.log(`Purchase recorded: ${buyerUsername || buyerEmail} bought "${trackTitle}" for $${amountPaid}`);
    } catch (err) {
      console.error('Error processing purchase:', err);
    }
  }

  // Handle transfer events for logging
  if (event.type === 'transfer.created') {
    console.log('Transfer created:', event.data.object.id);
  }

  res.status(200).json({ received: true });
}
