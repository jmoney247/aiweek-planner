import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { communityWriter } from '@/lib/community-write';
import { requireServiceClient } from '@/lib/db';
import { handleRoute, HttpError } from '@/lib/http';

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await communityWriter(req, 'photo-upload', 15);
    const sb = requireServiceClient();
    const prefix = `${session.userId}/staging`;
    const pending = await sb.storage.from('community-photos').list(prefix, { limit: 100 });
    if (pending.error) throw new HttpError(503, 'Could not prepare photo storage.');
    const expired = (pending.data ?? []).filter(item => item.created_at && Date.parse(item.created_at) < Date.now() - 3 * 60 * 60 * 1000);
    if (expired.length) await sb.storage.from('community-photos').remove(expired.map(item => `${prefix}/${item.name}`));
    if ((pending.data?.length ?? 0) - expired.length >= 30) throw new HttpError(429, 'You have several unfinished uploads. Please finish your post or try again in a few hours.');
    // Only mint single-object tokens. The private bucket enforces JPEG / 1 MiB.
    const path = `${session.userId}/staging/${randomUUID()}.jpg`;
    const { data, error } = await sb.storage.from('community-photos').createSignedUploadUrl(path);
    if (error || !data) throw new HttpError(503, 'Photo uploads are temporarily unavailable.');
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    if (base.hostname.endsWith('.supabase.co')) base.hostname = base.hostname.replace('.supabase.co', '.storage.supabase.co');
    return NextResponse.json({ path, token: data.token, endpoint: `${base.origin}/storage/v1/upload/resumable` }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
