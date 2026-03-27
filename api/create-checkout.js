import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkapxykeryzxbqpgjgab.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL = process.env.VITE_APP_URL || 'https://808market.app';

const PLATFORM_FEE_PCT = 0.15; // 808market keeps 15%
const PAYOUT_HOLD_DAYS = 7;    // 7-day chargeback hold before producer is paid

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { trackId, trackTitle, artist, price, licenseType, buyerUsername, producerUsername } = req.body;

    if (!trackId || !price || price <= 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const priceInCents = Math.round(parseFloat(price) * 100);

    const licenseLabel =
      licenseType === 'free'      ? 'Free Download' :
      licenseType === 'lease'     ? 'Non-Exclusive Lease' :
      licenseType === 'exclusive' ? 'Exclusive License' :
      licenseType               || 'Non-Exclusive Lease';

    // Look up producer's Stripe Connect account
    let producerStripeAccountId = null;
    if (producerUsername && SUPABASE_SERVICE_KEY) {
      try {
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(producerUsername)}&select=stripe_account_id`,
          { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
        );
        const profiles = await profileRes.json();
        producerStripeAccountId = profiles?.[0]?.stripe_account_id || null;
      } catch (e) {
        console.warn('Could not fetch producer stripe account:', e.message);
      }
    }

    // Full payment always goes to 808market.
    // If producer has Connect, webhook will schedule a 7-day delayed transfer.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${trackTitle || 'Beat'} — ${licenseLabel}`,
              description: `by ${artist || 'Producer'} · purchased on 808market`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${APP_URL}/?purchase=success&track_id=${trackId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/`,
      metadata: {
        trackId,
        trackTitle,
        artist,
        licenseType,
        buyerUsername: buyerUsername || 'anonymous',
        producerUsername: producerUsername || '',
        producerStripeAccountId: producerStripeAccountId || '',
        producerPayoutCents: producerStripeAccountId
          ? String(Math.round(priceInCents * (1 - PLATFORM_FEE_PCT)))
          : '0',
        holdDays: String(PAYOUT_HOLD_DAYS),
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
