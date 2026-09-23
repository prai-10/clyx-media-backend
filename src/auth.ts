import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env.js';

const secret = new TextEncoder().encode(env.jwtSecret);
const TOKEN_TTL = '12h';

// Comparing fixed-length digests keeps the check constant-time regardless of input length.
const digest = (value: string) => createHash('sha256').update(value).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export function credentialsValid(username: string, password: string) {
  const userOk = safeEqual(username, env.adminUsername);
  const passOk = safeEqual(password, env.adminPassword);
  return userOk && passOk;
}

export function signAdminToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(env.adminUsername)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);
}

/** Returns true only for a valid, unexpired admin token in an "Authorization: Bearer" header. */
export async function isAdminRequest(authorization: string | undefined) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
