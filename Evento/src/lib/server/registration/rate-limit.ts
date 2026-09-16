type AttemptState = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const attempts = new Map<string, AttemptState>();

function getCurrentState(key: string, now = Date.now()) {
  const state = attempts.get(key);
  if (!state || state.resetAt <= now) {
    const next = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(key, next);
    return next;
  }
  return state;
}

export function getPublicAccessAttemptKey(request: Request, publicCode: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'local';
  return `${address}:${publicCode.trim().toUpperCase()}`;
}

export function isPublicAccessRateLimited(key: string) {
  const state = getCurrentState(key);
  if (state.count < MAX_FAILURES) return { limited: false, retryAfterSeconds: 0 };
  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000))
  };
}

export function recordPublicAccessFailure(key: string) {
  const state = getCurrentState(key);
  state.count += 1;
}

export function clearPublicAccessFailures(key: string) {
  attempts.delete(key);
}

