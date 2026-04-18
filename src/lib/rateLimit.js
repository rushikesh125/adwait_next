// In-memory rate limiter. Works per-instance — for multi-instance deployments,
// replace with an Upstash Redis-backed solution.

const store = new Map();

// Clean up expired windows every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * @param {object} opts
 * @param {string} opts.uid         - User identifier (uid, IP, etc.)
 * @param {string} opts.action      - Namespace for the limit (e.g. "ai-itinerary")
 * @param {number} [opts.limit]     - Max requests per window (default: 10)
 * @param {number} [opts.windowMs]  - Window duration in ms (default: 60_000)
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function rateLimit({ uid, action, limit = 10, windowMs = 60_000 }) {
  const now = Date.now();
  const key = `${action}:${uid}`;
  const entry = store.get(key) ?? { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  store.set(key, entry);

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}
