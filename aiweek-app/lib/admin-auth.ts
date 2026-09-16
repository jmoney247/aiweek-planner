import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { HttpError } from './http';
export const ADMIN_COOKIE = 'hype_admin';
export const ADMIN_TTL = 8 * 60 * 60;
function settings() {
  const password = process.env.ADMIN_PASSWORD, secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!password || !secret) throw new HttpError(503, 'Admin login is not configured yet.');
  const key = createHmac('sha256', secret).update('hype-admin-session-v1\0').update(password).digest();
  return { password, key };
}
export function checkAdminPassword(candidate: string): boolean {
  const { password, key } = settings();
  if (!candidate || candidate.length > 256) return false;
  return timingSafeEqual(scryptSync(candidate, key, 32), scryptSync(password, key, 32));
}
export function createAdminToken(now = Date.now()): string {
  const payload = `${Math.floor(now / 1000) + ADMIN_TTL}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${createHmac('sha256', settings().key).update(payload).digest('hex')}`;
}
export function validAdminToken(token: string | undefined, now = Date.now()): boolean {
  if (!token || !/^\d{10}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expiry, nonce, signature] = token.split('.');
  const remaining = Number(expiry) - Math.floor(now / 1000);
  if (remaining <= 0 || remaining > ADMIN_TTL) return false;
  try { return timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha256', settings().key).update(`${expiry}.${nonce}`).digest()); } catch { return false; }
}
export function requireAdmin(req: NextRequest) {
  if (!validAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) throw new HttpError(401, 'Please enter your admin password.');
}
export function requireAdminOrigin(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) throw new HttpError(403, 'Please sign in from this website.');
}
export const adminCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/admin', maxAge: ADMIN_TTL });
