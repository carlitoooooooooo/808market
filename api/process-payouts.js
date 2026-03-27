import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkapxykeryzxbqpgjgab.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET; // Set a random secret to protect this endpoint

export default async function handler(req, res) {
  // Protect this endpoint — allow Vercel cron (checks Authorization header) or manual call with CRON_SECRET
  const authHeader = req.headers['authorization'];
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  if (!isVercelCron && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  try {
    // Find purchases that are due for payout (transfer_after <= now, not yet transferred)
    const now = new Date().toISOString();
    const pendingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/purchases?payout_transferred=eq.false&transfer_after=lte.${now}&producer_stripe_account_id=not.is.null&select=*`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const pending = await pendingRes.json();

    if (!Array.isArray(pending) || pending.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No payouts due' });
    }

    let processed = 0;
    let errors = 0;

    for (const purchase of pending) {
      try {
        // Create transfer to producer's Stripe account
        const transfer = await stripe.transfers.create({
          amount: purchase.producer_payout_cents,
          currency: 'usd',
          destination: purchase.producer_stripe_account_id,
          source_transaction: purchase.stripe_payment_intent_id,
          metadata: {
            purchase_id: purchase.id,
            track_title: purchase.track_title,
            buyer_username: purchase.buyer_username || '',
            producer_username: purchase.producer_username || '',
          },
        });

        // Mark as transferred in DB
        await fetch(
          `${SUPABASE_URL}/rest/v1/purchases?id=eq.${purchase.id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              payout_transferred: true,
              stripe_transfer_id: transfer.id,
              transferred_at: new Date().toISOString(),
            }),
          }
        );

        console.log(`✅ Paid out $${(purchase.producer_payout_cents / 100).toFixed(2)} to ${purchase.producer_username} (${purchase.producer_stripe_account_id})`);
        processed++;
      } catch (err) {
        console.error(`❌ Failed payout for purchase ${purchase.id}:`, err.message);
        errors++;
      }
    }

    return res.status(200).json({ processed, errors, total: pending.length });
  } catch (err) {
    console.error('process-payouts error:', err);
    return res.status(500).json({ error: err.message });
  }
}
