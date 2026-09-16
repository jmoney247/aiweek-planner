import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { requireServiceClient } from '@/lib/db';
import { handleRoute, HttpError } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    requireAdmin(req);
    const sb = requireServiceClient();
    const queries = {
      events: sb.from('events').select('id', { count: 'exact', head: true }),
      mapped_events: sb.from('events').select('id', { count: 'exact', head: true }).not('lat', 'is', null).not('lng', 'is', null),
      browser_profiles: sb.from('anon_users').select('id', { count: 'exact', head: true }),
      visible_comments: sb.from('event_comments').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('moderation_state', 'visible'),
      event_likes: sb.from('event_reactions').select('id', { count: 'exact', head: true }).eq('reaction', 'like'),
      event_dislikes: sb.from('event_reactions').select('id', { count: 'exact', head: true }).eq('reaction', 'dislike'),
      comment_likes: sb.from('comment_reactions').select('comment_id', { count: 'exact', head: true }).eq('reaction', 'like'),
      comment_dislikes: sb.from('comment_reactions').select('comment_id', { count: 'exact', head: true }).eq('reaction', 'dislike'),
      planned_attendance: sb.from('event_attendance').select('event_id', { count: 'exact', head: true }),
      website_feedback: sb.from('website_feedback').select('id', { count: 'exact', head: true }),
    };
    const totals: Record<string, number | string> = { generated_at: new Date().toISOString() };
    await Promise.all(Object.entries(queries).map(async ([key, query]) => {
      const result = await query;
      if (result.error) throw new HttpError(503, 'Analytics could not be loaded. Please try again.');
      totals[key] = result.count ?? 0;
    }));
    let photos = 0;
    for (let offset = 0; ; offset += 500) {
      const result = await sb.from('event_comments').select('photo_paths').eq('is_deleted', false).eq('moderation_state', 'visible').order('id').range(offset, offset + 499);
      if (result.error) throw new HttpError(503, 'Photo totals could not be loaded.');
      for (const row of result.data ?? []) photos += row.photo_paths?.length ?? 0;
      if ((result.data?.length ?? 0) < 500) break;
    }
    totals.shared_photos = photos;
    return NextResponse.json(totals, { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } });
  });
}
