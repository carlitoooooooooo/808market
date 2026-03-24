const TURNSTILE_SECRET = '0x4AAAAAACvZvl4s4KtEaV_oCHKQaRgXJaw';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Missing token' });

  const formData = new URLSearchParams();
  formData.append('secret', TURNSTILE_SECRET);
  formData.append('response', token);

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });
  const data = await result.json();
  return res.status(200).json({ success: data.success });
}
