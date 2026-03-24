import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
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
              name: `${trackTitle || 'Beat'} — ${licenseLabel}`,
              description: `by ${artist || 'Producer'} · purchased on 808market`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.VITE_APP_URL || 'https://808market.app'}/?purchase=success&track_id=${trackId}`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://808market.app'}/track/${trackId}`,
      metadata: {
        trackId,
        trackTitle,
        artist,
        licenseType,
        buyerUsername: buyerUsername || 'anonymous',
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
