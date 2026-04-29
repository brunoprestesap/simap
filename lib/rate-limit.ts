// Rate limit in-memory por chave. Suficiente para uso interno (intranet JFAP, instância única).
// Caso o app vá para múltiplas instâncias atrás de load balancer, mover para Redis/Upstash.

interface Bucket {
  attempts: number;
  windowStart: number;
  lockedUntil?: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  lockoutMs: number;
}

const buckets = new Map<string, Bucket>();

function cleanupExpired(now: number) {
  if (buckets.size < 1024) return;
  for (const [key, b] of buckets) {
    const lockExpired = !b.lockedUntil || b.lockedUntil <= now;
    const windowExpired = now - b.windowStart > 60 * 60 * 1000;
    if (lockExpired && windowExpired) buckets.delete(key);
  }
}

export function consumeAttempt(
  key: string,
  options: RateLimitOptions,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  cleanupExpired(now);
  const b = buckets.get(key);

  if (b?.lockedUntil && b.lockedUntil > now) {
    return { allowed: false, retryAfterMs: b.lockedUntil - now };
  }

  if (!b || now - b.windowStart > options.windowMs) {
    buckets.set(key, { attempts: 1, windowStart: now });
    return { allowed: true };
  }

  b.attempts += 1;
  if (b.attempts > options.maxAttempts) {
    b.lockedUntil = now + options.lockoutMs;
    return { allowed: false, retryAfterMs: options.lockoutMs };
  }
  return { allowed: true };
}

export function resetAttempts(key: string) {
  buckets.delete(key);
}

// Apenas para uso em testes — limpa o estado global.
export function __resetAllForTests() {
  buckets.clear();
}
