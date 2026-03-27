import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'Missing account_id' });

  try {
    const account = await stripe.accounts.retrieve(account_id);
    return res.status(200).json({
      connected: account.charges_enabled && account.payouts_enabled,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (err) {
    console.error('connect-status error:', err);
    return res.status(500).json({ error: err.message });
  }
}
