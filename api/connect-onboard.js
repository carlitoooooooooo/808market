import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const APP_URL = process.env.VITE_APP_URL || 'https://808market.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { username, existingAccountId } = req.body;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    let accountId = existingAccountId;

    // Create a new Express account if they don't have one yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { username },
      });
      accountId = account.id;
    }

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/?connect=refresh&account_id=${accountId}&username=${encodeURIComponent(username)}`,
      return_url: `${APP_URL}/?connect=success&account_id=${accountId}&username=${encodeURIComponent(username)}`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ url: accountLink.url, accountId });
  } catch (err) {
    console.error('connect-onboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}
