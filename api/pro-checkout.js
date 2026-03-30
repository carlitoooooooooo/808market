import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const APP_URL = process.env.VITE_APP_URL || 'https://808market.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkapxykeryzxbqpgjgab.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// PRO price — change this to your actual Stripe price ID after creating it
// For now uses a one-time payment; switch to subscription price ID when ready
const PRO_PRICE_USD = 999; // $9.99 in cents

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '💎 808market PRO',
            description: 'Exclusive name glows, profile customization, and more',
          },
          unit_amount: PRO_PRICE_USD,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${APP_URL}/?pro=success&username=${encodeURIComponent(username)}`,
      cancel_url: `${APP_URL}/`,
      metadata: { username, type: 'pro_upgrade' },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('pro-checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
