/**
 * Promotion mode: env PROMOTION_MODE=true
 * Rate limits: PROMOTION_WRITING_LIMIT, PROMOTION_SPEAKING_LIMIT (default 5/day UTC)
 */

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nlecdtjvsqttpimcyzxp.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZWNkdGp2c3F0dHBpbWN5enhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDAzOTAsImV4cCI6MjA4ODcxNjM5MH0.77bJKDPO2_85HRp63O20VXN8ZqtAtmKPVa84-a0LYRo';

export function isPromotionMode() {
  return process.env.PROMOTION_MODE === 'true';
}

export function getWritingLimit() {
  const n = parseInt(process.env.PROMOTION_WRITING_LIMIT || '5', 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function getSpeakingLimit() {
  const n = parseInt(process.env.PROMOTION_SPEAKING_LIMIT || '5', 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) {
    return h.slice(7).trim();
  }
  return null;
}

async function supabaseFetch(path, token, options = {}) {
  if (!SUPABASE_ANON_KEY) {
    console.warn('[promotion] SUPABASE_ANON_KEY missing — rate limits disabled');
    return null;
  }
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  return res;
}

export async function verifySupabaseUser(token) {
  const res = await supabaseFetch('/auth/v1/user', token, { method: 'GET' });
  if (!res || !res.ok) return null;
  const data = await res.json();
  return data.id ? data : null;
}

async function fetchProfile(token, userId) {
  const res = await supabaseFetch(
    `/rest/v1/profiles?id=eq.${userId}&select=has_exams_pack,role`,
    token,
    { method: 'GET', headers: { Prefer: 'return=representation' } }
  );
  if (!res || !res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

async function rpcCheckAndIncrement(token, feature, limit) {
  const res = await supabaseFetch('/rest/v1/rpc/check_and_increment_ai_usage', token, {
    method: 'POST',
    body: JSON.stringify({ p_feature: feature, p_limit: limit })
  });
  if (!res) return { allowed: true, skipped: true };
  if (!res.ok) {
    const errText = await res.text();
    console.error('[promotion] RPC error', res.status, errText);
    return { allowed: true, skipped: true };
  }
  return res.json();
}

export async function rpcGetQuota(token, feature, limit) {
  const res = await supabaseFetch('/rest/v1/rpc/get_ai_usage_quota', token, {
    method: 'POST',
    body: JSON.stringify({ p_feature: feature, p_limit: limit })
  });
  if (!res || !res.ok) return null;
  return res.json();
}

/**
 * Enforce promotion auth + rate limit. When PROMOTION_MODE is off, always allows.
 */
export async function enforceAiRateLimit(req, feature) {
  if (!isPromotionMode()) {
    return { ok: true };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, body: { error: 'auth_required', message: 'Sign in required' } };
  }

  const user = await verifySupabaseUser(token);
  if (!user) {
    return { ok: false, status: 401, body: { error: 'invalid_token', message: 'Invalid session' } };
  }

  const profile = await fetchProfile(token, user.id);
  if (profile && (profile.has_exams_pack || profile.role === 'admin')) {
    return { ok: true, unlimited: true };
  }

  const limit = feature === 'speaking' ? getSpeakingLimit() : getWritingLimit();
  const result = await rpcCheckAndIncrement(token, feature, limit);

  if (result.skipped) {
    return { ok: true, skipped: true };
  }

  if (!result.allowed) {
    return {
      ok: false,
      status: 429,
      body: {
        error: 'rate_limit',
        feature,
        remaining: 0,
        limit: result.limit || limit,
        message: 'Daily AI limit reached'
      }
    };
  }

  return {
    ok: true,
    remaining: result.remaining,
    limit: result.limit || limit,
    feature
  };
}

export function setRateLimitHeaders(res, gate) {
  if (gate && typeof gate.remaining === 'number') {
    res.setHeader('X-AI-Remaining', String(gate.remaining));
  }
  if (gate && typeof gate.limit === 'number') {
    res.setHeader('X-AI-Limit', String(gate.limit));
  }
  if (gate && gate.feature) {
    res.setHeader('X-AI-Feature', gate.feature);
  }
}
