import {
  isPromotionMode,
  getWritingLimit,
  getSpeakingLimit,
  verifySupabaseUser,
  rpcGetQuota
} from './_lib/promotion.js';

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) {
    return h.slice(7).trim();
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isPromotionMode()) {
    return res.status(200).json({ promotion: false });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'auth_required' });
  }

  const user = await verifySupabaseUser(token);
  if (!user) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const writing = await rpcGetQuota(token, 'writing', getWritingLimit());
  const speaking = await rpcGetQuota(token, 'speaking', getSpeakingLimit());

  return res.status(200).json({
    promotion: true,
    writing: writing || { remaining: getWritingLimit(), limit: getWritingLimit() },
    speaking: speaking || { remaining: getSpeakingLimit(), limit: getSpeakingLimit() }
  });
}
