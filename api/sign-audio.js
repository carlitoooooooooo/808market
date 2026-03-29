import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkapxykeryzxbqpgjgab.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SIGNED_URL_EXPIRY = 3600; // 1 hour

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { trackId, audioUrl } = req.body;
  if (!audioUrl) return res.status(400).json({ error: 'Missing audioUrl' });

  try {
    // Extract the storage path from the public URL
    // e.g. https://xxx.supabase.co/storage/v1/object/public/audio/uuid/file.mp3
    // -> audio/uuid/file.mp3
    const match = audioUrl.match(/\/storage\/v1\/object\/public\/([^?]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid audio URL format' });

    const fullPath = match[1]; // e.g. "audio/uuid/filename.mp3" or "drumkits/user/file.zip"
    const bucket = fullPath.split('/')[0]; // "audio" or "drumkits"
    const path = fullPath.split('/').slice(1).join('/'); // rest of path

    // Only sign audio and drumkits buckets
    if (!['audio', 'drumkits'].includes(bucket)) {
      return res.status(400).json({ error: 'Unsupported bucket' });
    }

    // Use service key to generate signed URL
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_EXPIRY);

    if (error) throw error;

    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error('sign-audio error:', err);
    return res.status(500).json({ error: err.message });
  }
}
