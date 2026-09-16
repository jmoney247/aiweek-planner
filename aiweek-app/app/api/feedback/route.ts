import { NextRequest, NextResponse } from 'next/server';
import { requireServiceClient } from '@/lib/db';
import { HttpError, handleRoute, readJson } from '@/lib/http';
import { communityWriter } from '@/lib/community-write';
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await communityWriter(req, 'feedback', 3);
    const input = await readJson(req) as { kind?: unknown; body?: unknown };
    if (!['review','improvement'].includes(String(input.kind)) || typeof input.body !== 'string' || input.body.trim().length < 3 || input.body.length > 2000) throw new HttpError(400, 'Please write 3–2,000 characters.');
    const result = await requireServiceClient().from('website_feedback').insert({ user_id: session.userId, kind: input.kind, body: input.body.trim() });
    if (result.error) throw new HttpError(503, 'Could not save your feedback. Please try again.');
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
