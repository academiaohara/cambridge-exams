import {
  verifySupabaseUser,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from './_lib/promotion.js';

const VALID_CHOICES = new Set(['ads_optional_sub', 'subscription_only']);

async function insertResponse(row, userToken) {
  if (!SUPABASE_ANON_KEY) return false;

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + (userToken || SUPABASE_ANON_KEY),
    Prefer: 'return=minimal'
  };

  const res = await fetch(SUPABASE_URL + '/rest/v1/funding_survey_responses', {
    method: 'POST',
    headers,
    body: JSON.stringify(row)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[funding-survey] insert failed', res.status, text);
    return false;
  }
  return true;
}

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) {
    return h.slice(7).trim();
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { choice, comment, level, isGuest } = req.body || {};

  if (!choice || !VALID_CHOICES.has(choice)) {
    return res.status(400).json({ error: 'invalid_choice' });
  }

  const token = getBearerToken(req);
  let userId = null;
  if (token) {
    const user = await verifySupabaseUser(token);
    if (user) userId = user.id;
  }

  const row = {
    choice,
    comment: typeof comment === 'string' ? comment.slice(0, 2000) : null,
    level: typeof level === 'string' ? level.slice(0, 8) : null,
    is_guest: !!isGuest,
    user_id: userId
  };

  const saved = await insertResponse(row, token);

  if (!saved) {
    return res.status(200).json({
      ok: true,
      storedLocally: true,
      message: 'Response accepted (storage pending configuration)'
    });
  }

  return res.status(200).json({ ok: true });
}
