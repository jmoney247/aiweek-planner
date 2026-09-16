import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions, checkAdminPassword, createAdminToken, requireAdminOrigin } from '@/lib/admin-auth';
import { HttpError, handleRoute } from '@/lib/http';
import { checkRateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    requireAdminOrigin(req);
    const address = req.headers.get('x-vercel-forwarded-for') ?? req.headers.get('x-forwarded-for') ?? 'unknown';
    if (!checkRateLimit(`admin-login:${address.slice(0,120)}`, 5, 15 * 60_000).allowed) throw new HttpError(429, 'Too many attempts. Please wait 15 minutes and try again.');
    const reader = req.body?.getReader();
    if (!reader) throw new HttpError(400, 'Enter your password.');
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 1024) { await reader.cancel(); throw new HttpError(413, 'The sign-in request is too large.'); }
      chunks.push(value);
    }
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Enter your password.'); }
    if (typeof input?.password !== 'string' || !checkAdminPassword(input.password)) throw new HttpError(401, 'Incorrect password. Please try again.');
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions());
    return response;
  });
}
export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    requireAdminOrigin(req);
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions(), maxAge: 0 });
    return response;
  });
}
