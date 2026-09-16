import { NextRequest, NextResponse } from 'next/server';
import { requireServiceClient } from '@/lib/db';
import { HttpError, handleRoute, readJson } from '@/lib/http';
import { communityWriter } from '@/lib/community-write';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await communityWriter(req, 'post-reaction');
    const { id } = await params;
    const body = await readJson(req) as { reaction?: unknown };
    if (![null, 'like', 'dislike'].includes(body.reaction as string | null)) throw new HttpError(400, 'Choose like, dislike, or remove.');
    const sb = requireServiceClient();
    const post = await sb.from('event_comments').select('id').eq('id', id).eq('is_deleted', false).eq('moderation_state', 'visible').maybeSingle();
    if (post.error || !post.data) throw new HttpError(404, 'Post not found.');
    const result = body.reaction === null
      ? await sb.from('comment_reactions').delete().eq('comment_id', id).eq('user_id', session.userId)
      : await sb.from('comment_reactions').upsert({ comment_id: id, user_id: session.userId, reaction: body.reaction }, { onConflict: 'comment_id,user_id' });
    if (result.error) throw new HttpError(500, 'Could not save your reaction.');
    return NextResponse.json({ ok: true });
  });
}
