import { createHash } from 'node:crypto';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const BLOCK_MS = 15 * 60 * 1000;

type AttemptState = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const attempts = new Map<string, AttemptState>();

function cleanupExpiredEntries(now: number) {
  for (const [key, state] of attempts) {
    if (state.blockedUntil <= now && state.windowStartedAt + WINDOW_MS <= now) {
      attempts.delete(key);
    }
  }
}

export function getLoginRateLimitKey(username: string, request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientIp = forwardedFor || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return createHash('sha256').update(`${username}\u0000${clientIp}`).digest('hex');
}

export function isLoginRateLimited(key: string) {
  const now = Date.now();
  cleanupExpiredEntries(now);
  const state = attempts.get(key);
  if (!state) return { limited: false, retryAfterSeconds: 0 };
  if (state.blockedUntil > now) {
    return { limited: true, retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000) };
  }
  if (state.windowStartedAt + WINDOW_MS <= now) {
    attempts.delete(key);
    return { limited: false, retryAfterSeconds: 0 };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  cleanupExpiredEntries(now);
  const current = attempts.get(key);
  const state = current && current.windowStartedAt + WINDOW_MS > now
    ? current
    : { failures: 0, windowStartedAt: now, blockedUntil: 0 };
  state.failures += 1;
  if (state.failures >= MAX_FAILURES) state.blockedUntil = now + BLOCK_MS;
  attempts.set(key, state);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
