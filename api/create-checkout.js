import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Platform fee: 10% goes to 808market
const PLATFORM_FEE_PCT = 0.10;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { trackId, trackTitle, artist, price, licenseType, buyerUsername } = req.body;

    if (!trackId || !price || price <= 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const priceInCents = Math.round(parseFloat(price) * 100);
    // 10% to 808market, 90% to the producer
    const platformFee = Math.round(priceInCents * PLATFORM_FEE_PCT);
    const producerPayout = priceInCents - platformFee;

    const licenseLabel =
      licenseType === 'free'      ? 'Free Download' :
      licenseType === 'lease'     ? 'Non-Exclusive Lease' :
      licenseType === 'exclusive' ? 'Exclusive License' :
      licenseType               || 'Non-Exclusive Lease';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: (trackTitle || 'Beat') + ' - ' + licenseLabel,
              description: 'by ' + (artist || 'Producer') + ' (90% goes directly to the producer)',
            },
            unit_amount: producerPayout,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '808market Platform Fee (10%)',
              description: 'Supports the platform that connects you to producers',
            },
            unit_amount: platformFee,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.VITE_APP_URL || 'https://808market.app'}/success?session_id={CHECKOUT_SESSION_ID}&track_id=${trackId}`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://808market.app'}/track/${trackId}`,
      metadata: {
        trackId,
        trackTitle,
        artist,
        licenseType,
        buyerUsername: buyerUsername || 'anonymous',
        platformFee: platformFee.toString(),
        producerPayout: producerPayout.toString(),
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}