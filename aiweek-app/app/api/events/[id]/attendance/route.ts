import { NextRequest, NextResponse } from 'next/server';
import { requireServiceClient } from '@/lib/db';
import { HttpError, handleRoute, readJson } from '@/lib/http';
import { getSessionUser } from '@/lib/server-session';
import { communityWriter } from '@/lib/community-write';
type Params = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const { id } = await params; const sb = requireServiceClient();
    const session = await getSessionUser(req);
    const total = await sb.from('event_attendance').select('event_id', { count: 'exact', head: true }).eq('event_id', id);
    if (total.error) throw new HttpError(503, 'Attendance is temporarily unavailable.');
    const mine = session ? await sb.from('event_attendance').select('event_id').eq('event_id', id).eq('user_id', session.userId).maybeSingle() : null;
    if (mine?.error) throw new HttpError(500, 'Could not load your attendance.');
    return NextResponse.json({ count: total.count ?? 0, going: !!mine?.data }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const session = await communityWriter(req, 'attendance');
    const { id } = await params; const sb = requireServiceClient();
    const body = await readJson(req) as { going?: unknown };
    if (typeof body.going !== 'boolean') throw new HttpError(400, 'Invalid attendance selection.');
    const event = await sb.from('events').select('start_at').eq('id', id).maybeSingle();
    if (event.error || !event.data) throw new HttpError(404, 'Event not found.');
    if (body.going && Date.parse(event.data.start_at) <= Date.now()) throw new HttpError(400, 'Planned attendance is only for upcoming events.');
    const saved = body.going ? await sb.from('event_attendance').upsert({ event_id: id, user_id: session.userId }, { onConflict: 'event_id,user_id' }) : await sb.from('event_attendance').delete().eq('event_id', id).eq('user_id', session.userId);
    if (saved.error) throw new HttpError(500, 'Could not update attendance.');
    return NextResponse.json({ ok: true });
  });
}
