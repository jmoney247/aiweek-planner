import type { NextRequest } from 'next/server';
import { HttpError } from './http';
import { getSessionUser } from './server-session';
import { checkRateLimit } from './rate-limit';
import { requireServiceClient } from './db';

export async function communityWriter(req: NextRequest, action: string, limit = 20) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== req.nextUrl.origin) throw new HttpError(403, 'Please submit from this website.');
  const session = await getSessionUser(req);
  if (!session) throw new HttpError(401, 'Your browser profile expired. Please refresh and try again.');
  const budget = checkRateLimit(`${action}:${session.userId}`, limit, 60_000);
  if (!budget.allowed) throw new HttpError(429, 'Please wait a minute before trying again.');
  const persisted = await requireServiceClient().rpc('consume_community_budget', { p_user: session.userId, p_action: action, p_limit: limit });
  if (persisted.error) throw new HttpError(503, 'Community contributions are temporarily unavailable.');
  if (!persisted.data) throw new HttpError(429, 'Please wait a minute before trying again.');
  return session;
}
