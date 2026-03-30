import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Get all completed checkout sessions to calculate true revenue
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ['data.line_items'],
    });

    const completed = sessions.data.filter(s => s.payment_status === 'paid');
    const totalRevenue = completed.reduce((sum, s) => sum + (s.amount_total || 0), 0) / 100;
    const platformCut = totalRevenue * 0.15;

    const recentSales = completed.slice(0, 20).map(s => ({
      id: s.id,
      amount: (s.amount_total || 0) / 100,
      buyer_email: s.customer_details?.email || 'anonymous',
      track_title: s.metadata?.trackTitle || 'Unknown',
      buyer_username: s.metadata?.buyerUsername || 'anonymous',
      producer: s.metadata?.producerUsername || 'unknown',
      date: new Date(s.created * 1000).toISOString(),
      type: s.metadata?.type || 'beat',
    }));

    return res.status(200).json({
      totalRevenue,
      platformCut,
      totalSales: completed.length,
      recentSales,
    });
  } catch (err) {
    console.error('admin-stats error:', err);
    return res.status(500).json({ error: err.message });
  }
}
